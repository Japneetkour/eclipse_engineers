"""Shared folder locations + a forgiving raw-file finder (used by every step)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "raw"
CLEAN = ROOT / "data" / "clean"
RESULTS = ROOT / "results"
FIG = ROOT / "figures"
MODELS = ROOT / "models"
for _p in (CLEAN, RESULTS, FIG, MODELS):
    _p.mkdir(parents=True, exist_ok=True)

# keyword that must appear in the raw file name (spaces/underscores/case ignored)
RAW_KEYS = {"analytics": "analyticsjobs", "dsjobs": "datasciencejobs",
            "jds": "jdsskill", "sds": "sdspersonality"}


def find_raw(key):
    """'Analytics Jobs.csv', 'Analytics_Jobs.csv' or 'abc123-Analytics_Jobs.csv' all match."""
    kw = RAW_KEYS[key]
    hits = sorted(p for p in RAW_DIR.glob("*")
                  if p.suffix.lower() in (".csv", ".xlsx", ".xls")
                  and kw in p.stem.lower().replace(" ", "").replace("_", "").replace("-", ""))
    if not hits:
        raise SystemExit(f"Could not find the {key} file in {RAW_DIR}. Put the 4 hackathon files in data/raw/.")
    return hits[0]
