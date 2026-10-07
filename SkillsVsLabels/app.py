"""Skills vs Labels - interactive dashboard.   Run:  streamlit run app.py
(run `python run_all.py` once first, so results/ and models/ exist)"""
import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

import resume_parser as rp

ROOT = Path(__file__).resolve().parent
RES, CLEAN, MOD = ROOT / "results", ROOT / "data" / "clean", ROOT / "models"

st.set_page_config(page_title="Skills vs Labels", page_icon="📊", layout="wide")

# ---------------------------------------------------------------- style
BLUE, ORANGE, GREEN, GREY, RED = "#2a78d6", "#eb6834", "#1baf7a", "#a8a7a1", "#e34948"
st.markdown("""
<style>
  .block-container {padding-top: 1.6rem; max-width: 1200px;}
  h1, h2, h3 {letter-spacing: -0.01em;}
  .kpi {border: 1px solid rgba(128,128,128,.25); border-radius: 10px; padding: 14px 16px;}
  .kpi .v {font-size: 1.7rem; font-weight: 700; line-height: 1.1;}
  .kpi .l {font-size: .85rem; opacity: .75; margin-top: 4px;}
  .answer {border-left: 4px solid #2a78d6; padding: 6px 12px; margin: 6px 0 14px 0; background: rgba(42,120,214,.06);}
</style>""", unsafe_allow_html=True)


def kpi(col, value, label):
    col.markdown(f'<div class="kpi"><div class="v">{value}</div><div class="l">{label}</div></div>', unsafe_allow_html=True)


def answer(text):
    import re
    html = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    st.markdown(f'<div class="answer">{html}</div>', unsafe_allow_html=True)


def tidy(fig, h=420):
    fig.update_layout(height=h, margin=dict(l=10, r=10, t=40, b=10), template="plotly_white",
                      font=dict(size=13), legend=dict(orientation="h", y=-0.18))
    return fig


# ---------------------------------------------------------------- data
@st.cache_data
def load():
    need = ["skill_uplift_table.csv", "title_premium_table.csv", "experience_quantiles.csv", "jds_odds_ratios.csv",
            "sds_odds_ratios.csv", "sds_sweet_spots.csv", "dsjobs_demand_vs_pay.csv", "model_metrics.json"]
    missing = [n for n in need if not (RES / n).exists()]
    if missing:
        return None, missing
    D = {
        "skill": pd.read_csv(RES / "skill_uplift_table.csv", index_col=0),
        "title": pd.read_csv(RES / "title_premium_table.csv"),
        "expq": pd.read_csv(RES / "experience_quantiles.csv"),
        "expb": pd.read_csv(RES / "experience_breakpoints.csv"),
        "jor": pd.read_csv(RES / "jds_odds_ratios.csv", index_col=0),
        "sor": pd.read_csv(RES / "sds_odds_ratios.csv", index_col=0),
        "sweet": pd.read_csv(RES / "sds_sweet_spots.csv"),
        "arch": pd.read_csv(RES / "sds_archetypes.csv") if (RES / "sds_archetypes.csv").exists() else None,
        "dsd": pd.read_csv(RES / "dsjobs_demand_vs_pay.csv"),
        "ladder": pd.read_csv(RES / "dsjobs_title_ladder.csv"),
        "senior": pd.read_csv(RES / "dsjobs_senior_premium.csv"),
        "metrics": json.load(open(RES / "model_metrics.json")),
        "a": pd.read_csv(CLEAN / "analytics_clean.csv"),
        "jds": pd.read_csv(CLEAN / "jds_clean.csv"),
        "sds": pd.read_csv(CLEAN / "sds_clean.csv"),
    }
    return D, []


@st.cache_resource
def models():
    return {k: joblib.load(MOD / f"{k}_model.joblib") for k in ("salary", "hike", "success")}


D, missing = load()
if D is None:
    st.error("Results not found: " + ", ".join(missing) + ".  Run `python run_all.py` first, then reload this page.")
    st.stop()
MD = models()
MET = D["metrics"]

BANDS = [(0, 3, "₹0–3 L"), (3, 6, "₹3–6 L"), (6, 10, "₹6–10 L"), (10, 15, "₹10–15 L"), (15, 25, "₹15–25 L"), (25, 50, "₹25–50 L")]
band_of = lambda v: next((b[2] for b in BANDS if v < b[1]), BANDS[-1][2])
nice = lambda s: s.replace("_", " ")

# ---------------------------------------------------------------- sidebar
st.sidebar.title("Skills vs Labels")
st.sidebar.caption("SAS CU Hackathon · data-science careers")
page = st.sidebar.radio("Go to", ["📄 My resume", "Overview", "Data & cleaning", "Q1 · Which skills pay", "Q2 · Do labels pay",
                                  "Q3 · Experience curve", "Q4 · Junior hike simulator", "Q5 · Senior success simulator",
                                  "Salary estimator"])
st.sidebar.markdown("---")
st.sidebar.caption(f"Postings analysed: {len(D['a']):,}  \nJuniors: {len(D['jds'])} · Seniors: {len(D['sds'])}")

# ================================================================ pages
if page == "📄 My resume":
    st.title("📄 Your resume, answered by the data")
    st.markdown("Upload your resume and the five questions are answered **for you**, using the same 14,800 postings, "
                "118 juniors and 161 seniors behind the rest of this dashboard. Nothing leaves your computer.")
    SAMPLE = ("Priya Sharma\nData Analyst\nBengaluru, India | priya@example.com\n\nSUMMARY\n3 years of experience turning data "
              "into decisions.\n\nEXPERIENCE\nData Analyst, Acme Retail  Jan 2022 - Present\n- Built Tableau and Power BI dashboards "
              "for 40 stakeholders\n- Wrote SQL (PostgreSQL) and Python (pandas) pipelines; ran A/B tests and regression analysis\n"
              "Junior Analyst, Beta Finance  Jul 2021 - Dec 2021\n- Excel reporting, pivot tables, financial analysis\n\nSKILLS\n"
              "SQL, Python, Excel, Tableau, Power BI, Statistics, Hypothesis testing, Data analysis, Storytelling")
    c1, c2 = st.columns([1.4, 1])
    up = c1.file_uploader("Resume (PDF, DOCX or TXT)", type=["pdf", "docx", "txt"])
    pasted = c2.text_area("…or paste the text", height=110, placeholder="Paste resume text here")
    use_sample = c2.button("Try a sample resume")
    text, src = "", None
    if up is not None:
        try:
            text, src = rp.extract_text(up.name, up.getvalue()), up.name
        except Exception as e:
            st.error(f"Could not read {up.name}: {e}. Try another format or paste the text.")
    elif pasted.strip():
        text, src = pasted, "pasted text"
    elif use_sample or st.session_state.get("cv_src") == "sample":
        text, src = SAMPLE, "sample"
    if not text.strip():
        st.info("Upload a resume to begin. Scanned (image-only) PDFs have no text - paste the text instead.")
        st.stop()

    # a new resume resets the editable fields below
    if (st.session_state.get("cv_src") != src or st.session_state.get("cv_len") != len(text)
            or "cv_title" not in st.session_state):  # widget keys are dropped when you visit another page
        P = rp.parse_resume(text)
        st.session_state.update(cv_src=src, cv_len=len(text), cv_title=P["title_family"],
                                cv_city=P["city"], cv_years=float(min(P["years"], 20.0)),
                                cv_skills=[nice(s) for s in P["skills"]], cv_P=P,
                                **{f"cv_j_{k}": v for k, v in P["junior"].items()})
    P = st.session_state.cv_P

    m = MD["salary"]
    cities = m["cities"][:15] if "Other" in m["cities"][:15] else m["cities"][:15] + ["Other"]
    all_sk = [nice(s.replace("skill_", "")) for s in m["skills"]]
    st.markdown("### 1 · What we read from your resume")
    st.caption(f"From **{src}** ({P['words']} words). Correct anything that is wrong - every answer below updates.")
    e1, e2, e3 = st.columns(3)
    title = e1.selectbox("Title family", m["titles"], key="cv_title",
                         help=f"Detected from: “{P['title_line']}”" if P["title_line"] else "No title line found; guessed from the text")
    city = e2.selectbox("City", cities, key="cv_city")
    years = e3.slider("Years of experience", 0.0, 20.0, step=0.5, key="cv_years", help=f"Source: {P['years_source']}")
    chosen = st.multiselect("Skills found (from the 30 the salary data tracks)", all_sk, key="cv_skills")
    with st.expander("Show the extracted resume text"):
        st.text(text[:5000])

    def predict(t=title, c=city, y=years, sk=chosen):
        row = {"title_family": t, "city": c, "avg_exp": y}
        row.update({s: int(nice(s.replace("skill_", "")) in sk) for s in m["skills"]})
        return float(np.exp(m["model"].predict(pd.DataFrame([row]))[0]))

    est = predict()
    sk_tab = D["skill"]
    mine = [s.replace(" ", "_") for s in chosen]
    # skills worth adding: reliable positive premium in the regression, ranked by what the model says for *this* profile
    cand = sk_tab[(sk_tab.reliable) & (sk_tab.uplift_pct > 0) & (~sk_tab.index.isin(mine))].index
    adds = sorted(((s, predict(sk=chosen + [nice(s)]) - est, sk_tab.loc[s, "uplift_pct"]) for s in cand),
                  key=lambda r: -(r[2] + 100 * r[1] / est))[:5]
    t_tab = D["title"].set_index("title_family")
    alt = pd.DataFrame([(t, predict(t=t)) for t in m["titles"]], columns=["title", "est"]).sort_values("est")
    best_t = alt.iloc[-1]
    q = D["expq"].copy(); q = q[q.yr_group.astype(str).str.isdigit()]; q["yr"] = q.yr_group.astype(int)
    jm = MD["hike"]
    jvals = {f: st.session_state[f"cv_j_{f}"] for f in jm["feats"]}
    p_hike = jm["model"].predict_proba(pd.DataFrame([jvals]))[0, 1]

    k = st.columns(4)
    kpi(k[0], f"₹{est:.1f} L", f"estimated salary · band {band_of(est)}")
    kpi(k[1], f"{len(chosen)} / 30", "tracked skills on your resume")
    kpi(k[2], f"{t_tab.loc[title, 'premium_B_pct']:+.0f}%", f"what the “{title}” label adds after skills")
    kpi(k[3], f"{years:.1f} yrs", "before the 6.5-yr flattening" if years < 6.5 else "past the 6.5-yr flattening")

    # ------------------------------------------------ the five answers, personalised
    st.markdown("### 2 · The five questions, answered for you")
    tabs = st.tabs(["Q1 Your skills", "Q2 Your title", "Q3 Your experience", "Q4 Your hike chances", "Q5 Your traits"])
    A = {}

    with tabs[0]:
        have = sk_tab[sk_tab.index.isin(mine)].sort_values("uplift_pct")
        if len(have):
            col = np.where(~have.reliable, GREY, np.where(have.uplift_pct > 0, BLUE, RED))
            fig = go.Figure(go.Bar(x=have.uplift_pct, y=[nice(i) for i in have.index], orientation="h", marker_color=col))
            fig.add_vline(x=0, line_color="#555")
            st.plotly_chart(tidy(fig, 120 + 28 * len(have)).update_layout(title="Pay premium of the skills you have (grey = not reliable)",
                                                                          xaxis_title="% pay vs postings without the skill"), width="stretch")
        paid = have[have.reliable & (have.uplift_pct > 0)]
        pen = have[have.reliable & (have.uplift_pct < 0)]
        A["Q1"] = (f"Of your {len(chosen)} tracked skills, **{len(paid)} carry a reliable pay premium**"
                   + (f" ({', '.join(nice(i) for i in paid.index[::-1][:4])})" if len(paid) else "")
                   + (f"; {', '.join(nice(i) for i in pen.index)} {'is' if len(pen) == 1 else 'are'} linked to lower-paid postings - lead with your stronger skills" if len(pen) else "")
                   + ". " + (f"The best skill to add is **{nice(adds[0][0])}** ({adds[0][2]:+.0f}% in the regression, "
                             f"≈ {sk_tab.loc[adds[0][0], 'yrs_equivalent']:.1f} years of experience)." if adds else "You already list every reliably-paid skill."))
        answer(A["Q1"])
        if adds:
            st.markdown("**Skills worth adding next**")
            st.dataframe(pd.DataFrame([{"skill": nice(s), "premium in the data": f"{u:+.0f}%",
                                        "worth (years of experience)": round(sk_tab.loc[s, "yrs_equivalent"], 1),
                                        "your estimate with it": f"₹{est + g:.1f} L ({g:+.1f})"} for s, g, u in adds]),
                         width="stretch", hide_index=True)

    with tabs[1]:
        fig = px.bar(alt, x="est", y="title", orientation="h", color=np.where(alt.title == title, "your title", "other titles"),
                     color_discrete_map={"your title": BLUE, "other titles": GREY}, title="Your exact profile under each job title")
        st.plotly_chart(tidy(fig, 330).update_xaxes(title="₹ lakh / year").update_yaxes(title=None), width="stretch")
        gap = best_t.est - est
        A["Q2"] = (f"With your skills and experience, the **{title}** label is estimated at ₹{est:.1f} L. "
                   + (f"The same profile under **{best_t.title}** is estimated at ₹{best_t.est:.1f} L ({gap:+.1f} L). "
                      "Labels pay: even after all 30 skills, title premiums only shrink by about a third - so the title you apply "
                      "for matters, as long as your skills honestly support it." if gap > 0.3 else
                      "That is already the best-paid label for your profile - keep it on your applications."))
        answer(A["Q2"])

    with tabs[2]:
        qq = q[q.n >= 50]
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=qq.yr, y=qq.p75, mode="lines", line=dict(width=0), showlegend=False, hoverinfo="skip"))
        fig.add_trace(go.Scatter(x=qq.yr, y=qq.p25, mode="lines", fill="tonexty", fillcolor="rgba(42,120,214,.15)", line=dict(width=0), name="middle 50%"))
        fig.add_trace(go.Scatter(x=qq.yr, y=qq["median"], line=dict(color=BLUE, width=3), name="median posting"))
        fig.add_trace(go.Scatter(x=[years], y=[est], mode="markers", marker=dict(size=16, color=ORANGE, symbol="star"), name="you"))
        fig.add_vline(x=6.5, line_dash="dash", line_color=GREY, annotation_text="growth slows ≈ 6.5 yrs")
        st.plotly_chart(tidy(fig, 400).update_layout(xaxis_title="years of experience", yaxis_title="₹ lakh / year"), width="stretch")
        nxt = predict(y=min(years + 2, 20))
        A["Q3"] = (f"At {years:.1f} years you are in the **fast-growth phase** (about +36% a year until ~6.5 years). "
                   f"Two more years on the same profile → about ₹{nxt:.1f} L. Experience is your biggest lever right now."
                   if years < 6.5 else
                   f"At {years:.1f} years you are **past the knee** - pay grows only ~7% a year from experience alone "
                   f"(two more years → about ₹{nxt:.1f} L). From here, a better-paid title or skill set moves pay more than time does.")
        answer(A["Q3"])

    with tabs[3]:
        lab = {"big_data_skills": "Big data", "maths_stats_skills": "Maths & stats", "coding_skills": "Coding",
               "ai_and_ml_skills": "AI & ML", "dashboard_and_storytelling_skills": "Dashboard & storytelling"}
        if years > 4:
            st.caption("This model was trained on junior data scientists; with more than 4 years, read it as a rough guide.")
        st.caption("Scores (1-5) are estimated from how many related tools/topics your resume mentions. Adjust them if needed.")
        cs = st.columns(5)
        for i, f in enumerate(jm["feats"]):
            cs[i].slider(lab[f], 1.0, 5.0, step=0.1, key=f"cv_j_{f}")
        gains = {}
        for f in jm["feats"]:
            y2 = dict(jvals); y2[f] = min(5.0, jvals[f] + 0.5)
            gains[lab[f]] = 100 * (jm["model"].predict_proba(pd.DataFrame([y2]))[0, 1] - p_hike)
        lever = max(gains, key=gains.get)
        st.metric("Chance of a HIGH salary hike", f"{100 * p_hike:.0f}%", f"{100 * (p_hike - jm['base_rate']):+.0f} pts vs average junior")
        A["Q4"] = (f"Your estimated chance of a high salary hike is **{100 * p_hike:.0f}%**. The biggest lever is "
                   f"**{lever}** (+0.5 → {gains[lever]:+.0f} pts). In the data, maths & stats and storytelling matter most; coding alone does not.")
        answer(A["Q4"])

    with tabs[4]:
        sm = MD["success"]
        tl = {"neuroticism": "Neuroticism (stress-prone)", "extraversion": "Extraversion", "openness_to_experience": "Openness",
              "agreeableness": "Agreeableness", "conscientiousness": "Conscientiousness"}
        st.caption("A resume can't show personality. Rate yourself 1-9 on each trait (5 = average); it is mapped onto the senior "
                   "data's scale. Descriptive of this sample, not a hiring test.")
        cs = st.columns(5)
        rate = {f: cs[i].slider(tl[f], 1, 9, 5, key=f"cv_s_{f}") for i, f in enumerate(sm["feats"])}
        # 5 = the sample average, 1 and 9 sit about 2 SD (range/2) either side; clipped to the observed range
        xs = {f: float(np.clip(sm["means"][f] + (rate[f] - 5) / 4 * (sm["maxs"][f] - sm["mins"][f]) / 2,
                               sm["mins"][f], sm["maxs"][f])) for f in sm["feats"]}
        p_s = sm["model"].predict_proba(pd.DataFrame([xs]))[0, 1]
        sw = D["sweet"].set_index("trait")["peak_raw"].rename({"openness": "openness_to_experience"})
        far = max(sm["feats"], key=lambda f: abs(xs[f] - sw[f]))
        direction = "lower" if xs[far] > sw[far] else "higher"
        st.metric("Chance of HIGH success (senior data)", f"{100 * p_s:.0f}%", f"{100 * (p_s - sm['base_rate']):+.0f} pts vs base rate")
        A["Q5"] = (f"With your self-ratings the senior-success model gives **{100 * p_s:.0f}%**. Every trait has a sweet spot; "
                   f"you are furthest from it on **{tl[far].split(' (')[0]}** (a bit {direction} would be closer to the peak). "
                   "Conscientiousness and openness matter most.")
        answer(A["Q5"])

    # ------------------------------------------------ ask a question
    st.markdown("### 3 · Ask a question about your resume")
    ROUTES = [("Q1", r"skill|learn|course|add|improve|upskill|certif"),
              ("Q2", r"title|label|role|designation|apply|switch|position|job name"),
              ("Q3", r"experience|year|growth|future|later|senior|promotion"),
              ("Q4", r"hike|increment|appraisal|junior|fresher"),
              ("Q5", r"personality|trait|success|succeed|soft"),
              ("PAY", r"salary|pay|earn|worth|ctc|package|lakh|money|offer")]
    sugg = ["How much should I earn?", "Which skill should I learn next?", "Should I apply with a different title?",
            "Will my salary keep growing?", "How do I get a bigger hike?"]
    pick = st.pills("Try one", sugg, selection_mode="single") if hasattr(st, "pills") else None
    qtext = st.text_input("Your question", value=pick or "", placeholder="e.g. Which skill would raise my pay the most?")
    if qtext.strip():
        ql = qtext.lower()
        hits = [k for k, p in ROUTES if re.search(p, ql)]
        A["PAY"] = (f"Your estimated salary is **₹{est:.1f} L / year** (band {band_of(est)}) as a {title} in {city} with "
                    f"{years:.1f} years and {len(chosen)} tracked skills. Postings are banded, so treat it as a range "
                    f"(typical error about ±{MET['salary']['typical_error_pct']:.0f}%).")
        if not hits:
            st.write("I couldn't match that to the data - here is everything it can tell you:")
            hits = ["PAY", "Q1", "Q2", "Q3", "Q4"]
        for h in dict.fromkeys(hits):
            answer(A[h])

    # ------------------------------------------------ action plan + download
    st.markdown("### 4 · Your action plan")
    plan = [f"**Salary today:** about ₹{est:.1f} L ({band_of(est)}) as a {title} in {city}."]
    if adds:
        plan.append(f"**Add skills:** {', '.join(nice(s) for s, _, _ in adds[:3])} - each reliably paid in the postings.")
    if best_t.est - est > 0.3:
        plan.append(f"**Target title:** {best_t.title} roles price the same profile at ₹{best_t.est:.1f} L.")
    plan.append("**Experience:** " + ("you are on the steep part of the curve - stay and grow." if years < 6.5
                                     else "growth from tenure has slowed - move on title or skills."))
    plan.append(f"**Junior hike lever:** {lever}.")
    for line in plan:
        st.markdown("- " + line)
    report = "# Skills vs Labels - resume report\n\n" + \
             f"Profile: {title}, {city}, {years:.1f} yrs, skills: {', '.join(chosen) or 'none tracked'}\n\n" + \
             "\n\n".join(f"## {k}\n{re.sub(r'[*]', '', v)}" for k, v in A.items()) + \
             "\n\n## Action plan\n" + "\n".join("- " + re.sub(r"[*]", "", l) for l in plan) + \
             "\n\nEstimates come from job-posting salary bands and small survey samples; use them as a guide, not an offer.\n"
    st.download_button("Download my report (.md)", report, file_name="resume_report.md")

elif page == "Overview":
    st.title("Skills vs Labels")
    st.markdown("#### Is a data professional paid for what they *can do*, or for what their job is *called*?")
    t = D["title"].set_index("title_family")
    sk = D["skill"]
    c = st.columns(4)
    kpi(c[0], f"{t.loc['ML Engineer', 'premium_B_pct']:+.0f}%", "ML Engineer title premium left after controlling for 30 skills")
    kpi(c[1], f"{100 - t.premium_gone_pct.dropna().mean():.0f}%", "of the average title premium survives the skill controls")
    kpi(c[2], "≈ 6.5 yrs", "experience where salary growth flattens")
    kpi(c[3], f"{MET['success']['roc_auc']:.2f}", "senior-success model AUC (cross-validated)")
    st.markdown("### Five questions, five answers")
    best = sk.head(3).index.tolist()
    answer(f"**Q1 Which skills pay?** Holding title, city and experience fixed, {nice(best[0])} "
           f"({sk.iloc[0].uplift_pct:+.0f}%), {nice(best[1])} ({sk.iloc[1].uplift_pct:+.0f}%) and {nice(best[2])} "
           f"({sk.iloc[2].uplift_pct:+.0f}%) carry the largest premiums; Excel ({sk.loc['excel', 'uplift_pct']:+.0f}%) and SEO "
           f"({sk.loc['seo', 'uplift_pct']:+.0f}%) carry penalties; {int((~sk.reliable).sum())} of 30 skills show no reliable effect.")
    answer(f"**Q2 Do labels pay?** Yes. Adding all 30 skills shrinks title premiums by only about a third: ML Engineer keeps "
           f"{t.loc['ML Engineer', 'premium_B_pct']:+.0f}% and Data Scientist {t.loc['Data Scientist', 'premium_B_pct']:+.0f}%. "
           f"In the DS Jobs file a Senior Data Scientist earns "
           f"{D['ladder'].set_index('job_title').loc['Senior Data Scientist', 'premium_vs_data_analyst_pct']:+.0f}% over a Data Analyst at the same required experience.")
    answer("**Q3 When does pay growth slow?** About +36% a year until ~6.5 years of experience, then about +7% a year.")
    jo = D["jor"]
    answer(f"**Q4 What earns a junior a high hike?** Maths & stats (odds ×{jo.loc['maths_stats', 'odds_ratio_per_1SD']:.1f} per SD) "
           f"and storytelling (×{jo.loc['storytelling', 'odds_ratio_per_1SD']:.1f}); coding alone is not significant. "
           f"Model AUC {MET['hike']['roc_auc']:.2f}.")
    so = D["sor"]
    answer(f"**Q5 What makes a senior succeed?** Conscientiousness (×{so.loc['conscientiousness', 'OR_per_1SD']:.0f} per SD) and "
           f"openness (×{so.loc['openness', 'OR_per_1SD']:.0f}) dominate, and every trait has a sweet spot - more is not always better.")
    st.caption("Use the menu on the left to explore each question, or try the three simulators.")

elif page == "Data & cleaning":
    st.title("Data & cleaning")
    raw = {"Analytics Jobs": 15841, "Data Science Jobs": 1602, "JDS Skill Traits": 139, "SDS Personality Traits": 161}
    clean = {"Analytics Jobs": len(D["a"]), "Data Science Jobs": len(D["dsd"]) and int(D["dsd"].rows.sum()),
             "JDS Skill Traits": len(D["jds"]), "SDS Personality Traits": len(D["sds"])}
    df = pd.DataFrame({"raw rows": raw, "clean rows": clean})
    df["dropped"] = df["raw rows"] - df["clean rows"]
    st.dataframe(df, width="stretch")
    st.markdown("**Main fixes:** duplicate postings removed (1,041); experience text → numbers; salary bands → midpoints; "
                "2,273 location spellings standardised; titles grouped into 7 families; key-skill text split into the 30 most "
                "common skills; 95 company-name variants merged; 21 duplicate JDS records dropped; messy column names fixed.")
    logs = sorted((RES / "logs").glob("0[12]_*.txt"))
    for p in logs:
        with st.expander(f"Cleaning log · {p.stem}"):
            st.code(p.read_text()[:6000])
    a = D["a"]
    c1, c2 = st.columns(2)
    fam = a.title_family.value_counts().reset_index()
    c1.plotly_chart(tidy(px.bar(fam, x="count", y="title_family", orientation="h", title="Postings per title family",
                                color_discrete_sequence=[BLUE]).update_yaxes(categoryorder="total ascending", title=None)), width="stretch")
    band = a.salary_avg_lakh.map(band_of).value_counts().reindex([b[2] for b in BANDS]).reset_index()
    c2.plotly_chart(tidy(px.bar(band, x="salary_avg_lakh", y="count", title="Postings per salary band",
                                color_discrete_sequence=[BLUE]).update_xaxes(title=None)), width="stretch")

elif page == "Q1 · Which skills pay":
    st.title("Q1 · Which skills pay?")
    st.caption("OLS on log(salary) with title family, city and experience held fixed (n = 14,800). Bars show the % pay "
               "difference when a posting lists the skill; whiskers are 95% confidence intervals.")
    sk = D["skill"].copy()
    only = st.toggle("Show only statistically reliable skills", value=False)
    if only:
        sk = sk[sk.reliable]
    sk = sk.sort_values("uplift_pct")
    col = np.where(~sk.reliable, GREY, np.where(sk.uplift_pct > 0, BLUE, RED))
    fig = go.Figure(go.Bar(x=sk.uplift_pct, y=[nice(i) for i in sk.index], orientation="h", marker_color=col,
                           error_x=dict(type="data", symmetric=False, array=sk.ci_hi_pct - sk.uplift_pct,
                                        arrayminus=sk.uplift_pct - sk.ci_lo_pct, color="#777", thickness=1),
                           customdata=np.c_[sk.postings, sk.yrs_equivalent, sk.p_value],
                           hovertemplate="%{y}: %{x:+.1f}%<br>postings %{customdata[0]}<br>= %{customdata[1]:.2f} yrs of experience<br>p = %{customdata[2]:.3f}<extra></extra>"))
    fig.add_vline(x=0, line_color="#555")
    st.plotly_chart(tidy(fig, 760).update_layout(title="Pay uplift by skill (grey = not reliable)", xaxis_title="% pay vs postings without the skill"),
                    width="stretch")
    top = D["skill"].head(3)
    answer(f"The top three skills are each worth about **{top.yrs_equivalent.min():.1f}–{top.yrs_equivalent.max():.1f} years of experience**. "
           "But the gradient-boosting cross-check ranks skills very differently (Spearman −0.22), so individual skill premiums are modest and noisy compared with title and experience.")

elif page == "Q2 · Do labels pay":
    st.title("Q2 · Do labels (job titles) pay?")
    t = D["title"].sort_values("premium_A_pct")
    fig = go.Figure()
    for _, r in t.iterrows():
        fig.add_shape(type="line", x0=r.premium_A_pct, x1=r.premium_B_pct, y0=r.title_family, y1=r.title_family, line=dict(color="#bbb", width=3))
    fig.add_trace(go.Scatter(x=t.premium_A_pct, y=t.title_family, mode="markers", name="Title only (Model A)", marker=dict(size=13, color=GREY)))
    fig.add_trace(go.Scatter(x=t.premium_B_pct, y=t.title_family, mode="markers", name="After 30 skills (Model B)", marker=dict(size=13, color=BLUE)))
    fig.add_vline(x=0, line_color="#555")
    st.plotly_chart(tidy(fig, 430).update_layout(title="Title premium vs the average title, before and after controlling for skills",
                                                 xaxis_title="% pay vs average title"), width="stretch")
    answer("Skills explain only part of the title gap: R² rises from 0.480 to 0.493 when all 30 skills are added, and 6 of 7 title "
           "premiums stay significant. **The label itself carries pay.**")
    c1, c2 = st.columns(2)
    lad = pd.concat([pd.DataFrame([{"job_title": "Data Analyst", "premium_vs_data_analyst_pct": 0}]), D["ladder"]]).sort_values("premium_vs_data_analyst_pct")
    c1.plotly_chart(tidy(px.bar(lad, x="premium_vs_data_analyst_pct", y="job_title", orientation="h", color_discrete_sequence=[BLUE],
                                title="DS Jobs: premium vs Data Analyst at the same experience").update_yaxes(title=None)
                         .update_xaxes(title="%"), 420), width="stretch")
    dsd = D["dsd"]
    c2.plotly_chart(tidy(px.scatter(dsd, x="share_of_postings_pct", y="median_salary", text="job_title", size="rows",
                                    color_discrete_sequence=[ORANGE], title="Where the jobs are vs where the money is")
                         .update_traces(textposition="top center", textfont_size=10)
                         .update_xaxes(title="% of all postings").update_yaxes(title="median salary (₹ L)"), 420), width="stretch")
    st.dataframe(D["senior"].rename(columns={"role": "base role", "raw_senior_premium_pct": "raw 'Senior' premium %",
                                            "same_experience_premium_pct": "premium at same experience %",
                                            "extra_years_required": "extra years asked"}).round(1), width="stretch", hide_index=True)

elif page == "Q3 · Experience curve":
    st.title("Q3 · When does salary growth flatten?")
    q = D["expq"].rename(columns={"Unnamed: 0": "yr_group"})
    q = q[(q.yr_group != "21+") & (q.n >= 50)].copy(); q["yr"] = q.yr_group.astype(int)
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=q.yr, y=q.p75, mode="lines", line=dict(width=0), showlegend=False, hoverinfo="skip"))
    fig.add_trace(go.Scatter(x=q.yr, y=q.p25, mode="lines", fill="tonexty", fillcolor="rgba(42,120,214,.15)", line=dict(width=0), name="25th–75th percentile"))
    fig.add_trace(go.Scatter(x=q.yr, y=q["median"], line=dict(color=BLUE, width=3), mode="lines+markers", name="median"))
    fig.add_vline(x=6.5, line_dash="dash", line_color=ORANGE, annotation_text="break ≈ 6.5 yrs", annotation_position="top left")
    st.plotly_chart(tidy(fig, 460).update_layout(title="Salary by years of experience (band midpoints, ₹ lakh; years with ≥ 50 postings)",
                                                 xaxis_title="years of experience", yaxis_title="₹ lakh / year"), width="stretch")
    answer("Piecewise regression finds the break at **6.5 years (95% CI 6.0–7.0)**: about **+36% a year before**, **+7% after**. "
           "Top earners keep climbing until ~10 years. The flattening at the top is partly an artefact: 26% of 10+ year postings already "
           "sit in the highest ₹25–50 L band, so higher pay is never recorded.")
    st.dataframe(D["expb"].round(1), width="stretch", hide_index=True)

elif page == "Q4 · Junior hike simulator":
    st.title("Q4 · What earns a junior data scientist a high salary hike?")
    m = MD["hike"]
    lab = {"big_data_skills": "Big data", "maths_stats_skills": "Maths & stats", "coding_skills": "Coding",
           "ai_and_ml_skills": "AI & ML", "dashboard_and_storytelling_skills": "Dashboard & storytelling"}
    c1, c2 = st.columns([1, 1.3])
    with c1:
        st.markdown("**Set the skill scores (1–5)**")
        x = {f: st.slider(lab[f], 1.0, 5.0, float(round(m["means"][f], 1)), 0.1) for f in m["feats"]}
        p = m["model"].predict_proba(pd.DataFrame([x]))[0, 1]
        st.metric("Chance of a HIGH salary hike", f"{100 * p:.0f}%", f"{100 * (p - m['base_rate']):+.0f} pts vs average junior")
        gains = {}
        for f in m["feats"]:
            y = dict(x); y[f] = min(5.0, x[f] + 0.5)
            gains[lab[f]] = 100 * (m["model"].predict_proba(pd.DataFrame([y]))[0, 1] - p)
        best = max(gains, key=gains.get)
        st.info(f"Biggest lever right now: **+0.5 in {best}** → {gains[best]:+.0f} percentage points.")
    with c2:
        jo = D["jor"].sort_values("odds_ratio_per_1SD")
        fig = go.Figure(go.Scatter(x=jo.odds_ratio_per_1SD, y=[nice(i) for i in jo.index], mode="markers",
                                   marker=dict(size=12, color=np.where(jo.reliable, BLUE, GREY)),
                                   error_x=dict(type="data", symmetric=False, array=jo.ci_hi - jo.odds_ratio_per_1SD,
                                                arrayminus=jo.odds_ratio_per_1SD - jo.ci_lo, color="#888")))
        fig.add_vline(x=1, line_dash="dash", line_color="#555")
        st.plotly_chart(tidy(fig, 380).update_layout(title="Odds ratio per +1 SD (95% CI)", xaxis_type="log"), width="stretch")
    mm = MET["hike"]
    st.caption(f"Logistic regression on {mm['rows']} juniors · repeated 5-fold CV AUC {mm['roc_auc']:.3f} ± {mm['roc_auc_sd']:.3f}, "
               f"accuracy {100 * mm['accuracy']:.0f}% vs {100 * mm['majority_guess']:.0f}% by guessing.")

elif page == "Q5 · Senior success simulator":
    st.title("Q5 · Which personality traits mark a successful senior?")
    m = MD["success"]
    lab = {"neuroticism": "Neuroticism", "extraversion": "Extraversion", "openness_to_experience": "Openness",
           "agreeableness": "Agreeableness", "conscientiousness": "Conscientiousness"}
    c1, c2 = st.columns([1, 1.3])
    with c1:
        st.markdown("**Set the Big Five scores (normalised)**")
        x = {f: st.slider(lab[f], int(m["mins"][f]), int(m["maxs"][f]), int(round(m["means"][f]))) for f in m["feats"]}
        p = m["model"].predict_proba(pd.DataFrame([x]))[0, 1]
        st.metric("Predicted chance of HIGH success", f"{100 * p:.0f}%", f"{100 * (p - m['base_rate']):+.0f} pts vs base rate")
        sw = D["sweet"].set_index("trait")
        st.markdown("**Sweet spots** (peak of each trait's curve): " +
                    ", ".join(f"{t} ≈ {sw.loc[t, 'peak_raw']:.0f}" for t in sw.index))
    with c2:
        sel = st.selectbox("Show the curve for", list(lab.values()), index=4)
        f = [k for k, v in lab.items() if v == sel][0]
        grid = np.linspace(m["mins"][f], m["maxs"][f], 60)
        Q = pd.DataFrame([x] * len(grid)); Q[f] = grid
        pr = m["model"].predict_proba(Q)[:, 1]
        fig = go.Figure(go.Scatter(x=grid, y=100 * pr, line=dict(color=BLUE, width=3)))
        fig.add_vline(x=x[f], line_dash="dot", line_color=ORANGE, annotation_text="your setting")
        st.plotly_chart(tidy(fig, 380).update_layout(title=f"Success chance as {sel} changes (other traits as set)",
                                                     xaxis_title=sel, yaxis_title="% chance", yaxis_range=[0, 100]), width="stretch")
    if D["arch"] is not None:
        st.markdown("**Personality archetypes (k-means)**")
        st.dataframe(D["arch"], width="stretch", hide_index=True)
    mm = MET["success"]
    st.caption(f"Logistic regression with squared terms on {mm['rows']} seniors · repeated 5-fold CV AUC {mm['roc_auc']:.3f}, "
               f"accuracy {100 * mm['accuracy']:.0f}% vs {100 * mm['majority_guess']:.0f}% by guessing. Descriptive of this sample, "
               "not a hiring test.")

elif page == "Salary estimator":
    st.title("Salary estimator")
    m = MD["salary"]
    c1, c2 = st.columns([1, 1.2])
    with c1:
        title = st.selectbox("Title family", m["titles"], index=m["titles"].index("Data Scientist") if "Data Scientist" in m["titles"] else 0)
        city = st.selectbox("City", m["cities"][:15])
        exp = st.slider("Years of experience", 0.0, 20.0, 3.0, 0.5)
        chosen = st.multiselect("Skills listed", [nice(s.replace("skill_", "")) for s in m["skills"]], default=["python", "sql"])
    row = {"title_family": title, "city": city, "avg_exp": exp}
    row.update({s: int(nice(s.replace("skill_", "")) in chosen) for s in m["skills"]})
    est = float(np.exp(m["model"].predict(pd.DataFrame([row]))[0]))
    with c2:
        st.metric("Estimated salary", f"₹{est:.1f} L / year", f"band {band_of(est)}")
        alt = []
        for t in m["titles"]:
            r2 = dict(row); r2["title_family"] = t
            alt.append((t, float(np.exp(m["model"].predict(pd.DataFrame([r2]))[0]))))
        alt = pd.DataFrame(alt, columns=["title", "est"]).sort_values("est")
        fig = px.bar(alt, x="est", y="title", orientation="h", color=np.where(alt.title == title, "your title", "other titles"),
                     color_discrete_map={"your title": BLUE, "other titles": GREY}, title="Same person, different label")
        st.plotly_chart(tidy(fig, 330).update_xaxes(title="₹ lakh / year").update_yaxes(title=None), width="stretch")
    mm = MET["salary"]
    st.caption(f"Gradient boosting on {mm['rows']:,} postings · 5-fold CV R² {mm['cv_r2']:.2f}. Salaries are band midpoints, "
               "so treat the estimate as a band, not an exact offer.")
