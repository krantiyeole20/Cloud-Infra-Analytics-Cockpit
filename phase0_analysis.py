import pandas as pd
import numpy as np

df = pd.read_csv("backend/data/telemetry.csv")

print("=== BASIC INFO ===")
print(f"Rows: {len(df)}")
print(f"Columns: {list(df.columns)}")
print(df.dtypes)

print("\n=== NULL RATES (%) ===")
nullable_cols = [
    "cpu_usage", "memory_usage", "network_traffic",
    "power_consumption", "num_executed_instructions", "execution_time"
]
print((df[nullable_cols].isnull().sum() / len(df) * 100).round(4))

print("\n=== NULL RATES BY TASK TYPE ===")
print(df.groupby("task_type")[nullable_cols].apply(
    lambda g: (g.isnull().sum() / len(g) * 100).round(4)
))

print("\n=== TASK TYPE DISTRIBUTION ===")
print(df["task_type"].value_counts(normalize=True).round(4))

print("\n=== TASK PRIORITY DISTRIBUTION ===")
print(df["task_priority"].value_counts(normalize=True).round(4))

print("\n=== TASK STATUS DISTRIBUTION ===")
print(df["task_status"].value_counts(normalize=True).round(4))

print("\n=== UNIQUE VM COUNT ===")
print(f"Unique vm_ids: {df['vm_id'].nunique()}")

print("\n=== ENERGY EFFICIENCY STATS ===")
print(df["energy_efficiency"].describe())

print("\n=== POWER CONSUMPTION (waiting tasks only) ===")
waiting = df[df["task_status"] == "waiting"]["power_consumption"]
print(waiting.describe())
print(f"75th percentile (candidate WASTE_POWER_THRESHOLD): {waiting.quantile(0.75):.2f}")

print("\n=== COVARIANCE MATRIX RANK PER TASK TYPE ===")
numeric_cols = [
    "cpu_usage", "memory_usage", "network_traffic",
    "power_consumption", "num_executed_instructions",
    "execution_time", "energy_efficiency"
]
for task in df["task_type"].unique():
    cohort = df[df["task_type"] == task][numeric_cols].dropna()
    rank = np.linalg.matrix_rank(cohort.cov().values)
    print(f"  {task}: rank={rank}, n_cols={len(numeric_cols)} — {'FULL RANK' if rank == len(numeric_cols) else 'RANK DEFICIENT'}")

print("\n=== MEMORY FOOTPRINT ===")
print(f"Raw: {df.memory_usage(deep=True).sum() / 1e6:.1f} MB")
for col in df.select_dtypes(include="float64").columns:
    df[col] = df[col].astype("float32")
print(f"After float32 downcast: {df.memory_usage(deep=True).sum() / 1e6:.1f} MB")

print("\n=== ENERGY WASTE RATE ANALYSIS ===")
p75 = df[df["task_status"] == "waiting"]["power_consumption"].quantile(0.75)
waste_mask = (df["task_status"] == "waiting") & (df["power_consumption"] > p75)
print(f"Waste rate at p75 threshold ({p75:.2f}): {waste_mask.mean():.4%}")
