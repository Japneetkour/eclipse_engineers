"""Step 7 - The title ladder in the Data Science Jobs file.
Does the label on the job (Data Analyst -> Data Scientist -> Senior ...) move pay even when the
required experience is the same?  OLS on log(avg_salary) with HC3 robust errors, plus the
'senior' premium inside each role and a demand-vs-pay table (where the jobs are vs where the money is)."""

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy import stats

from paths import CLEAN, RESULTS

d = pd.read_csv(CLEAN / "dsjobs_clean.csv")
d["log_sal"] = np.log(d["avg_salary"])
pct = lambda b: (np.exp(b) - 1) * 100

print("=" * 110)
print("TITLE LADDER - dsjobs_clean.csv (company x title rows, avg_salary in lakhs/yr)")
print("=" * 110)
print(f"n = {len(d)} rows   companies = {d.company_name.nunique()}   titles = {d.job_title.nunique()}")

# ------------------------------------------------- 1) demand vs pay
tab = (d.groupby("job_title")
         .agg(rows=("avg_salary", "size"), postings=("num_of_jobs", "sum"),
              median_salary=("avg_salary", "median"), median_min_exp=("min_experience", "median"))
         .sort_values("median_salary", ascending=False))
tab["share_of_postings_pct"] = 100 * tab.postings / tab.postings.sum()
print("\nDEMAND vs PAY by title")
print(tab.round(1).to_string())
rho, p = stats.spearmanr(tab.postings, tab.median_salary)
print(f"Spearman(postings, median salary) across titles = {rho:+.2f} (p = {p:.3f})")

# ------------------------------------------------- 2) OLS: same experience, different label
m = smf.ols("log_sal ~ min_experience + C(job_title, Treatment('Data Analyst'))", data=d).fit(cov_type="HC3")
rows = []
for k, v in m.params.items():
    if "job_title" in k:
        t = k.split("[T.")[1].rstrip("]")
        lo, hi = m.conf_int().loc[k]
        rows.append(dict(job_title=t, premium_vs_data_analyst_pct=pct(v), ci_lo=pct(lo), ci_hi=pct(hi), p=m.pvalues[k]))
lad = pd.DataFrame(rows).sort_values("premium_vs_data_analyst_pct", ascending=False)
exp_pct = pct(m.params["min_experience"])
print(f"\nOLS log(salary) ~ experience + title (HC3)   R2 = {m.rsquared:.3f}   each extra year of required "
      f"experience = {exp_pct:+.1f}%")
print(lad.round(3).to_string(index=False))

# ------------------------------------------------- 3) the 'Senior' label inside each role
pairs = [("Data Analyst", "Senior Data Analyst"), ("Data Scientist", "Senior Data Scientist"),
         ("Data Engineer", "Senior Data Engineer"), ("Business Analyst", "Senior Business Analyst")]
coef = {t: 0.0 for t in ["Data Analyst"]}
coef.update({r.job_title: np.log(1 + r.premium_vs_data_analyst_pct / 100) for r in lad.itertuples()})
sen = []
for base, senior in pairs:
    raw_gap = tab.loc[senior, "median_salary"] / tab.loc[base, "median_salary"] - 1
    adj_gap = np.exp(coef[senior] - coef[base]) - 1
    exp_gap = tab.loc[senior, "median_min_exp"] - tab.loc[base, "median_min_exp"]
    sen.append(dict(role=base, raw_senior_premium_pct=100 * raw_gap, same_experience_premium_pct=100 * adj_gap,
                    extra_years_required=exp_gap))
sen = pd.DataFrame(sen)
print("\n'SENIOR' LABEL PREMIUM (raw median gap vs gap at the same required experience)")
print(sen.round(1).to_string(index=False))

print("\n" + "=" * 110)
print("FINAL ANSWER")
print("=" * 110)
top, bot = tab.index[0], tab.index[-1]
print(f"1. The label moves pay even at equal experience: a Senior Data Scientist posting pays "
      f"{lad.set_index('job_title').loc['Senior Data Scientist', 'premium_vs_data_analyst_pct']:+.0f}% vs a Data Analyst "
      f"posting asking for the same years (R2 = {m.rsquared:.2f}); each extra year adds {exp_pct:+.0f}%.")
print(f"2. Demand and pay point in opposite directions (Spearman {rho:+.2f}): Business Analyst + Data Analyst hold "
      f"{tab.loc[['Business Analyst', 'Data Analyst'], 'share_of_postings_pct'].sum():.0f}% of postings at medians of "
      f"{tab.loc['Business Analyst', 'median_salary']:.1f}L and {tab.loc['Data Analyst', 'median_salary']:.1f}L, while {top} "
      f"pays {tab.loc[top, 'median_salary']:.1f}L.")
print(f"3. 'Senior' is worth {sen.same_experience_premium_pct.min():.0f}-{sen.same_experience_premium_pct.max():.0f}% "
      f"on top of the base role at the same experience - the word itself carries pay.")

tab.round(2).to_csv(RESULTS / "dsjobs_demand_vs_pay.csv")
lad.round(4).to_csv(RESULTS / "dsjobs_title_ladder.csv", index=False)
sen.round(2).to_csv(RESULTS / "dsjobs_senior_premium.csv", index=False)
print("saved -> results/dsjobs_demand_vs_pay.csv, dsjobs_title_ladder.csv, dsjobs_senior_premium.csv")
