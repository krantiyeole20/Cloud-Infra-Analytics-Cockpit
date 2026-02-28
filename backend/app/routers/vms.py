# backend/app/routers/vms.py
# GET /vms — VM cohort rankings by compute value.
# HLD.md Section 6.
#
# DESIGN NOTE — vm_id near-uniqueness (from Phase 0 analysis + PROGRESS.md):
# This dataset has 1,799,362 unique vm_ids across 2,000,000 rows (≈1 row/VM).
# Per-vm_id aggregation returns n=1 per group and is uninformative.
# Per HLD.md and the Phase 0 decision, this endpoint aggregates by
# (task_type, task_priority) cohort instead, which produces 9 meaningful groups.

import logging
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from app import database
from app.ml.compute_value import (
    get_top_cohorts_by_compute_value,
    get_bottom_cohorts_by_compute_value,
    get_cohort_summary,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_vms(
    request: Request,
    sort: str = Query("desc", description="Sort compute_value: 'desc' (top) or 'asc' (bottom)"),
    task_type: Optional[str] = Query(None, description="Filter cohort by task_type"),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Return VM cohort rankings by compute_value.

    Aggregated by (task_type, task_priority) — not raw vm_id.
    See design note above for rationale.

    Response shape:
        cohorts     — list of cohort aggregations
        sort_by     — 'compute_value'
        sort_order  — 'desc' or 'asc'
    """
    try:
        if sort == "desc":
            df = get_top_cohorts_by_compute_value(limit=limit)
        else:
            df = get_bottom_cohorts_by_compute_value(limit=limit)

        if task_type:
            df = df[df["task_type"] == task_type]

        return {
            "cohorts": df.to_dict(orient="records"),
            "sort_by": "compute_value",
            "sort_order": sort,
            "aggregation_note": (
                "Aggregated by (task_type, task_priority) cohort. "
                "vm_id grouping is not used because vm_id is near-unique "
                "(1 row per VM in this dataset)."
            ),
        }
    except Exception as e:
        logger.error(f"GET /vms failed: {e}")
        return JSONResponse(status_code=500, content={"error": "VM cohort query failed", "detail": str(e)})


@router.get("/summary")
async def get_vms_summary(
    request: Request,
    task_type: Optional[str] = Query(None),
):
    """
    Full (task_type × task_priority × task_status) cohort summary.
    Used by the VmDetailCard sidebar drill-downs.
    """
    try:
        df = get_cohort_summary(task_type=task_type)
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"GET /vms/summary failed (task_type={task_type!r}): {e}")
        return JSONResponse(status_code=500, content={"error": "VM summary failed", "detail": str(e)})


import math

@router.get("/sample")
async def get_vm_sample(
    request: Request,
    task_type: Optional[str] = Query(None),
    task_priority: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    """
    Return a raw sample of VM rows for the Explorer view drill-through.
    Filterable by task_type and task_priority.
    """
    try:
        filters = []
        if task_type:
            filters.append(f"task_type = '{task_type}'")
        if task_priority:
            filters.append(f"task_priority = '{task_priority}'")
        where = ("WHERE " + " AND ".join(filters)) if filters else ""
        sql = f"""
            SELECT
                vm_id, timestamp, task_type, task_priority, task_status,
                cpu_usage, memory_usage, network_traffic, power_consumption,
                energy_efficiency, compute_value, is_wasting_energy
            FROM telemetry
            {where}
            LIMIT {int(limit)}
        """
        df = database.query(sql)
        records = df.to_dict(orient="records")
        for r in records:
            for k, v in r.items():
                if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                    r[k] = None
        return records
    except Exception as e:
        logger.error(f"GET /vms/sample failed: {e}")
        return JSONResponse(status_code=500, content={"error": "VM sample query failed", "detail": str(e)})
