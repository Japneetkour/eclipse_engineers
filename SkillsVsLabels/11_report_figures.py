"""Step 11 (optional) - Publication-quality figures for the Word report and the slides.
Reads results/*.csv and data/clean/*.csv, writes figures/report/*.png."""
import json
import warnings

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import FancyBboxPatch
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from paths import CLEAN, FIG, RESULTS

warnings.filterwarnings("ignore")
OUT = FIG / "report"
OUT.mkdir(parents=True, exist_ok=True)
BLUE, ORANGE, GREEN, GOLD, GREY, RED, INK, INK2 = "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#b9b8b2", "#e34948", "#0b0b0b", "#52514e"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.color": "#e4e3df", "grid.linewidth": .6, "axes.axisbelow": True,
                     "axes.edgecolor": INK2, "xtick.color": INK2, "ytick.color": INK2, "axes.titleweight": "bold",
                     "axes.titlesize": 11, "legend.frameon": False})
nice = lambda s: s.replace("_", " ")


def save(name):
    plt.savefig(OUT / f"{name}.png", dpi=200, bbox_inches="tight")
    plt.close()


sk = pd.read_csv(RESULTS / "skill_uplift_table.csv", index_col=0)
tp = pd.read_csv(RESULTS / "title_premium_table.csv")
lad = pd.read_csv(RESULTS / "dsjobs_title_ladder.csv")
dvp = pd.read_csv(RESULTS / "dsjobs_demand_vs_pay.csv")
eq = pd.read_csv(RESULTS / "experience_quantiles.csv").rename(columns={"Unnamed: 0": "yr", "yr_group": "yr"})
jor = pd.read_csv(RESULTS / "jds_odds_ratios.csv", index_col=0)
sor = pd.read_csv(RESULTS / "sds_odds_ratios.csv", index_col=0)
sw = pd.read_csv(RESULTS / "sds_sweet_spots.csv")
arch = pd.read_csv(RESULTS / "sds_archetypes.csv")
a = pd.read_csv(CLEAN / "analytics_clean.csv")
jds = pd.read_csv(CLEAN / "jds_clean.csv")
sds = pd.read_csv(CLEAN / "sds_clean.csv")
extra = {}

# 1 ---- workflow diagram
fig, ax = plt.subplots(figsize=(9, 4.4)); ax.axis("off"); ax.set_xlim(0, 10); ax.set_ylim(0, 5)
def box(x, y, w, h, t, fc="#f1f0ec", tc=INK, bold=False, fs=8.4):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08", fc=fc, ec="white", lw=1.5))
    ax.text(x + w / 2, y + h / 2, t, ha="center", va="center", fontsize=fs, color=tc, fontweight="bold" if bold else "normal")
def arr(x1, y1, x2, y2):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(arrowstyle="-|>", color=INK2, lw=1.1))
for i, s in enumerate(["Audit raw\nfiles", "Clean &\nderive", "Explore\n(EDA)", "Model &\ntest", "Validate\n(CV, checks)", "Dashboard &\nreport"]):
    box(.1 + i * 1.65, 4.0, 1.5, .8, s, fc=BLUE, tc="white", bold=True)
    if i: arr(.1 + i * 1.65 - .14, 4.4, .1 + i * 1.65, 4.4)
rows = [("Analytics Jobs\n14,800 postings", "OLS log-salary + 30 skills\nnested title models", "Q1 skill premiums\nQ2 title premiums"),
        ("Analytics Jobs", "Piecewise & quantile\nregression, bootstrap", "Q3 experience knee"),
        ("DS Jobs\n1,597 rows", "OLS log-salary,\ntitle ladder (HC3)", "Q2b demand vs pay,\n'Senior' premium"),
        ("JDS 118 juniors\nSDS 161 seniors", "Logit, tree, squared terms,\nk-means, repeated CV", "Q4 hike drivers\nQ5 success traits")]
for r, (d1, m, q) in enumerate(rows):
    y = 3.0 - r * .93
    box(.1, y, 2.6, .78, d1, bold=True); box(3.2, y, 3.3, .78, m); box(7.0, y, 2.9, .78, q, fc="#dce9f8")
    arr(2.7, y + .39, 3.2, y + .39); arr(6.5, y + .39, 7.0, y + .39)
save("f01_workflow")

# 2 ---- skill uplift forest
s = sk.sort_values("uplift_pct")
fig, ax = plt.subplots(figsize=(7, 7.2))
col = np.where(~s.reliable, GREY, np.where(s.uplift_pct > 0, BLUE, RED))
ax.barh([nice(i) for i in s.index], s.uplift_pct, color=col, height=.65)
ax.errorbar(s.uplift_pct, range(len(s)), xerr=[s.uplift_pct - s.ci_lo_pct, s.ci_hi_pct - s.uplift_pct], fmt="none", ecolor=INK2, lw=.8, capsize=2)
ax.axvline(0, color=INK2, lw=.8)
ax.set_xlabel("% pay difference when the posting lists the skill (95% CI)")
ax.set_title("Skill pay premiums, holding title, city and experience fixed\n(blue/red = reliable, grey = not distinguishable from zero)")
ax.grid(axis="y", visible=False); save("f02_skill_uplift")

# 3 ---- title premium A vs B
t = tp.sort_values("premium_A_pct")
fig, ax = plt.subplots(figsize=(7, 3.8)); y = np.arange(len(t))
ax.hlines(y, t.premium_A_pct, t.premium_B_pct, color="#cfcec8", lw=4)
ax.scatter(t.premium_A_pct, y, s=70, color=GREY, label="Model A: title + city + experience", zorder=3)
ax.scatter(t.premium_B_pct, y, s=70, color=BLUE, label="Model B: A + all 30 skills", zorder=3)
for yy, (va, vb) in enumerate(zip(t.premium_A_pct, t.premium_B_pct)):
    ax.text(max(va, vb) + 2, yy, f"{vb:+.0f}%", va="center", fontsize=8.5, color=INK)
ax.axvline(0, color=INK2, lw=.8); ax.set_yticks(y); ax.set_yticklabels(t.title_family)
ax.set_xlabel("% pay vs the average title (effect coding)"); ax.set_title("Title premiums shrink only partly once skills are controlled")
ax.legend(loc="lower right", fontsize=8.5); ax.grid(axis="y", visible=False); save("f03_title_premium")

# 4 ---- DS jobs ladder + demand vs pay
L = pd.concat([pd.DataFrame([{"job_title": "Data Analyst", "premium_vs_data_analyst_pct": 0, "ci_lo": 0, "ci_hi": 0}]), lad]).sort_values("premium_vs_data_analyst_pct")
fig, ax = plt.subplots(figsize=(7, 4))
ax.barh(L.job_title, L.premium_vs_data_analyst_pct, color=BLUE, height=.6)
ax.errorbar(L.premium_vs_data_analyst_pct, range(len(L)), xerr=[L.premium_vs_data_analyst_pct - L.ci_lo, L.ci_hi - L.premium_vs_data_analyst_pct], fmt="none", ecolor=INK2, lw=.8, capsize=2)
for i, v in enumerate(L.premium_vs_data_analyst_pct): ax.text(v + 4, i - .3, f"+{v:.0f}%", fontsize=8.5)
ax.set_xlabel("% salary premium vs Data Analyst at the same required experience (95% CI)")
ax.set_title("DS Jobs: the title ladder at equal experience"); ax.grid(axis="y", visible=False); save("f04_ds_ladder")

fig, ax = plt.subplots(figsize=(7, 4.2))
ax.scatter(dvp.share_of_postings_pct, dvp.median_salary, s=dvp.rows * 1.2, color=ORANGE, alpha=.85, edgecolor="white", lw=1.5)
offs = {"Business Analyst": (-60, 8), "Data Analyst": (-40, -14), "Senior Business Analyst": (6, 6), "Data Scientist": (6, -2),
        "Data Engineer": (6, -10), "Senior Data Analyst": (6, -8), "Machine Learning Engineer": (8, -2)}
for _, r in dvp.iterrows():
    ax.annotate(r.job_title, (r.share_of_postings_pct, r.median_salary), xytext=offs.get(r.job_title, (6, 2)), textcoords="offset points", fontsize=8)
ax.set_xlabel("Share of all postings (%)"); ax.set_ylabel("Median average salary (₹ lakh)")
ax.set_title("Where the jobs are is not where the money is (bubble = company rows)"); save("f05_demand_vs_pay")

# 5 ---- experience curve
q = eq[eq.yr != "21+"].copy(); q["y"] = q.yr.astype(int); q = q[(q.n >= 50) & (q.y <= 16)]
fig, ax = plt.subplots(figsize=(7, 3.8))
ax.fill_between(q.y, q.p25, q.p75, color=BLUE, alpha=.15, label="25th–75th percentile")
ax.plot(q.y, q["median"], color=BLUE, lw=2.2, marker="o", ms=5, label="median")
xs = np.linspace(0, 16, 100); e = a.avg_exp.values; ly = np.log(a.salary_avg_lakh.values)
X = np.c_[np.ones_like(e), e, np.maximum(0, e - 6.5)]; b = np.linalg.lstsq(X, ly, rcond=None)[0]
ax.plot(xs, np.exp(b[0] + b[1] * xs + b[2] * np.maximum(0, xs - 6.5)), color=ORANGE, lw=2, ls="--", label="piecewise fit (break 6.5 yrs)")
ax.axvline(6.5, color=ORANGE, lw=.8, ls=":")
ax.set_xlabel("Years of experience (posting midpoint)"); ax.set_ylabel("Salary (₹ lakh, band midpoint)")
ax.set_title("Pay climbs ~36%/yr until about 6.5 years, then ~7%/yr"); ax.legend(loc="upper left", fontsize=8.5); save("f06_experience")


# 6 ---- odds-ratio forests
def forest(df, col, title, name, labels=None):
    d = df.sort_values(col)
    fig, ax = plt.subplots(figsize=(6.4, 3.1))
    c = np.where(d.reliable, BLUE, GREY)
    for i, (v, lo, hi, cc) in enumerate(zip(d[col], d.ci_lo, d.ci_hi, c)):
        ax.errorbar([v], [i], xerr=[[v - lo], [hi - v]], fmt="none", ecolor=cc, lw=1.5, capsize=3)
    ax.scatter(d[col], range(len(d)), color=c, s=55, zorder=3)
    for i, v in enumerate(d[col]): ax.text(v, i + .22, f"×{v:.1f}", ha="center", fontsize=8.5)
    ax.axvline(1, color=INK2, ls="--", lw=.8); ax.set_xscale("log")
    from matplotlib.ticker import FuncFormatter, LogLocator
    ax.xaxis.set_major_locator(LogLocator(subs=(1, 2, 5))); ax.xaxis.set_minor_formatter(FuncFormatter(lambda v, _: ""))
    ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:g}")); ax.set_ylim(-.5, len(d) - .2)
    ax.set_yticks(range(len(d))); ax.set_yticklabels([(labels or {}).get(i, nice(i)) for i in d.index])
    ax.set_xlabel("Odds ratio per +1 SD (log scale, 95% CI; grey = not significant)"); ax.set_title(title)
    ax.grid(axis="y", visible=False); save(name)
forest(jor, "odds_ratio_per_1SD", "Junior hike: which skills raise the odds?", "f07_jds_or",
       {"maths_stats": "Maths & stats", "storytelling": "Dashboard & storytelling", "ai_and_ml": "AI & ML", "big_data": "Big data", "coding": "Coding"})
forest(sor, "OR_per_1SD", "Senior success: which traits raise the odds?", "f09_sds_or")

# 7 ---- JDS model comparison & SDS linear vs quadratic (re-computed, same CV design as steps 08/09)
JF = ["big_data_skills", "maths_stats_skills", "coding_skills", "ai_and_ml_skills", "dashboard_and_storytelling_skills"]
SF = ["neuroticism", "extraversion", "openness_to_experience", "agreeableness", "conscientiousness"]
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=42)
res = {}
for nm, mdl, X, yv in [("JDS logistic", make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)), jds[JF], jds.salary_hike_high_or_low),
                       ("JDS tree (depth 3)", DecisionTreeClassifier(max_depth=3, random_state=42), jds[JF], jds.salary_hike_high_or_low),
                       ("SDS logistic", make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)), sds[SF], sds.success_high_low),
                       ("SDS logistic + squares", make_pipeline(PolynomialFeatures(2, include_bias=False), StandardScaler(), LogisticRegression(max_iter=1000)), sds[SF], sds.success_high_low),
                       ("SDS tree (depth 3)", DecisionTreeClassifier(max_depth=3, random_state=42), sds[SF], sds.success_high_low)]:
    sc = cross_val_score(mdl, X, yv, cv=cv, scoring="roc_auc"); res[nm] = (sc.mean(), sc.std())
extra["cv_auc"] = {k: [round(v[0], 3), round(v[1], 3)] for k, v in res.items()}
fig, ax = plt.subplots(figsize=(6.6, 3.0)); names = list(res)[::-1]
ax.barh(names, [res[n][0] for n in names], xerr=[res[n][1] for n in names], color=[GREEN if n.startswith("SDS") else BLUE for n in names], ecolor=INK2, capsize=3, height=.6)
for i, n in enumerate(names): ax.text(1.06, i, f"{res[n][0]:.3f}", va="center", ha="right", fontsize=8.5)
ax.set_xlim(.5, 1.07); ax.axvline(.5, color=INK2, lw=.8)
ax.set_xlabel("Mean ROC-AUC, 5-fold CV × 10 repeats (±1 SD)"); ax.set_title("Model comparison on the two people datasets")
ax.grid(axis="y", visible=False); save("f08_model_cv")

# 8 ---- sweet-spot curves (per-trait quadratic logit, as in step 09)
import statsmodels.api as sm
fig, axs = plt.subplots(1, 5, figsize=(10, 2.6), sharey=True)
for ax, f, lab in zip(axs, SF, ["Neuroticism", "Extraversion", "Openness", "Agreeableness", "Conscientiousness"]):
    z = (sds[f] - sds[f].mean()) / sds[f].std(ddof=0)
    m = sm.Logit(sds.success_high_low, sm.add_constant(np.c_[z, z ** 2])).fit(disp=0)
    g = np.linspace(sds[f].min(), sds[f].max(), 80); gz = (g - sds[f].mean()) / sds[f].std(ddof=0)
    p = 1 / (1 + np.exp(-(m.params.iloc[0] + m.params.iloc[1] * gz + m.params.iloc[2] * gz ** 2)))
    ax.plot(g, 100 * p, color=BLUE, lw=2); pk = g[np.argmax(p)]
    ax.axvline(pk, color=ORANGE, ls=":", lw=1); ax.set_title(f"{lab}\npeak ≈ {pk:.0f}", fontsize=9)
    ax.set_xlabel("score", fontsize=8)
axs[0].set_ylabel("% chance of success")
fig.suptitle("Every trait has a sweet spot (single-trait quadratic logits)", fontweight="bold", fontsize=11, y=1.08)
save("f10_sweet_spots")

# 9 ---- archetypes
fig, ax = plt.subplots(figsize=(7.2, 3.4)); tr = ["neuroticism_z", "extraversion_z", "openness_z", "agreeableness_z", "conscientiousness_z"]
x = np.arange(5); w = .2; cols = [GREEN, GOLD, ORANGE, RED]
for i, r in arch.iterrows():
    ax.bar(x + (i - 1.5) * w, r[tr].values.astype(float), w * .92, color=cols[i], label=f"{r.archetype.title()} (n={r.n}, success {r.success_rate_pct:.0f}%)")
ax.axhline(0, color=INK2, lw=.8); ax.set_xticks(x); ax.set_xticklabels(["Neuroticism", "Extraversion", "Openness", "Agree-\nableness", "Conscien-\ntiousness"])
ax.set_ylabel("cluster centre (z-score)"); ax.set_title("Four senior personality archetypes (k-means, k = 4)")
ax.legend(fontsize=8, loc="upper center", bbox_to_anchor=(.5, -.13), ncol=2); ax.grid(axis="x", visible=False); save("f11_archetypes")

# 10 ---- DA vs DS skill profile
skills = sorted(c for c in a.columns if c.startswith("skill_"))
prof = a.groupby("title_family")[skills].mean() * 100
gap = (prof.loc["Data Scientist"] - prof.loc["Data Analyst"]).sort_values()
pick = pd.concat([gap.head(5), gap.tail(5)])
fig, ax = plt.subplots(figsize=(6.6, 3.6))
ax.barh([nice(i.replace("skill_", "")) for i in pick.index], pick.values, color=np.where(pick > 0, BLUE, ORANGE), height=.6)
ax.axvline(0, color=INK2, lw=.8); ax.set_xlabel("percentage-point difference in postings listing the skill")
ax.set_title("Data Scientist vs Data Analyst postings:\nwhich skills each asks for more"); ax.grid(axis="y", visible=False)
ax.text(.98, .04, "← Data Analyst asks more   Data Scientist asks more →", transform=ax.transAxes, ha="right", fontsize=8, color=INK2)
save("f12_da_vs_ds")
cos = float(np.dot(prof.loc["Data Analyst"], prof.loc["Data Scientist"]) / (np.linalg.norm(prof.loc["Data Analyst"]) * np.linalg.norm(prof.loc["Data Scientist"])))
extra["cosine_da_ds"] = round(cos, 3)

json.dump(extra, open(RESULTS / "report_extra.json", "w"), indent=1)
print("saved -> figures/report/*.png, results/report_extra.json")
