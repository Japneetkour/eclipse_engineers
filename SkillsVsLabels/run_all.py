"""Run the whole Skills-vs-Labels pipeline, in order, and keep every printout.

    python run_all.py            -> cleans data, runs all analyses, trains the app models
    streamlit run app.py         -> opens the dashboard (after run_all.py has finished once)

Each step's screen output is also saved to results/logs/<step>.txt (paste these into the report).
"""
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOGS = ROOT / "results" / "logs"
LOGS.mkdir(parents=True, exist_ok=True)

STEPS = [
    ("00_audit_raw.py", "Raw data audit"),
    ("01_clean_analytics.py", "Clean Analytics Jobs"),
    ("02_clean_others.py", "Clean DS Jobs, JDS, SDS"),
    ("03_eda.py", "Exploratory charts"),
    ("04_skill_roi.py", "Q1 Skill pay uplift"),
    ("05_title_premium.py", "Q2 Title premium (skills vs labels)"),
    ("06_experience_knee.py", "Q3 Experience knee"),
    ("07_dsjobs_ladder.py", "Q2b Title ladder in DS Jobs"),
    ("08_jds_hike_logit.py", "Q4 Junior skills -> salary hike"),
    ("09_sds_success_traits.py", "Q5 Senior personality -> success"),
    ("10_train_app_models.py", "Train dashboard models"),
    ("11_report_figures.py", "Report figures"),
]

t0 = time.time()
for script, label in STEPS:
    print(f"\n{'=' * 24} {script}  ({label}) {'=' * 24}", flush=True)
    t = time.time()
    r = subprocess.run([sys.executable, script], cwd=ROOT, capture_output=True, text=True)
    (LOGS / script.replace(".py", ".txt")).write_text(r.stdout + r.stderr, encoding="utf-8")
    tail = (r.stdout.strip().splitlines() or [""])[-1]
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        sys.exit(f"\nStopped: {script} failed. Full output is in results/logs/{script.replace('.py', '.txt')}")
    print(f"ok in {time.time() - t:.0f}s  |  {tail[:110]}")

print(f"\nAll {len(STEPS)} steps done in {time.time() - t0:.0f}s.")
print("Results: results/   Charts: figures/   Models: models/")
print("Next:    streamlit run app.py")
