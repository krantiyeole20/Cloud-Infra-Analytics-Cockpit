# backend/app/routers/explorer.py
# GET /explorer/query — templated DuckDB SQL query execution.
# HLD.md Section 6.
#
# SECURITY: Only SELECT queries are permitted. A SQL injection guard
# blocks all mutation keywords. This is a read-only DuckDB instance
# so even if a user bypasses the guard, no production data is affected.

import logging
import re
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from app import database

logger = logging.getLogger(__name__)
router = APIRouter()

# Allowlist of read-only DuckDB aggregate templates
QUERY_TEMPLATES: dict[str, str] = {
    "avg_efficiency_by_type": """
        SELECT task_type, ROUND(AVG(energy_efficiency), 4) AS avg_efficiency
        FROM telemetry GROUP BY task_type ORDER BY avg_efficiency DESC
    """,
    "avg_efficiency_by_priority": """
        SELECT task_priority, ROUND(AVG(energy_efficiency), 4) AS avg_efficiency
        FROM telemetry GROUP BY task_priority ORDER BY avg_efficiency DESC
    """,
    "waste_by_type": """
        SELECT
            task_type,
            SUM(CAST(is_wasting_energy AS INTEGER)) AS wasting,
            COUNT(*) AS total,
            ROUND(100.0 * SUM(CAST(is_wasting_energy AS INTEGER)) / COUNT(*), 2) AS waste_pct
        FROM telemetry GROUP BY task_type ORDER BY waste_pct DESC
    """,
    "top10_high_power_waiting": """
        SELECT vm_id, task_type, task_priority, power_consumption, energy_efficiency
        FROM telemetry
        WHERE task_status = 'waiting'
        ORDER BY power_consumption DESC
        LIMIT 10
    """,
    "cohort_compute_value": """
        SELECT
            task_type, task_priority,
            ROUND(AVG(compute_value), 4) AS avg_compute_value,
            ROUND(AVG(throughput), 2) AS avg_throughput,
            COUNT(*) AS records
        FROM telemetry
        GROUP BY task_type, task_priority
        ORDER BY avg_compute_value DESC
    """,
    "efficiency_percentiles": """
        SELECT
            task_type,
            ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY energy_efficiency), 4) AS p25,
            ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY energy_efficiency), 4) AS p50,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY energy_efficiency), 4) AS p75,
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY energy_efficiency), 4) AS p95
        FROM telemetry GROUP BY task_type ORDER BY task_type
    """,
    "power_by_status": """
        SELECT
            task_status,
            ROUND(AVG(power_consumption), 2) AS avg_power,
            ROUND(SUM(power_consumption) / 1000.0, 2) AS total_power_kw
        FROM telemetry GROUP BY task_status ORDER BY avg_power DESC
    """,
}

_MUTATION_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|EXEC|CALL)\b",
    re.IGNORECASE,
)


def _is_safe_sql(sql: str) -> bool:
    """Return True only if the SQL is a plain SELECT with no mutation keywords."""
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT"):
        return False
    if _MUTATION_PATTERN.search(sql):
        return False
    return True


@router.get("/templates")
async def list_query_templates():
    """List available named query templates."""
    return {
        "templates": list(QUERY_TEMPLATES.keys()),
        "usage": "GET /explorer/query?template=<name> or ?sql=<custom_select>",
    }


@router.get("/query")
async def run_explorer_query(
    request: Request,
    template: Optional[str] = Query(None, description="Named template from /explorer/templates"),
    sql: Optional[str] = Query(None, description="Custom SELECT query (read-only)"),
    limit: int = Query(200, ge=1, le=1000, description="Max rows returned"),
):
    """
    Execute a templated or custom SELECT query against the DuckDB telemetry table.

    Security:
        - Only SELECT statements are permitted.
        - Mutations (INSERT, UPDATE, DELETE, DROP, etc.) are rejected.
        - DuckDB is in-memory read-only for queries — no file system exposure.
        - Result row count capped at `limit` (max 1000).

    Use `template` for pre-built aggregations; use `sql` for custom exploration.
    """
    # Resolve SQL
    if template:
        if template not in QUERY_TEMPLATES:
            return JSONResponse(
                {"error": f"Unknown template '{template}'", "available": list(QUERY_TEMPLATES.keys())},
                status_code=400,
            )
        query_sql = QUERY_TEMPLATES[template].strip()
    elif sql:
        if not _is_safe_sql(sql):
            return JSONResponse(
                {"error": "Only SELECT queries are permitted. Mutation keywords are blocked."},
                status_code=400,
            )
        query_sql = sql.strip()
    else:
        return JSONResponse(
            {"error": "Provide either 'template' or 'sql' query parameter.",
             "available_templates": list(QUERY_TEMPLATES.keys())},
            status_code=400,
        )

    try:
        # Wrap in a limit subquery to cap results
        wrapped = f"SELECT * FROM ({query_sql}) _q LIMIT {int(limit)}"
        df = database.query(wrapped)
        return {
            "rows": df.to_dict(orient="records"),
            "row_count": len(df),
            "columns": list(df.columns),
        }
    except Exception as e:
        logger.error(f"GET /explorer/query failed: {e}")
        return {"error": "Query execution failed", "detail": str(e)}, 500
