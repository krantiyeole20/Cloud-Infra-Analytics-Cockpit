#!/usr/bin/env python3
"""
scripts/test_backend.py
Smoke test all API endpoints of the Cloud VM Intelligence Cockpit backend.

Usage (server must be running on localhost:8000):
    python scripts/test_backend.py

Or against Render:
    BASE_URL=https://your-render-app.onrender.com python scripts/test_backend.py
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
TIMEOUT = 30  # seconds per request

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m⚠\033[0m"


def request(method: str, path: str, expect_status: int = 200) -> tuple[int, dict]:
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            body = json.loads(resp.read().decode())
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = {}
        try:
            body = json.loads(e.read().decode())
        except Exception:
            pass
        return e.code, body
    except Exception as e:
        return -1, {"error": str(e)}


results = []

def check(label: str, status: int, body: dict, expect: int = 200, required_keys: list = None):
    ok = status == expect
    missing = []
    if ok and required_keys:
        missing = [k for k in required_keys if k not in body]
        ok = len(missing) == 0
    icon = PASS if ok else FAIL
    detail = f"status={status}" + (f" missing_keys={missing}" if missing else "")
    print(f"  {icon}  {label:<45} {detail}")
    results.append(ok)

# ── Health ────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"Cloud VM Intelligence Cockpit — Backend Smoke Tests")
print(f"Target: {BASE_URL}")
print(f"{'='*60}\n")

print("[ Health ]")
s, b = request("GET", "/health")
check("/health", s, b, required_keys=["status", "rows_loaded", "memory_mb"])

# ── KPIs ──────────────────────────────────────────────────────────────────────
print("\n[ KPIs ]")
s, b = request("GET", "/kpis")
check("/kpis", s, b, required_keys=["avg_energy_efficiency", "fleet_power_kw", "total_vm_records"])

# ── Workload ─────────────────────────────────────────────────────────────────
print("\n[ Workload ]")
s, b = request("GET", "/workload/heatmap")
check("/workload/heatmap", s, b, required_keys=["rows", "cols", "matrix"])
s, b = request("GET", "/workload/distribution")
check("/workload/distribution (list)", s, b)

# ── Performance ──────────────────────────────────────────────────────────────
print("\n[ Performance ]")
s, b = request("GET", "/performance/timeseries?metric=energy_efficiency&bucket=day")
check("/performance/timeseries (default)", s, b, required_keys=["metric", "series"])
s, b = request("GET", "/performance/timeseries?metric=cpu_usage&bucket=hour&task_type=io")
check("/performance/timeseries (filtered)", s, b, required_keys=["metric", "series"])
s, b = request("GET", "/performance/surface3d?bucket=day")
check("/performance/surface3d", s, b, required_keys=["task_types", "surfaces"])
s, b = request("GET", "/performance/timeseries?metric=INVALID")
check("/performance/timeseries (invalid metric — expect 400)", s, b, expect=400)

# ── VMs ───────────────────────────────────────────────────────────────────────
print("\n[ VMs ]")
s, b = request("GET", "/vms")
check("/vms (top by compute_value)", s, b, required_keys=["cohorts", "sort_by"])
s, b = request("GET", "/vms?sort=asc")
check("/vms?sort=asc", s, b, required_keys=["cohorts"])
s, b = request("GET", "/vms/summary")
check("/vms/summary", s, b)
s, b = request("GET", "/vms/sample?task_type=io&limit=10")
check("/vms/sample (filtered)", s, b)

# ── Anomalies ─────────────────────────────────────────────────────────────────
print("\n[ Anomalies ]")
s, b = request("GET", "/anomalies")
check("/anomalies", s, b, required_keys=["fleet_alert"])
s, b = request("GET", "/anomalies?task_type=compute")
check("/anomalies (task_type=compute)", s, b, required_keys=["fleet_alert"])
s, b = request("GET", "/anomalies/roc")
if s == 503:
    print(f"  {WARN}  /anomalies/roc                                    status=503 (model not yet trained — expected)")
    results.append(True)
else:
    check("/anomalies/roc", s, b, required_keys=["fpr", "tpr", "auc"])
s, b = request("GET", "/anomalies/nonexistent-vm-id-12345/shap")
check("/anomalies/{vm_id}/shap (not found — expect 404)", s, b, expect=404)

# ── Forecast ─────────────────────────────────────────────────────────────────
print("\n[ Forecast ]")
s, b = request("GET", "/forecast/24h")
if s == 503:
    print(f"  {WARN}  /forecast/24h                                     status=503 (model training — may be slow)")
    results.append(True)
else:
    check("/forecast/24h", s, b, required_keys=["horizon_hours", "series"])
s, b = request("GET", "/forecast/7day")
if s == 503:
    print(f"  {WARN}  /forecast/7day                                    status=503 (model training — may be slow)")
    results.append(True)
else:
    check("/forecast/7day", s, b, required_keys=["horizon_days", "series", "alert"])

# ── Topology ─────────────────────────────────────────────────────────────────
print("\n[ Topology ]")
s, b = request("GET", "/topology")
check("/topology", s, b, required_keys=["nodes", "edges", "layout"])
if s == 200:
    n_nodes = len(b.get("nodes", []))
    icon = PASS if n_nodes == 3 else WARN
    print(f"  {icon}  /topology node count = {n_nodes} (expect 3 — io/network/compute)")

# ── Explorer ─────────────────────────────────────────────────────────────────
print("\n[ Explorer ]")
s, b = request("GET", "/explorer/templates")
check("/explorer/templates", s, b, required_keys=["templates"])
s, b = request("GET", "/explorer/query?template=avg_efficiency_by_type")
check("/explorer/query (template)", s, b, required_keys=["rows", "columns"])
s, b = request("GET", "/explorer/query?sql=SELECT+task_type,+COUNT(*)+AS+n+FROM+telemetry+GROUP+BY+task_type+LIMIT+3")
check("/explorer/query (custom SQL)", s, b, required_keys=["rows"])
s, b = request("GET", "/explorer/query?sql=DROP+TABLE+telemetry")
check("/explorer/query (mutation blocked — expect 400)", s, b, expect=400)

# ── Refresh ───────────────────────────────────────────────────────────────────
print("\n[ Refresh — POST ]")
print("  Running POST /refresh (may take 10-60s — retrains models)...")
t0 = time.perf_counter()
s, b = request("POST", "/refresh")
elapsed = time.perf_counter() - t0
check(f"/refresh ({elapsed:.1f}s)", s, b, required_keys=["rows_added", "cache_invalidated"])

# ── Summary ───────────────────────────────────────────────────────────────────
passed = sum(results)
total = len(results)
pct = 100 * passed // total if total else 0
print(f"\n{'='*60}")
print(f"Results: {passed}/{total} passed ({pct}%)")
if passed == total:
    print(f"{PASS} All tests passed!")
else:
    failed = total - passed
    print(f"{FAIL} {failed} test(s) failed — see above.")
print(f"{'='*60}\n")

sys.exit(0 if passed == total else 1)
