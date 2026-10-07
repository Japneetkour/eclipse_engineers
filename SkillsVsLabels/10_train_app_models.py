"""Step 10 - Train and save the three models the dashboard (app.py) uses.

  models/salary_model.joblib   gradient boosting on log(salary): title family + city + experience + 30 skills
  models/hike_model.joblib     logistic regression: 5 junior skills -> high salary hike
  models/success_model.joblib  logistic regression with squared terms: Big Five -> senior success
  results/model_metrics.json   cross-validated scores shown in the app and the report
"""
import json
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import KFold, RepeatedStratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import OneHotEncoder, PolynomialFeatures, StandardScaler

from paths import CLEAN, MODELS, RESULTS

warnings.filterwarnings("ignore")
SEED = 42
M = {}

# ---------------------------------------------------------------- salary model
a = pd.read_csv(CLEAN / "analytics_clean.csv")
a["city"] = a["location"].astype(str).str.split(",").str[0].str.strip()
skills = sorted(c for c in a.columns if c.startswith("skill_"))
cat, num = ["title_family", "city"], ["avg_exp"] + skills
X, y = a[cat + num], np.log(a["salary_avg_lakh"])
sal = Pipeline([("pre", ColumnTransformer([("ohe", OneHotEncoder(handle_unknown="ignore"), cat)], remainder="passthrough")),
                ("gb", GradientBoostingRegressor(n_estimators=300, max_depth=3, learning_rate=0.07, random_state=SEED))])
cv = cross_validate(sal, X, y, cv=KFold(5, shuffle=True, random_state=SEED), scoring=("r2", "neg_mean_absolute_error"))
r2, mae = cv["test_r2"].mean(), -cv["test_neg_mean_absolute_error"].mean()
sal.fit(X, y)
M["salary"] = {"rows": len(a), "cv_r2": round(r2, 3), "cv_r2_sd": round(cv["test_r2"].std(), 3),
               "typical_error_pct": round((np.exp(mae) - 1) * 100, 1)}
joblib.dump({"model": sal, "skills": skills, "titles": sorted(a.title_family.unique()),
             "cities": a.city.value_counts().index.tolist(), "exp_max": float(a.avg_exp.max())},
            MODELS / "salary_model.joblib")
print(f"[salary]  GB 5-fold CV R2 = {r2:.3f} +- {cv['test_r2'].std():.3f}, typical error ~{M['salary']['typical_error_pct']}%")


# ---------------------------------------------------------------- small-data classifiers
def classifier(name, csv, feats, target, model):
    d = pd.read_csv(CLEAN / csv)
    rcv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=SEED)
    res = cross_validate(model, d[feats], d[target], cv=rcv, scoring=("roc_auc", "accuracy", "precision", "recall", "f1"))
    m = {k[5:]: round(float(v.mean()), 3) for k, v in res.items() if k.startswith("test_")}
    m["roc_auc_sd"] = round(float(res["test_roc_auc"].std()), 3)
    m["rows"] = len(d)
    m["majority_guess"] = round(float(max(d[target].mean(), 1 - d[target].mean())), 3)
    model.fit(d[feats], d[target])
    joblib.dump({"model": model, "feats": feats, "means": d[feats].mean().to_dict(),
                 "mins": d[feats].min().to_dict(), "maxs": d[feats].max().to_dict(),
                 "base_rate": float(d[target].mean())}, MODELS / f"{name}_model.joblib")
    M[name] = m
    print(f"[{name}]  CV AUC = {m['roc_auc']:.3f} +- {m['roc_auc_sd']:.3f}, accuracy = {m['accuracy']:.3f} "
          f"(majority guess {m['majority_guess']:.3f})")


classifier("hike", "jds_clean.csv",
           ["big_data_skills", "maths_stats_skills", "coding_skills", "ai_and_ml_skills", "dashboard_and_storytelling_skills"],
           "salary_hike_high_or_low", make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)))
classifier("success", "sds_clean.csv",
           ["neuroticism", "extraversion", "openness_to_experience", "agreeableness", "conscientiousness"],
           "success_high_low",
           make_pipeline(PolynomialFeatures(2, include_bias=False), StandardScaler(), LogisticRegression(max_iter=2000)))

json.dump(M, open(RESULTS / "model_metrics.json", "w"), indent=2)
print("saved -> models/*.joblib, results/model_metrics.json")
