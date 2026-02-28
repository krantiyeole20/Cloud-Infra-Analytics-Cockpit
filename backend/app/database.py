# backend/app/database.py
# DuckDB in-memory data layer for the Cloud VM Intelligence Cockpit.
# HLD.md Section 4.3.
#
# Key change from Phase 1 (GPU): init_db now receives a pre-processed
# DataFrame from pipeline.run_pipeline — it does NOT read the CSV itself.
# The pipeline runs null handling + derived metrics before this module
# ever sees the data.

import duckdb
import pandas as pd
import logging

logger = logging.getLogger(__name__)

_conn: duckdb.DuckDBPyConnection | None = None


def init_db(df: pd.DataFrame) -> None:
    """
    Register a pre-processed DataFrame as the 'telemetry' DuckDB table.

    The DataFrame must already have been processed by pipeline.run_pipeline
    (nulls handled, derived metrics computed, dtypes downcast). This
    function only handles DuckDB registration — it does NOT do any ETL.

    Args:
        df: Pre-processed telemetry DataFrame.

    Raises:
        Exception: Logged and re-raised on DuckDB init failure.
    """
    global _conn
    try:
        _conn = duckdb.connect(database=":memory:", read_only=False)
        # Register as a view first, then materialize to an actual table
        # so DuckDB owns the data and the Python DataFrame can be freed.
        _conn.register("telemetry_view", df)
        _conn.execute("CREATE TABLE telemetry AS SELECT * FROM telemetry_view")
        _conn.unregister("telemetry_view")
        row_count = _conn.execute("SELECT COUNT(*) FROM telemetry").fetchone()[0]
        logger.info(
            f"DuckDB initialized — {row_count} rows in 'telemetry' table"
        )
    except Exception as e:
        logger.error(f"init_db failed: {e}")
        raise


def query(sql: str, params: list | None = None) -> pd.DataFrame:
    """
    Execute a read-only SQL query against the DuckDB telemetry table.

    Args:
        sql:    SQL string (may contain ? placeholders).
        params: Optional list of positional parameters for ? placeholders.

    Returns:
        pd.DataFrame with query results.

    Raises:
        RuntimeError: If the connection is not initialized.
        Exception:    Logged and re-raised on query failure.
    """
    if _conn is None:
        raise RuntimeError(
            "DuckDB connection is not initialized. Call init_db first."
        )
    try:
        if params:
            result = _conn.execute(sql, params).fetchdf()
        else:
            result = _conn.execute(sql).fetchdf()
        return result
    except Exception as e:
        # Log first 500 chars of SQL to keep logs readable
        logger.error(
            f"query failed [{e}] — SQL: {sql[:500]!r}"
        )
        raise


def append_rows(df: pd.DataFrame) -> None:
    """
    Append synthetic rows to the live 'telemetry' DuckDB table.

    Called on every POST /refresh. The incoming DataFrame must have the
    same schema as the 'telemetry' table (all original + derived columns).

    Args:
        df: DataFrame of new synthetic rows to append.

    Raises:
        RuntimeError: If the connection is not initialized.
        Exception:    Logged and re-raised on insertion failure.
    """
    if _conn is None:
        raise RuntimeError(
            "DuckDB connection is not initialized. Call init_db first."
        )
    try:
        _conn.register("new_rows", df)
        _conn.execute("INSERT INTO telemetry SELECT * FROM new_rows")
        _conn.unregister("new_rows")
        logger.info(f"Appended {len(df)} synthetic rows to DuckDB")
    except Exception as e:
        logger.error(f"append_rows failed: {e}")
        raise


def get_connection() -> duckdb.DuckDBPyConnection:
    """
    Return the raw DuckDB connection for ML modules that need direct access.

    Returns:
        The active DuckDB connection.

    Raises:
        RuntimeError: If the connection is not initialized.
    """
    if _conn is None:
        raise RuntimeError(
            "DuckDB connection is not initialized. Call init_db first."
        )
    return _conn


def get_row_count() -> int:
    """
    Return the current number of rows in the telemetry table.
    Used by the /health endpoint.
    """
    try:
        return _conn.execute("SELECT COUNT(*) FROM telemetry").fetchone()[0]
    except Exception as e:
        logger.error(f"get_row_count failed: {e}")
        return -1
