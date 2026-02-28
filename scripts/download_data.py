#!/usr/bin/env python3
"""
scripts/download_data.py
Dataset downloader for Cloud VM Intelligence Cockpit.

Usage:
    python scripts/download_data.py

The script downloads the Cloud Computing Performance Metrics dataset from
Kaggle and places it at backend/data/telemetry.csv, which is the path
expected by the FastAPI startup sequence (CSV_PATH in config.py).

Requirements:
    pip install kagglehub

Authentication:
    Either set KAGGLE_USERNAME + KAGGLE_KEY environment variables,
    or place ~/.kaggle/kaggle.json with your API credentials.
    Get credentials at: https://www.kaggle.com/settings/account
"""

import os
import shutil
import sys
from pathlib import Path

DATASET_SLUG = "abdurraziq01/cloud-computing-performance-metrics"
TARGET_PATH = Path(__file__).resolve().parent.parent / "backend" / "data" / "telemetry.csv"


def download_via_kagglehub() -> bool:
    """Primary method — kagglehub (cleanest API)."""
    try:
        import kagglehub
        print(f"[download_data] Downloading via kagglehub: {DATASET_SLUG}")
        path = kagglehub.dataset_download(DATASET_SLUG)
        src = Path(path)

        # Find the CSV file inside the downloaded directory
        csv_files = list(src.rglob("*.csv"))
        if not csv_files:
            print(f"[download_data] ERROR: No CSV found in {path}")
            return False

        # Use the largest CSV if multiple exist
        csv_src = max(csv_files, key=lambda f: f.stat().st_size)
        print(f"[download_data] Found CSV: {csv_src} ({csv_src.stat().st_size / 1e6:.1f} MB)")

        TARGET_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(csv_src, TARGET_PATH)
        print(f"[download_data] ✅ Saved to {TARGET_PATH}")
        return True

    except ImportError:
        print("[download_data] kagglehub not installed. Run: pip install kagglehub")
        return False
    except Exception as e:
        print(f"[download_data] kagglehub failed: {e}")
        return False


def download_via_curl() -> bool:
    """Fallback method — curl (works without Python Kaggle SDK)."""
    import subprocess
    import zipfile

    zip_path = TARGET_PATH.parent / "telemetry.zip"
    url = f"https://www.kaggle.com/api/v1/datasets/download/{DATASET_SLUG}"

    kaggle_user = os.getenv("KAGGLE_USERNAME")
    kaggle_key = os.getenv("KAGGLE_KEY")

    if not (kaggle_user and kaggle_key):
        print("[download_data] ERROR: KAGGLE_USERNAME and KAGGLE_KEY must be set for curl download.")
        return False

    TARGET_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"[download_data] Downloading via curl: {url}")

    try:
        result = subprocess.run(
            [
                "curl", "-L",
                "--user", f"{kaggle_user}:{kaggle_key}",
                "-o", str(zip_path),
                url,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        print(f"[download_data] Downloaded zip ({zip_path.stat().st_size / 1e6:.1f} MB)")

        with zipfile.ZipFile(zip_path, "r") as z:
            csv_files = [n for n in z.namelist() if n.endswith(".csv")]
            if not csv_files:
                print("[download_data] ERROR: No CSV found in zip")
                return False
            largest = max(csv_files, key=lambda n: z.getinfo(n).file_size)
            print(f"[download_data] Extracting {largest}")
            with z.open(largest) as src, open(TARGET_PATH, "wb") as dst:
                shutil.copyfileobj(src, dst)

        zip_path.unlink(missing_ok=True)
        print(f"[download_data] ✅ Saved to {TARGET_PATH}")
        return True

    except subprocess.CalledProcessError as e:
        print(f"[download_data] curl failed: {e.stderr}")
        return False
    except Exception as e:
        print(f"[download_data] curl download failed: {e}")
        return False


def main():
    if TARGET_PATH.exists():
        size_mb = TARGET_PATH.stat().st_size / 1e6
        print(f"[download_data] Dataset already exists at {TARGET_PATH} ({size_mb:.1f} MB)")
        print("[download_data] Delete it and re-run to force re-download.")
        return

    # Try kagglehub first, fall back to curl
    success = download_via_kagglehub() or download_via_curl()

    if not success:
        print("\n[download_data] Both download methods failed.")
        print("Manual alternative:")
        print(f"  1. Go to https://www.kaggle.com/datasets/{DATASET_SLUG}")
        print(f"  2. Download the CSV manually")
        print(f"  3. Place it at: {TARGET_PATH}")
        sys.exit(1)


if __name__ == "__main__":
    main()
