# Skills vs Labels — SAS CU Hackathon

**Question:** is a data professional paid for what they *can do* (skills, experience, personality) or for what their job is *called* (the title, the label)?

Five analyses answer it, and a dashboard lets anyone explore the results and try "what-if" scenarios.

| # | Question | Script | Data |
|---|---|---|---|
| Q1 | Which skills carry a pay premium once title, city and experience are fixed? | `04_skill_roi.py` | Analytics Jobs |
| Q2 | Does the job title still pay after controlling for 30 skills? | `05_title_premium.py`, `07_dsjobs_ladder.py` | Analytics Jobs, DS Jobs |
| Q3 | At what experience level does salary growth flatten? | `06_experience_knee.py` | Analytics Jobs |
| Q4 | Which skills earn a junior data scientist a high salary hike? | `08_jds_hike_logit.py` | JDS Skill Traits |
| Q5 | Which personality traits mark a successful senior — and is there a sweet spot? | `09_sds_success_traits.py` | SDS Personality Traits |

## How to run (about 2 minutes)

1. Install Python 3.9 or newer.
2. Put the four hackathon files in `data/raw/` (already there in this package):
   `Analytics Jobs.csv`, `DataScience Jobs.csv`, `JDS Skill Traits.xlsx`, `SDS Personality Traits.xlsx`.
   Underscores or upload prefixes in the names are fine.
3. In a terminal, inside this folder:

```bash
pip install -r requirements.txt
python run_all.py
streamlit run app.py
```

`run_all.py` runs all 12 steps in order. The dashboard opens in your browser at http://localhost:8501.

On Mac/Linux use `python3` and `pip3` if `python` is not found. On Windows, `py -m pip install -r requirements.txt` also works.

## 📄 My resume (personalised answers)

The first page of the dashboard takes a resume (PDF, DOCX, TXT, or pasted text) and answers the five questions for that person:
it reads title family, city, years of experience and the 30 tracked skills (`resume_parser.py`, rule-based, works offline),
lets the user correct them, then shows their estimated salary, the skills worth adding, how their pay would change under
other titles, where they sit on the experience curve, their junior-hike chance and (from a short self-rating) their
senior-success profile. There is a question box ("Which skill should I learn next?") and a downloadable report.

## What each step does

| Step | Output |
|---|---|
| `00_audit_raw.py` | `results/audit.txt` — profile of the raw files (types, missing values, duplicates, top values) |
| `01_clean_analytics.py` | `data/clean/analytics_clean.csv` — 14,800 postings with numeric experience/salary, city, title family, 30 skill flags |
| `02_clean_others.py` | `data/clean/dsjobs_clean.csv`, `jds_clean.csv`, `sds_clean.csv` |
| `03_eda.py` | `figures/*.png` — 8 exploratory charts |
| `04`–`09` | `results/*.csv` — the tables behind each answer |
| `10_train_app_models.py` | `models/*.joblib` + `results/model_metrics.json` — models used by the dashboard |
| `11_report_figures.py` | `figures/report/*.png` — the charts used in the report and slides |
| `run_all.py` | runs everything; every step's printout is saved to `results/logs/` |
| `app.py` | the Streamlit dashboard |

## Folder layout

```
data/raw/       the 4 original files (never modified)
data/clean/     cleaned files
figures/        exploratory charts
results/        result tables, logs, model metrics
models/         trained models for the app
docs/screenshots/  dashboard screenshots used in the report
legacy/         an earlier version of the pipeline, kept for reference only
```

## Troubleshooting

- `ModuleNotFoundError` → run `pip install -r requirements.txt` again.
- "Could not find the … file" → a raw file is missing from `data/raw/`.
- Dashboard says "Results not found" → run `python run_all.py` first.
- Port in use → `streamlit run app.py --server.port 8502`.
