# backend/app/routers/topology.py
import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from app import cache, database
from app.config import TTL_WORKLOAD

logger = logging.getLogger(__name__)
router = APIRouter()

logger.info(
    "topology_agg=task_type_cluster_nodes (Option C) — "
    "3 nodes only, unique vm_ids 1.8M >> 10k threshold"
)


@router.get("")
async def get_topology(request: Request):
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
            WHERE task_type IS NOT NULL
            GROUP BY task_type
            ORDER BY task_type
        """
        df = database.query(sql)
        # Drop any NaN task_type rows (data artifact from NaN in source)
        df = df.dropna(subset=["task_type"])
        # Keep only valid string task_types
        df = df[df["task_type"].apply(lambda x: isinstance(x, str))]

        task_types = df["task_type"].tolist()
        total_vms = df["vm_count"].sum()

        nodes = []
        for _, row in df.iterrows():
            tt = str(row["task_type"])
            nodes.append({
                "id": tt,
                "label": tt.upper(),
                "task_type": tt,
                "vm_count": int(row["vm_count"]),
                "stats": {
                    "avg_cpu": float(row["avg_cpu"] or 0),
                    "avg_memory": float(row["avg_memory"] or 0),
                    "avg_power": float(row["avg_power"] or 0),
                    "avg_efficiency": float(row["avg_efficiency"] or 0),
                    "avg_compute_value": float(row["avg_compute_value"] or 0),
                    "waste_pct": float(row["waste_pct"] or 0),
                },
            })

        # Edges: fully-connected mesh between task_type nodes
        edges = []
        for i in range(len(task_types)):
            for j in range(i + 1, len(task_types)):
                weight = (df.iloc[i]["vm_count"] + df.iloc[j]["vm_count"]) / total_vms if total_vms else 0
                edges.append({
                    "source": task_types[i],
                    "target": task_types[j],
                    "weight": round(float(weight), 4),
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
        return JSONResponse({"error": "Topology query failed", "detail": str(e)}, status_code=500)
