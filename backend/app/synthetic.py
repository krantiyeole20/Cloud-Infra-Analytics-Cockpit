# backend/app/synthetic.py
# Per-cohort multivariate normal synthetic data generator.
# HLD.md Section 2.7.
#
# Phase 0 decision: synth_strategy = per_cohort_covariance (Candidate A)
# Rationale: all 3 task_type cohort covariance matrices are FULL RANK (rank=7).
# Per-cohort sampling preserves the distinct correlation structure of each
# workload class (io / network / compute).
#
# Candidate B (global covariance) is implemented but not used — kept for
# future fallback if a cohort becomes rank-deficient after repeated appends.

import uuid
import logging
from typing import Callable

import numpy as np
import pandas as pd

from app.config import (
    BATCH_SIZE,
    COLUMN_BOUNDS,
    NUMERIC_COLS,
    TASK_TYPES,
    TASK_PRIORITIES,
    TASK_STATUSES,
)

logger = logging.getLogger(__name__)

# Columns to generate via multivariate normal sampling
_SYNTH_NUMERIC_COLS = [c for c in NUMERIC_COLS if c in COLUMN_BOUNDS]


# ---------------------------------------------------------------------------
# Internal: Candidate A — per-cohort covariance (ACTIVE)
# ---------------------------------------------------------------------------

def _build_per_cohort_generator(seed_df: pd.DataFrame) -> Callable[[int], pd.DataFrame]:
    """
    Fit one mean vector + covariance matrix per task_type cohort.
    Returns a generator function that produces n synthetic rows preserving
    the original task_type, task_priority, and task_status distributions.
    """
    cohort_params: dict = {}
    task_dist: dict = {}
    priority_dist: dict = {}
    status_dist: dict = {}

    try:
        task_dist = seed_df["task_type"].value_counts(normalize=True).to_dict()
        priority_dist = seed_df["task_priority"].value_counts(normalize=True).to_dict()
        status_dist = seed_df["task_status"].value_counts(normalize=True).to_dict()

        for task in seed_df["task_type"].unique():
            cohort = seed_df[seed_df["task_type"] == task][_SYNTH_NUMERIC_COLS].dropna()
            if len(cohort) < 2:
                logger.warning(f"Cohort '{task}' has fewer than 2 rows — skipping")
                continue
            mean_vec = cohort.mean().values
            cov_matrix = cohort.cov().values
            rank = np.linalg.matrix_rank(cov_matrix)
            logger.info(
                f"Cohort '{task}': n={len(cohort)}, cov rank={rank}/{len(_SYNTH_NUMERIC_COLS)}"
            )
            cohort_params[task] = (mean_vec, cov_matrix)

        logger.info(
            f"Per-cohort generator ready — "
            f"task_dist={task_dist}, synth_strategy=per_cohort_covariance"
        )
    except Exception as e:
        logger.error(f"_build_per_cohort_generator setup failed: {e}")
        raise

    def _generate(n: int = BATCH_SIZE) -> pd.DataFrame:
        rows = []
        try:
            for task, proportion in task_dist.items():
                if task not in cohort_params:
                    continue
                count = max(1, round(n * proportion))
                mean_vec, cov_matrix = cohort_params[task]

                samples = np.random.multivariate_normal(
                    mean_vec, cov_matrix, size=count
                )
                cohort_df = pd.DataFrame(samples, columns=_SYNTH_NUMERIC_COLS)

                # Clip all numeric columns to defined bounds
                for col, (lo, hi) in COLUMN_BOUNDS.items():
                    if col in cohort_df.columns:
                        cohort_df[col] = cohort_df[col].clip(lo, hi)

                # Assign categorical columns from empirical distributions
                cohort_df["task_type"] = task
                cohort_df["task_priority"] = np.random.choice(
                    list(priority_dist.keys()),
                    size=count,
                    p=list(priority_dist.values()),
                )
                cohort_df["task_status"] = np.random.choice(
                    list(status_dist.keys()),
                    size=count,
                    p=list(status_dist.values()),
                )

                # Each synthetic row gets a fresh UUID (matches schema)
                cohort_df["vm_id"] = [str(uuid.uuid4()) for _ in range(count)]
                cohort_df["timestamp"] = pd.Timestamp.utcnow().isoformat()

                # Compute derived metrics inline (matching pipeline logic)
                safe_exec = cohort_df["execution_time"].replace(0.0, float("nan"))
                cohort_df["throughput"] = cohort_df["num_executed_instructions"] / safe_exec
                cohort_df["compute_value"] = cohort_df["throughput"] * cohort_df["energy_efficiency"]

                from app.config import WASTE_POWER_THRESHOLD
                cohort_df["is_wasting_energy"] = (
                    (cohort_df["task_status"] == "waiting")
                    & (cohort_df["power_consumption"] > WASTE_POWER_THRESHOLD)
                ).astype("int8")

                rows.append(cohort_df)

            result = pd.concat(rows, ignore_index=True)
            logger.info(f"Generated {len(result)} synthetic rows (requested {n})")
            return result

        except Exception as e:
            logger.error(f"synthetic generator failed: {e}")
            raise

    return _generate


# ---------------------------------------------------------------------------
# Internal: Candidate B — global covariance (FALLBACK)
# ---------------------------------------------------------------------------

def _build_global_generator(seed_df: pd.DataFrame) -> Callable[[int], pd.DataFrame]:
    """
    Fit a single covariance matrix on the full dataset.
    Used only if any cohort's cov matrix is rank-deficient.
    """
    try:
        numeric = seed_df[_SYNTH_NUMERIC_COLS].dropna()
        mean_vec = numeric.mean().values
        cov_matrix = numeric.cov().values
        task_dist = seed_df["task_type"].value_counts(normalize=True).to_dict()
        priority_dist = seed_df["task_priority"].value_counts(normalize=True).to_dict()
        status_dist = seed_df["task_status"].value_counts(normalize=True).to_dict()
        logger.info("Global covariance generator ready (fallback mode)")
    except Exception as e:
        logger.error(f"_build_global_generator setup failed: {e}")
        raise

    def _generate(n: int = BATCH_SIZE) -> pd.DataFrame:
        try:
            samples = np.random.multivariate_normal(mean_vec, cov_matrix, size=n)
            df = pd.DataFrame(samples, columns=_SYNTH_NUMERIC_COLS)
            for col, (lo, hi) in COLUMN_BOUNDS.items():
                if col in df.columns:
                    df[col] = df[col].clip(lo, hi)
            df["task_type"] = np.random.choice(
                list(task_dist.keys()), size=n, p=list(task_dist.values())
            )
            df["task_priority"] = np.random.choice(
                list(priority_dist.keys()), size=n, p=list(priority_dist.values())
            )
            df["task_status"] = np.random.choice(
                list(status_dist.keys()), size=n, p=list(status_dist.values())
            )
            df["vm_id"] = [str(uuid.uuid4()) for _ in range(n)]
            df["timestamp"] = pd.Timestamp.utcnow().isoformat()

            safe_exec = df["execution_time"].replace(0.0, float("nan"))
            df["throughput"] = df["num_executed_instructions"] / safe_exec
            df["compute_value"] = df["throughput"] * df["energy_efficiency"]

            from app.config import WASTE_POWER_THRESHOLD
            df["is_wasting_energy"] = (
                (df["task_status"] == "waiting")
                & (df["power_consumption"] > WASTE_POWER_THRESHOLD)
            ).astype("int8")

            logger.info(f"Generated {len(df)} synthetic rows (global covariance)")
            return df
        except Exception as e:
            logger.error(f"global synthetic generator failed: {e}")
            raise

    return _generate


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_synthetic_generator(
    seed_df: pd.DataFrame,
    synth_strategy: str = "per_cohort_covariance",
) -> Callable[[int], pd.DataFrame]:
    """
    Build and return the appropriate synthetic row generator.

    Phase 0 decision: synth_strategy = per_cohort_covariance.
    Candidate B (global) is available via synth_strategy="global_covariance"
    if any cohort becomes rank-deficient in the future.

    Args:
        seed_df:        The processed telemetry DataFrame (post-pipeline).
        synth_strategy: "per_cohort_covariance" (default) or "global_covariance".

    Returns:
        Callable[[int], pd.DataFrame]: Generator function that takes n (row count)
        and returns a DataFrame of synthetic rows with all columns populated.
    """
    logger.info(f"Building synthetic generator — strategy: {synth_strategy}")
    if synth_strategy == "per_cohort_covariance":
        return _build_per_cohort_generator(seed_df)
    elif synth_strategy == "global_covariance":
        return _build_global_generator(seed_df)
    else:
        raise ValueError(
            f"Unknown synth_strategy: {synth_strategy!r}. "
            "Choose 'per_cohort_covariance' or 'global_covariance'."
        )
