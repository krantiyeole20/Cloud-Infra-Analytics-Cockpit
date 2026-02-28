# backend/app/routers/topology.py
# GET /topology — VM network graph for D3 TopologyGraph chart.
# HLD.md Section 6.
#
# Phase 0 decision: topology_agg = task_type_cluster_nodes (Option C)
# Rationale: unique vm_ids = 1,799,362 >> 10,000 threshold.
# Only 3 cluster nodes rendered (io, network, compute).
# Each node aggregates its cohort's resource metrics for the tooltip.

import logging
from fastapi import APIRouter, Request
from app import cache, database
from app.config import TTL_WORKLOAD

logger = logging.getLogger(__name__)
router = APIRouter()

# Logged at module load time for audit trail
logger.info(
    "topology_agg=task_type_cluster_nodes (Option C) — "
    "3 nodes only, unique vm_ids 1.8M >> 10k threshold"
)


@router.get("")
async def get_topology(request: Request):
    """
    Return the VM topology graph as nodes + edges for D3 force simulation.

    Phase 0 decision: 3 task_type cluster nodes.
    Each node contains aggregated resource metrics for tooltip display.
    Edges represent shared hardware pool relationship (all cohorts share
    the same physical infrastructure).

    Response shape (HLD.md Section 6 /topology):
        nodes  — list of {id, label, task_type, stats, vm_count}
        edges  — list of {source, target, weight}
        layout — 'force' (D3 force simulation directive)
    """
    CACHE_KEY = "topology:graph"
    try:
        cached = await cache.get(CACHE_KEY)
        if cached:
            return cached
    except Exception:
        pass

    try:
        sql = """
            SELECT
                task_type,
                COUNT(*)                              AS vm_count,
                ROUND(AVG(cpu_usage), 2)              AS avg_cpu,
                ROUND(AVG(memory_usage), 2)           AS avg_memory,
                ROUND(AVG(power_consumption), 2)      AS avg_power,
                ROUND(AVG(energy_efficiency), 4)      AS avg_efficiency,
                ROUND(AVG(compute_value), 4)          AS avg_compute_value,
                SUM(CAST(is_wasting_energy AS INTEGER)) AS waste_count,
                ROUND(
                    100.0 * SUM(CAST(is_wasting_energy AS INTEGER)) / COUNT(*),
                    2
                )                                     AS waste_pct
            FROM telemetry
            GROUP BY task_type
            ORDER BY task_type
        """
        df = database.query(sql)

        nodes = []
        task_types = df["task_type"].tolist()

        for _, row in df.iterrows():
            tt = row["task_type"]
            nodes.append({
                "id": tt,
                "label": tt.upper(),
                "task_type": tt,
                "vm_count": int(row["vm_count"]),
                "stats": {
                    "avg_cpu": float(row["avg_cpu"]),
                    "avg_memory": float(row["avg_memory"]),
                    "avg_power": float(row["avg_power"]),
                    "avg_efficiency": float(row["avg_efficiency"]),
                    "avg_compute_value": float(row["avg_compute_value"]),
                    "waste_pct": float(row["waste_pct"]),
                },
            })

        # Edges: fully-connected mesh between 3 nodes (shared infra pool)
        edges = []
        for i in range(len(task_types)):
            for j in range(i + 1, len(task_types)):
                # Weight = harmonic mean of their vm_counts (normalized)
                total = df.iloc[i]["vm_count"] + df.iloc[j]["vm_count"]
                edges.append({
                    "source": task_types[i],
                    "target": task_types[j],
                    "weight": round(total / df["vm_count"].sum(), 4),
                })

        result = {
            "nodes": nodes,
            "edges": edges,
            "layout": "force",
            "aggregation": "task_type_cluster_nodes",
        }
        await cache.set(CACHE_KEY, result, TTL_WORKLOAD)
        return result

    except Exception as e:
        logger.error(f"GET /topology failed: {e}")
        return {"error": "Topology query failed", "detail": str(e)}, 500
