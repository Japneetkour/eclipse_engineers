// Skills vs Labels — Round 2 approach note (.docx)
// usage: node build_report.js <out.docx> [toc.json]
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel,
  WidthType, ShadingType, BorderStyle, PageBreak, Footer, Header, PageNumber, LevelFormat, PositionalTab,
  PositionalTabAlignment, PositionalTabLeader, PositionalTabRelativeTo, TableLayoutType, VerticalAlign,
} = require("docx");

const OUT = process.argv[2];
const TOCP = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : {};
const ROOT = path.resolve(__dirname, "..", "..");
const FIGR = path.join(ROOT, "figures", "report"), FIGE = path.join(ROOT, "figures"), SHOT = path.join(ROOT, "docs", "screenshots");
const FONT = "Times New Roman", BLUE = "1F4E79";
const PAGE_W = 11906, MARGIN = 1440, TEXT_W = PAGE_W - 2 * MARGIN;

// ---------- helpers ----------
function runs(text, base = {}) {
  const out = []; const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    out.push(t.startsWith("**") ? new TextRun({ text: t.slice(2, -2), bold: true, ...base }) : new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), alignment: o.align || AlignmentType.JUSTIFIED, spacing: { after: 120 } });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t) => new Paragraph({ numbering: { reference: "bul", level: 0 }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 } });
const N = (t) => new Paragraph({ numbering: { reference: "num", level: 0 }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 } });
const BR = () => new Paragraph({ children: [new PageBreak()] });
let figNo = 0, tabNo = 0;
const pngSize = (f) => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
function fig(file, widthIn, caption) {
  const { w, h } = pngSize(file); const W = widthIn * 96, H = W * h / w; figNo++;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 40 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(file), transformation: { width: Math.round(W), height: Math.round(H) },
        altText: { title: caption, description: caption, name: path.basename(file) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: `Figure ${figNo}. `, bold: true, size: 20 }), new TextRun({ text: caption, italics: true, size: 20 })] }),
  ];
}
const R = (n) => path.join(FIGR, n + ".png"), E = (n) => path.join(FIGE, n + ".png"), S = (n) => path.join(SHOT, n + ".png");
const bd = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
function table(headers, rows, widths, caption, opts = {}) {
  const sz = opts.size || 20; tabNo++;
  const mk = (txt, head, i, shade) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    shading: head ? { fill: BLUE, type: ShadingType.CLEAR, color: "auto" } : shade ? { fill: "EEF3F9", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ alignment: (i === 0 || (opts.left || []).includes(i)) ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: runs(String(txt), { size: sz, bold: head || undefined, color: head ? "FFFFFF" : undefined }) })],
  });
  return [
    new Paragraph({ keepNext: true, spacing: { before: 160, after: 60 }, children: [new TextRun({ text: `Table ${tabNo}. `, bold: true, size: 20 }), new TextRun({ text: caption, italics: true, size: 20 })] }),
    new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
      rows: [new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, true, i)) }),
        ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, false, i, ri % 2 === 1)) }))] }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}
function callout(title, lines) {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return [new Table({ width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W],
    rows: [new TableRow({ children: [new TableCell({ width: { size: TEXT_W, type: WidthType.DXA },
      shading: { fill: "EEF3F9", type: ShadingType.CLEAR, color: "auto" },
      borders: { left: { style: BorderStyle.SINGLE, size: 24, color: BLUE }, top: none, bottom: none, right: none },
      margins: { top: 100, bottom: 100, left: 180, right: 180 },
      children: [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, color: BLUE })] }),
        ...lines.map((l) => new Paragraph({ spacing: { after: 40 }, alignment: AlignmentType.JUSTIFIED, children: runs(l) }))] })] })] }),
    new Paragraph({ spacing: { after: 120 }, children: [] })];
}

// ---------- data ----------
const csv = (f) => {
  const [h, ...rows] = fs.readFileSync(path.join(ROOT, "results", f), "utf8").trim().split(/\r?\n/);
  const H = h.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [H[i] || "key", isNaN(+v) || v === "" ? v : +v])));
};
const SK = csv("skill_uplift_table.csv"), TP = csv("title_premium_table.csv"), LAD = csv("dsjobs_title_ladder.csv");
const DVP = csv("dsjobs_demand_vs_pay.csv"), SEN = csv("dsjobs_senior_premium.csv"), JOR = csv("jds_odds_ratios.csv"), SOR = csv("sds_odds_ratios.csv");
const SW = csv("sds_sweet_spots.csv"), ARCH = csv("sds_archetypes.csv");
const MET = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "model_metrics.json"), "utf8"));
const EX = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "report_extra.json"), "utf8"));
const f = (x, d = 1) => Number(x).toFixed(d);
const sg = (x, d = 1) => (x >= 0 ? "+" : "") + f(x, d);
const pv = (p) => (p < 0.001 ? "< 0.001" : f(p, 3));
const sk = (k) => SK.find((r) => r.key === k), tp = (k) => TP.find((r) => r.title_family === k), lad = (k) => LAD.find((r) => r.job_title === k);
const jor = (k) => JOR.find((r) => r.key === k), sor = (k) => SOR.find((r) => r.key === k);
const nice = (s) => s.replace(/_/g, " ");

// ---------- TOC ----------
const TOC = [["Executive Summary", 0], ["1. Problem Definition and Analytics Objective", 0], ["2. Approach Description", 0],
  ["3. Data Exploration: Management, Derivation and Preparation", 0], ["3.1 Data audit", 1], ["3.2 Data issues and treatment", 1],
  ["3.3 Derived variables", 1], ["3.4 Exploratory findings", 1], ["4. Data Analysis", 0], ["4.1 Q1 Which skills carry a pay premium?", 1],
  ["4.2 Q2 Do job titles still pay once skills are controlled?", 1], ["4.3 Q3 When does salary growth flatten?", 1],
  ["4.4 Q4 Which skills earn a junior a high salary hike?", 1], ["4.5 Q5 Which traits mark a successful senior?", 1],
  ["4.6 The decision-support dashboard", 1], ["5. Results and Conclusions", 0], ["6. Implications", 0], ["Appendix", 0]];
const tocParas = TOC.map(([t, l]) => new Paragraph({ spacing: { after: l ? 40 : 80 }, indent: { left: l ? 400 : 0 },
  children: [new TextRun({ text: t, bold: !l }), new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT,
    relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.DOT }), String(TOCP[t] ?? "00")] })] }));

// =====================================================================
const C = [];
// cover
C.push(new Paragraph({ spacing: { before: 2200, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SAS CU HACKATHON", bold: true, size: 28, color: BLUE })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Round 2 — Approach Note", size: 26 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 200 }, children: [new TextRun({ text: "Skills vs Labels", bold: true, size: 52 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [new TextRun({ text: "Is a data professional paid for what they can do, or for what their job is called?", italics: true, size: 28 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Team AkuuJii", bold: true })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun("Japneet Kour Khanduja (24BCS12959)  ·  [Member 2]  ·  [Member 3]  ·  [Member 4]")] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun("Department of Computer Science & Engineering, Chandigarh University")] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun("October 2026")] }));
C.push(BR());
C.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Contents", bold: true, size: 32, color: BLUE })] }));
C.push(...tocParas);

// ---------- EXECUTIVE SUMMARY ----------
C.push(H1("Executive Summary"));
C.push(P("Every data job carries two kinds of information: a **skill list** (Python, SQL, machine learning, storytelling) and a **label** (Data Analyst, Data Scientist, ML Engineer, Senior …). Students are told to collect skills, but employers advertise and pay by title. This note asks which of the two actually drives reward in data-science careers. We use all four hackathon datasets: 15,841 analytics job postings, 1,602 company-level data-science postings, skill scores for 139 junior data scientists and Big-Five personality scores for 161 senior data scientists."));
C.push(P(`We built a scripted, reproducible pipeline of twelve steps: raw-data audit, logged cleaning, exploration, five statistical studies, model training and figure generation. On top of it sits an interactive Streamlit dashboard that answers the questions live and lets a user simulate salary, hike and success scenarios.`));
C.push(...callout("Key findings", [
  `**1. Labels pay, even after skills are controlled.** Adding all 30 skill flags to a log-salary model shrinks title premiums by only about a third. ML Engineer keeps **${sg(tp("ML Engineer").premium_B_pct, 0)}%** and Data Scientist **${sg(tp("Data Scientist").premium_B_pct, 0)}%** over the average title, and R² rises only from 0.480 to 0.493.`,
  `**2. The 'Senior' word alone is worth 14–36%.** In the Data Science Jobs file, a Senior Data Scientist posting pays **${sg(lad("Senior Data Scientist").premium_vs_data_analyst_pct, 0)}%** more than a Data Analyst posting asking for the same experience.`,
  `**3. Some skills still pay, and some cost.** Holding title, city and experience fixed, Java (${sg(sk("java").uplift_pct, 0)}%), business analysis (${sg(sk("business_analysis").uplift_pct, 0)}%) and SQL (${sg(sk("sql").uplift_pct, 0)}%) are each worth more than a year of experience. Excel (${sg(sk("excel").uplift_pct, 0)}%) and SEO (${sg(sk("seo").uplift_pct, 0)}%) carry penalties, and 13 of 30 skills show no reliable effect.`,
  "**4. Pay growth is front-loaded.** Salary rises about **36% a year until ~6.5 years of experience** (95% CI 6.0–7.0), then about 7% a year.",
  `**5. Inside the firm, skills do matter for juniors.** Maths & statistics (odds ×${f(jor("maths_stats").odds_ratio_per_1SD)} per SD) and dashboard & storytelling (×${f(jor("storytelling").odds_ratio_per_1SD)}) drive a high salary hike. Coding alone is not significant. Cross-validated AUC is ${f(MET.hike.roc_auc, 3)}.`,
  `**6. For seniors, personality decides success, with sweet spots.** Conscientiousness (×${f(sor("conscientiousness").OR_per_1SD, 0)} per SD) and openness (×${f(sor("openness").OR_per_1SD, 0)}) dominate. All five traits have an inverted-U optimum, and one archetype, the "driven achievers", accounts for nearly all successful seniors (89% success).`,
]));
C.push(P("**What this means.** Skills open the door, but the label and experience set the price. Candidates should aim at the higher-paid *labels* (Data Scientist, ML Engineer) and back the claim with quantitative and communication skills. Employers should audit title-based pay bands, because skills explain little of the title gap. L&D teams can use the hike and success models as transparent development tools, not as hiring filters."));

// ---------- 1. PROBLEM ----------
C.push(H1("1. Problem Definition and Analytics Objective"));
C.push(H2("1.1 Business context"));
C.push(P("Data-science hiring in India runs on two signals that do not always agree. Job postings list long, inconsistent skill strings, and the same work appears under many titles: Analyst, Data Analyst, Business Analyst, Data Scientist, ML Engineer. Students and early-career professionals are advised to 'learn more skills', yet salary bands, promotion ladders and recruiter searches are organised by title. If titles carry pay that skills do not explain, two equally capable people can be paid very differently simply because of what their role is called."));
C.push(P("The four datasets provided capture this at three points in the career: the **external market** (Analytics Jobs, Data Science Jobs), the **junior reward decision** (JDS Skill Traits: salary hike high or low) and **senior success** (SDS Personality Traits). Together they let us test whether reward follows *capability* or *labels* across the whole career."));
C.push(H2("1.2 Problem statement"));
C.push(...callout("Analytics objective", ["*Quantify how much of a data professional's reward is explained by measurable capability (skills, experience, personality) and how much by the job label, at the market, junior and senior stages; validate the findings with robust statistical models; and deliver them as an interactive decision-support tool for candidates, employers and educators.*"]));
C.push(H2("1.3 Research questions and hypotheses"));
C.push(...table(["#", "Research question", "Hypothesis", "Data / method"], [
  ["Q1", "Which skills carry a pay premium once title, city and experience are fixed?", "H1: Advanced technical skills (ML, Python, big data) carry the largest premiums.", "Analytics Jobs · OLS, gradient boosting"],
  ["Q2", "Do job titles still pay once 30 skills are controlled?", "H2: Title premiums largely disappear once skills are controlled ('titles are skills in disguise').", "Analytics Jobs, DS Jobs · nested OLS"],
  ["Q3", "At what experience level does salary growth flatten?", "H3: Pay growth slows sharply after the early-career years.", "Analytics Jobs · piecewise & quantile regression"],
  ["Q4", "Which skills earn a junior a high salary hike?", "H4: Technical depth (coding, AI/ML) drives junior hikes.", "JDS · logistic regression, tree"],
  ["Q5", "Which Big-Five traits mark a successful senior, and is more always better?", "H5: Success rises monotonically with conscientiousness and openness.", "SDS · logit with squared terms, k-means"],
], [550, 2900, 3300, 2276], "Research questions, hypotheses and methods", { left: [1, 2, 3] }));
C.push(H2("1.4 Scope and stakeholders"));
C.push(P("The study uses only the four supplied files (2024–25). Salaries in the Analytics file are bands, so we analyse band midpoints on a log scale; the junior and senior samples come from single companies. All results are associations, not causal effects. The findings are aimed at:"));
C.push(B("**Students and job seekers:** which skills to learn and which roles to aim for."));
C.push(B("**Employers and HR:** whether title-based pay bands are justified by capability."));
C.push(B("**L&D teams:** which junior skills and senior behaviours to develop."));
C.push(B("**Universities and industry partners such as SAS:** curriculum and certification focus."));

// ---------- 2. APPROACH ----------
C.push(H1("2. Approach Description"));
C.push(P("We followed a CRISP-DM style workflow (Figure 1). The key design choice was to treat the question as a **controlled comparison**: every claim about skills is made *holding title, city and experience fixed*, and every claim about titles is made *holding skills fixed*. This is what separates 'labels pay' from 'people with certain labels happen to have better skills'."));
C.push(...fig(R("f01_workflow"), 6.3, "Analytical workflow from raw files to the five research questions and the dashboard"));
C.push(H2("2.1 Methods and why we chose them"));
C.push(...table(["Question", "Method", "Why"], [
  ["Cleaning", "Rule-based parsing with a printed log for every step", "Every change is counted and justified, so the cleaning is auditable and reproducible."],
  ["Q1 skills", "OLS on log(salary), HC1 robust errors; gradient-boosting cross-check with permutation importance", "The log form turns coefficients into % premiums. Robust errors handle unequal variance. Gradient boosting tests whether a flexible model ranks skills the same way."],
  ["Q2 labels", "Nested OLS: Model A (title + city + experience) vs Model B (A + 30 skills); effect coding; Wald test; cosine similarity of skill profiles", "If titles are 'skills in disguise', their premiums should vanish in Model B. Effect coding compares every title with the average title rather than an arbitrary baseline."],
  ["Q2b ladder", "OLS on log(avg salary) ~ experience + title, HC3 errors (DS Jobs)", "An independent dataset with clean titles tests the same idea: does the label pay at equal experience?"],
  ["Q3 experience", "Piecewise (broken-stick) regression with grid search and 1,000 bootstrap resamples; quantile regression at the 10th, 50th and 90th percentiles", "Finds *where* growth slows and gives a confidence interval. Quantiles show whether top earners follow the same curve."],
  ["Q4 juniors", "Logistic regression (odds ratios per SD) vs depth-3 tree; interaction test; 5-fold CV × 10 repeats", "Small sample (118), so a simple, regularised model and repeated CV give stable estimates."],
  ["Q5 seniors", "Linear vs quadratic logit; single-trait quadratic tests; k-means archetypes (silhouette)", "Tests the 'more is better' assumption directly and finds personality profiles, not just averages."],
  ["Delivery", "Streamlit dashboard on saved models", "Turns static results into a tool stakeholders can use."],
], [1300, 3500, 4226], "Methods and the reason for each", { left: [1, 2], size: 19 }));
C.push(H2("2.2 Tools, validation and reproducibility"));
C.push(P("The pipeline is written in Python (pandas, NumPy, SciPy, statsmodels, scikit-learn, matplotlib, Plotly, Streamlit). A single command, `python run_all.py`, runs all twelve steps in about two minutes and saves every printout to `results/logs/`. Random seeds are fixed (42), so all numbers in this note are reproducible. Classification models are evaluated with **repeated stratified 5-fold cross-validation (50 splits)** and compared with a majority-class baseline. Regression models are evaluated with 5-fold CV R² and robust standard errors. The hackathon is technology-agnostic. The same steps map onto SAS Viya for Learners: data preparation in SAS Data Studio, the charts in SAS Visual Analytics, and the regression, logistic and gradient-boosting models in SAS Model Studio."));

// ---------- 3. DATA ----------
C.push(H1("3. Data Exploration: Management, Derivation and Preparation"));
C.push(H2("3.1 Data audit"));
C.push(P("Step `00_audit_raw.py` profiles every raw file (types, missing values, duplicates, first rows and the 15 most common values of each text column) before anything is changed. Table 3 summarises what it found."));
C.push(...table(["File", "Raw size", "Key fields", "Main quality findings"], [
  ["Analytics Jobs", "15,841 × 8", "experience, salary, location, job_desig, key_skills", "Experience and salary stored as text ('6-10 yrs', '10to15'); job_type 75.8% missing; job_description 22.2% missing; hundreds of location spellings; free-text titles and skills; 1,133 junk skill tokens ('...'); repeated postings"],
  ["Data Science Jobs", "1,602 × 8", "company, title, min_experience, avg/min/max salary, num_of_jobs", "Salaries stored as text ('7.8L'); 642 company names incl. subsidiaries and variants; a few extreme salaries (up to ₹82 L)"],
  ["JDS Skill Traits", "139 × 7", "5 skill scores (1–5), salary hike (1/0)", "No missing values; 21 rows repeat another row's five scores and outcome under a different id"],
  ["SDS Personality Traits", "161 × 7", "Big-Five scores, success (1/0)", "No missing values; malformed column names (' extraversion', 'success_ classification_ high_low')"],
], [1500, 1100, 2400, 4026], "Raw data audit", { left: [2, 3], size: 19 }));
C.push(H2("3.2 Data issues and treatment"));
C.push(P("Each cleaning script prints a log of the issue, the number of rows affected and the action taken (Appendix A has the full logs). Table 4 summarises it."));
C.push(...table(["Issue", "Rows / cells", "Treatment", "Justification"], [
  ["Duplicate postings (identical except s_no)", "1,041", "Dropped, first kept", "A repeated posting would double-count its salary and skills"],
  ["Experience as text", "15,841", "Regex → min_exp, max_exp, avg_exp (all parsed)", "Models need numbers"],
  ["Salary as bands ('10to15')", "15,841", "Parsed to min, max and midpoint (₹ lakh); log used in models", "Six bands → six midpoints; log tames the right skew"],
  ["Location spelling variants", "2,273 rows", "Canonical names (Bangalore→Bengaluru, Gurugram→Gurgaon, area suffixes removed)", "One city spelled many ways would split its estimate"],
  ["Rare cities (< 50 postings)", "1,222 rows", "Grouped as 'Other' (major city kept when listed)", "Tiny groups give unstable estimates"],
  ["Free-text job titles", "15,841", "Keyword rules → 7 title families (Manager, ML Engineer, Data Engineer, BI, Data Scientist, Data Analyst, Other)", "Thousands of spellings → comparable labels"],
  ["Free-text key skills", "1,133 junk tokens", "Split on commas, junk removed, top 30 skills → 0/1 columns", "One column per skill for regression"],
  ["Salary text '7.8L'", "4,806 cells", "Stripped 'L', stored as float", "Arithmetic and modelling"],
  ["Company name variants", "95 rows", "Merged into parent brand (642 → 609 companies)", "'GE Healthcare' and 'GE Digital' are one employer"],
  ["Extreme DS salaries", "5 rows", "Dropped beyond 3 × IQR (> ₹45.9 L)", "A handful of extreme rows would steer averages"],
  ["Repeated JDS records", "21 rows", "Dropped (same 5 scores + outcome, id differs)", "Repeated records would inflate certainty on a 139-row sample"],
  ["Out-of-range scores / > 4 SD", "0", "Checked; none found", "Scale rules confirmed"],
  ["Malformed SDS column names", "2 columns", "Normalised to snake_case", "Prevents silent column-matching bugs"],
], [2300, 1200, 3000, 2526], "Data issues and their treatment", { left: [2, 3], size: 18 }));
C.push(P("After cleaning: **14,800** analytics postings, **1,597** DS-jobs rows from 608 companies, **118** juniors (60 high hike, 58 low) and **161** seniors (85 successful, 76 not). Both people datasets are balanced, so accuracy is meaningful alongside AUC."));
C.push(H2("3.3 Derived variables"));
C.push(...table(["Variable", "Derived from", "Definition"], [
  ["min_exp, max_exp, avg_exp", "experience", "Parsed range bounds and midpoint (years)"],
  ["salary_min/max/avg_lakh, log salary", "salary", "Band bounds, midpoint (₹ lakh) and its natural log"],
  ["location (canonical), city", "location", "Cleaned city list; first city used as the primary city"],
  ["title_family", "job_desig", "7 families from ordered keyword rules"],
  ["skill_* (30 columns)", "key_skills", "1 if the posting lists the skill"],
  ["company_name (merged)", "company_name", "Parent-brand name"],
  ["success_high_low, salary_hike_high_or_low", "targets", "Binary 0/1 outcomes"],
  ["z-scores, squared terms, cluster", "JDS / SDS", "Standardised traits for odds ratios; z² for sweet spots; k-means archetype"],
], [3000, 1800, 4226], "Derived variables", { left: [1, 2] }));
C.push(H2("3.4 Exploratory findings"));
C.push(P("Salaries are strongly right-skewed (median ₹8.0 L, mean ₹11.8 L), but their logarithm is close to symmetric, which is why all salary models use log(salary) (Figure 2)."));
C.push(...fig(E("01_salary_distribution"), 6.2, "Salary distribution in Analytics Jobs: raw band midpoints vs log scale"));
C.push(P(`Experience is by far the strongest single correlate of pay: corr(log salary, experience) = 0.64, against at most 0.10 for any single skill. Median pay also differs by title family: ₹12.5 L for Data Engineer, Data Scientist, ML Engineer and Manager, against ₹8.0 L for Data Analyst, BI and Other (Figure 3). Part of this gap is experience: Managers ask for a median 7.5 years, Data Analysts 4.5. That is why every later model controls for experience.`));
C.push(...fig(E("04_median_salary_by_title_family"), 5.4, "Median salary by title family"));
C.push(P("The most requested skills are SQL, analytics, Python, finance and Java (Figure 4). The list also contains digital marketing, SEO, sales and accounting, a reminder that 'analytics' postings include many non-technical roles. Those land in the 'Other' family (41.6% of postings), which serves as a reference group in the models."));
C.push(...fig(E("05_top20_skills_demand"), 5.2, "Top 20 skills by share of postings"));
C.push(P("In the people datasets, every junior skill score is higher for the high-hike group, with the largest raw gaps in dashboard & storytelling (+0.94 points) and maths & statistics (+0.75). Among seniors, the success rate rises from 0% in the bottom conscientiousness quartile to 84% in the top. That steep rise is the first hint of a threshold rather than a straight line (Figures 5–6)."));
C.push(...fig(E("07_jds_skills_by_salary_hike"), 5.8, "Junior skill scores by salary-hike outcome"));
C.push(...fig(E("08_sds_traits_by_success"), 5.8, "Senior Big-Five scores by success outcome"));

// ---------- 4. ANALYSIS ----------
C.push(H1("4. Data Analysis"));
C.push(H2("4.1 Q1 Which skills carry a pay premium?"));
C.push(P(`We regressed log(salary) on title family, city, experience and all 30 skill flags (n = 14,800, HC1 robust errors, R² = 0.493). Each extra year of experience adds **15.9%**. Figure 7 shows every skill's premium with its 95% confidence interval. **17 of the 30 skills have a reliable effect** (15 positive, 2 negative).`));
C.push(...fig(R("f02_skill_uplift"), 5.6, "Skill pay premiums holding title, city and experience fixed (95% CI)"));
C.push(...table(["Skill", "Premium", "95% CI", "p", "= years of experience", "Postings"],
  ["java", "business_analysis", "sql", "javascript", "sas", "machine_learning", "python", "excel", "seo"].map((k) => { const r = sk(k);
    return [nice(k), sg(r.uplift_pct) + "%", `${sg(r.ci_lo_pct)} to ${sg(r.ci_hi_pct)}%`, pv(r.p_value), f(r.yrs_equivalent, 2), r.postings]; }),
  [2000, 1200, 2000, 1000, 1600, 1226], "Selected skill premiums (full table in Appendix B)"));
C.push(P(`The most valuable skills are **Java (${sg(sk("java").uplift_pct)}%)**, **business analysis (${sg(sk("business_analysis").uplift_pct)}%)** and **SQL (${sg(sk("sql").uplift_pct)}%)**, each worth more than a full year of experience. SAS (${sg(sk("sas").uplift_pct)}%) is worth about one year and machine learning (${sg(sk("machine_learning").uplift_pct)}%) about 0.9 years. Python is smaller (${sg(sk("python").uplift_pct)}%), probably because it is now a baseline expectation. **Excel (${sg(sk("excel").uplift_pct)}%) and SEO (${sg(sk("seo").uplift_pct)}%) carry penalties**: they signal clerical or marketing roles. Big data, Spark, data science and Hadoop are *not* distinguishable from zero once title is controlled. Their pay is already captured by the Data Engineer and Data Scientist labels.`));
C.push(P("**Cross-check.** A gradient-boosting model reaches a higher 5-fold CV R² (0.538 ± 0.025), but its permutation importances rank skills very differently (Spearman −0.22 with the OLS premiums). Only business analysis and SAS appear in both top-10 lists. Individual skill premiums are therefore modest and model-dependent compared with title and experience. **H1 is only partly supported:** some traditional skills (Java, SQL, SAS) out-earn the 'advanced' ones once the label is accounted for."));

C.push(H2("4.2 Q2 Do job titles still pay once skills are controlled?"));
C.push(P("This is the core test. Model A explains log(salary) with title family, city and experience. Model B adds all 30 skills. If titles were simply 'skills in disguise', their premiums would collapse in Model B. Figure 8 and Table 7 show what actually happens."));
C.push(...fig(R("f03_title_premium"), 5.6, "Title premium vs the average title, before (grey) and after (blue) controlling for 30 skills"));
C.push(...table(["Title family", "Model A premium", "Model B premium (95% CI)", "p (B)", "Share of premium explained by skills"],
  TP.map((r) => [r.title_family, sg(r.premium_A_pct) + "%", `${sg(r.premium_B_pct)}% (${sg(r.B_lo)} to ${sg(r.B_hi)})`, pv(r.p_B), r.premium_gone_pct === "" ? "n/a (A ≈ 0)" : f(r.premium_gone_pct, 0) + "%"]),
  [1800, 1500, 2600, 1100, 2026], "Title premiums with and without skill controls (effect coding, HC1)"));
C.push(P(`Skills explain only part of each gap: on average **${f(100 - 38, 0)}% of the title premium survives** the 30 skill controls. ML Engineer still earns ${sg(tp("ML Engineer").premium_B_pct)}% and Data Scientist ${sg(tp("Data Scientist").premium_B_pct)}% over the average title; Data Analyst (${sg(tp("Data Analyst").premium_B_pct)}%) and BI (${sg(tp("BI").premium_B_pct)}%) stay below it. Six of seven title effects remain significant. The skill block *is* jointly significant (Wald χ²(30) = 463, p < 0.001), but it raises R² only from 0.480 to 0.493. Managers even gain (+0.3% → +8.0%): their postings list lower-paid generic skills, so once skills are held equal the manager label is worth more. The result is unchanged when the 154 postings in once-only locations are removed.`));
C.push(P(`The two labels describe genuinely different work. The Data Analyst and Data Scientist skill profiles have a cosine similarity of only ${f(EX.cosine_da_ds, 2)}: Data Scientist postings list machine learning (30.9% vs 2.1%) and Python (31.7% vs 3.2%) far more often (Figure 9). But the skills we can observe price only a third of the title difference. The rest reflects things the label stands for that keyword lists do not capture: seniority, scope, employer brand and negotiating position.`));
C.push(...fig(R("f12_da_vs_ds"), 5.0, "Skills each family asks for more often (percentage points)"));
C.push(H3("Independent check: the title ladder in the Data Science Jobs file"));
C.push(P(`The DS Jobs file has clean, standard titles and required experience, so it gives an independent test (Figure 10). Holding experience fixed (R² = 0.58, +11.9% per year), a **Senior Data Scientist posting pays ${sg(lad("Senior Data Scientist").premium_vs_data_analyst_pct, 0)}%** more than a Data Analyst posting (95% CI ${sg(lad("Senior Data Scientist").ci_lo, 0)} to ${sg(lad("Senior Data Scientist").ci_hi, 0)}%), and a Data Scientist ${sg(lad("Data Scientist").premium_vs_data_analyst_pct, 0)}%.`));
C.push(...fig(R("f04_ds_ladder"), 5.4, "DS Jobs: salary premium vs Data Analyst at equal required experience"));
C.push(...table(["Base role", "Raw 'Senior' premium", "Premium at same experience", "Extra years required"],
  SEN.map((r) => [r.role, sg(r.raw_senior_premium_pct, 0) + "%", sg(r.same_experience_premium_pct, 0) + "%", f(r.extra_years_required, 0)]),
  [2600, 2100, 2300, 2026], "What the word 'Senior' is worth"));
C.push(P("Roughly half of the raw 'Senior' premium is explained by the extra experience asked for. The other half (**14–36%**) is attached to the word itself. Demand and pay also point in opposite directions (Figure 11; Spearman −0.65 across titles, p = 0.043). Business Analyst and Data Analyst make up 55% of all postings but have the two lowest median salaries (₹8.3 L and ₹5.0 L)."));
C.push(...fig(R("f05_demand_vs_pay"), 5.4, "Share of postings vs median salary by title"));
C.push(P("**H2 is rejected.** Titles are not just skills in disguise: the label carries a large, robust pay premium of its own, in both job datasets."));

C.push(H2("4.3 Q3 When does salary growth flatten?"));
C.push(P("A piecewise regression of log(salary) on experience, searched over breakpoints from 1 to 20 years, finds the best break at **6.5 years** (bootstrap 95% CI 6.0–7.0 years, 1,000 resamples). Pay grows about **+35.6% per year before the break** and **+7.4% per year after** (Figure 12). In rupees, the median moves from ₹1.5 L (0–3 years) to ₹8 L (4–5 years) to ₹12.5 L (6–9 years): roughly eightfold during the junior years. It then crawls to ₹20 L over the next decade."));
C.push(...fig(R("f06_experience"), 5.4, "Salary by experience with the fitted piecewise curve (break at 6.5 years)"));
C.push(...table(["Quantile", "Quadratic turning point", "Piecewise break", "Growth before", "Growth after"], [
  ["10th percentile", "15.8 yrs", "10.0 yrs", "+35.4%/yr", "≈ 0%/yr"], ["Median", "13.0 yrs", "5.0 yrs", "+54.2%/yr", "+8.9%/yr"], ["90th percentile", "16.3 yrs", "10.0 yrs", "+17.0%/yr", "≈ 0%/yr"],
], [1900, 2000, 1700, 1700, 1726], "Quantile regression: where growth slows for low, typical and top earners"));
C.push(P("Top earners keep climbing longer: their curve breaks at 10 years, against 5 for the median. The flattening at the top is partly an artefact of the data, because 26% of postings asking for 10+ years (56% for 17+) already sit in the highest ₹25–50 L band, so higher pay is never recorded. **H3 is supported:** most pay growth happens in the first six to seven years, which is exactly when labels change (Analyst → Scientist → Senior)."));

C.push(H2("4.4 Q4 Which skills earn a junior a high salary hike?"));
C.push(P(`Inside a company, the picture changes: here, measured skill matters. A logistic regression of the hike outcome on the five standardised skill scores (n = 118) beats a majority-class guess by a wide margin. Cross-validated **ROC-AUC is ${f(MET.hike.roc_auc, 3)} ± ${f(MET.hike.roc_auc_sd, 3)}** and accuracy ${f(100 * MET.hike.accuracy, 1)}%, against 50.8% for always guessing the majority class (precision ${f(MET.hike.precision, 2)}, recall ${f(MET.hike.recall, 2)}).`));
C.push(...fig(R("f07_jds_or"), 5.0, "Junior salary hike: odds ratio per +1 SD of each skill (95% CI)"));
C.push(...table(["Skill", "Odds ratio per SD", "95% CI", "p", "Reliable"],
  JOR.map((r) => [({ maths_stats: "Maths & stats", storytelling: "Dashboard & storytelling", ai_and_ml: "AI & ML", big_data: "Big data", coding: "Coding" })[r.key], "×" + f(r.odds_ratio_per_1SD, 2), `${f(r.ci_lo, 2)}–${f(r.ci_hi, 2)}`, pv(r.p_value), r.reliable === "True" ? "Yes" : "No"]),
  [2600, 1700, 1800, 1300, 1626], "Logistic regression odds ratios (McFadden pseudo-R² = 0.449)"));
C.push(P(`**Maths & statistics** (×${f(jor("maths_stats").odds_ratio_per_1SD)}) and **dashboard & storytelling** (×${f(jor("storytelling").odds_ratio_per_1SD)}) are the strongest drivers. One extra standard deviation (about 0.8–0.9 points on the 1–5 scale) roughly triples or quadruples the odds of a high hike, with the other four skills held equal. AI & ML and big data each add about ×2.4. **Coding alone is not significant** (p = 0.19), and a coding × storytelling interaction is not supported (likelihood-ratio p = 0.32).`));
C.push(P("A depth-3 decision tree is weaker (AUC 0.768, Figure 14) but gives a readable rule: **storytelling > 4.15, maths & stats > 3.55 and AI & ML > 4.0 → high hike.** Storytelling carries 60% of the tree's importance. **H4 is rejected:** it is quantitative depth and the ability to communicate results, not raw coding, that juniors are rewarded for. With 12 events per predictor the direction of these effects is solid, but the exact sizes are imprecise."));
C.push(...fig(R("f08_model_cv"), 5.2, "Cross-validated ROC-AUC of the models on the junior (blue) and senior (green) datasets"));

C.push(H2("4.5 Q5 Which traits mark a successful senior?"));
C.push(P(`For senior, customer-facing data scientists, personality separates success almost perfectly. A linear logistic model on the Big Five reaches CV AUC 0.964 and accuracy 92.7%, against 52.8% by guessing. **Conscientiousness (×${f(sor("conscientiousness").OR_per_1SD)} per SD)** and **openness (×${f(sor("openness").OR_per_1SD)})** dominate (Figure 15). Neuroticism and extraversion add about ×3.9 each; agreeableness is borderline (p = 0.056).`));
C.push(...fig(R("f09_sds_or"), 5.0, "Senior success: odds ratio per +1 SD of each trait (95% CI, log scale)"));
C.push(P("**Is more always better?** No. Testing each trait with a squared term shows a significant **inverted-U for all five traits**, with the optimum inside the observed range (Figure 16): neuroticism ≈ 40, extraversion ≈ 51, openness ≈ 53, agreeableness ≈ 49 and conscientiousness ≈ 57 on a 17–68 scale. Adding the squared terms to the full model raises CV AUC from 0.964 to 0.975 (paired t-test across repeats, p < 0.001). The curvature is real but modest: in practice, aim high, then plateau."));
C.push(...fig(R("f10_sweet_spots"), 6.3, "Success probability across each trait (single-trait quadratic logits): every trait has a sweet spot"));
C.push(P("K-means clustering (k = 4, best silhouette 0.327) finds four personality archetypes (Figure 17). Only one profile wins. The **driven achievers** (n = 88) are above average on extraversion, openness, agreeableness and conscientiousness, and 89% of them are successful. **Stressed veterans** (high neuroticism) succeed 32% of the time; the **warm but unfocused** (high agreeableness, low openness and conscientiousness) and the **reserved and detached** never do. **H5 is partly supported:** conscientiousness and openness dominate, but success has an optimum rather than rising without limit."));
C.push(...fig(R("f11_archetypes"), 5.6, "Senior personality archetypes and their success rates"));
C.push(P("Such clean separation is unusual for real personality data. The SDS sample may be synthetic or pre-screened, so these models describe this sample and should not be used as a hiring test without external validation."));

C.push(H2("4.6 The decision-support dashboard"));
C.push(P(`To make the results usable, step 10 trains three models and saves them for an interactive **Streamlit dashboard** (\`streamlit run app.py\`). The dashboard has eight pages: an overview of the five answers, the cleaning summary, one page per question with interactive charts, and three simulators:`));
C.push(B(`**Salary estimator.** A gradient-boosting model on title family, city, experience and the 30 skills (5-fold CV R² ${f(MET.salary.cv_r2, 2)}). It also shows "the same person under a different label", making the title premium tangible.`));
C.push(B("**Junior hike simulator.** Five skill sliders feed the logistic model; the page shows the probability of a high hike and which +0.5 improvement would help most."));
C.push(B("**Senior success simulator.** Big-Five sliders feed the quadratic logit, with a live sweet-spot curve for any chosen trait."));
C.push(...fig(S("01_overview"), 6.2, "Dashboard overview page"));
C.push(...fig(S("06_hike"), 6.2, "Junior hike simulator: sliders, predicted probability and the biggest lever"));

// ---------- 5. RESULTS ----------
C.push(H1("5. Results and Conclusions"));
C.push(...table(["Hypothesis", "Verdict", "Key evidence"], [
  ["H1 Advanced technical skills carry the largest premiums", "Partly supported", "Java +23%, business analysis +19%, SQL +18% lead; ML +14%; big data and Spark not significant once title is controlled"],
  ["H2 Titles are 'skills in disguise'", "Rejected", "62% of title premiums survive 30 skill controls; R² 0.480 → 0.493; Senior DS +194% vs DA at equal experience"],
  ["H3 Pay growth slows after the early years", "Supported", "Break at 6.5 yrs (CI 6.0–7.0): +36%/yr → +7%/yr"],
  ["H4 Coding and AI/ML drive junior hikes", "Rejected", "Maths & stats ×3.8 and storytelling ×3.1 lead; coding n.s. (p = 0.19)"],
  ["H5 Success rises steadily with C and O", "Partly supported", "C ×26.5 and O ×20.8 dominate, but all five traits show an inverted-U optimum"],
], [3200, 1500, 4326], "Hypothesis verdicts", { left: [2] }));
C.push(...table(["Use", "Model", "Validated performance"], [
  ["Salary estimate", "Gradient boosting on log(salary)", `5-fold CV R² ${f(MET.salary.cv_r2, 3)} ± ${f(MET.salary.cv_r2_sd, 3)}`],
  ["Junior hike", "Logistic regression (5 skills)", `CV AUC ${f(MET.hike.roc_auc, 3)}, accuracy ${f(100 * MET.hike.accuracy, 1)}% (baseline 50.8%)`],
  ["Senior success", "Logistic regression with squared terms", `CV AUC ${f(MET.success.roc_auc, 3)}, accuracy ${f(100 * MET.success.accuracy, 1)}% (baseline 52.8%)`],
], [2200, 3300, 3526], "Models deployed in the dashboard", { left: [1, 2] }));
C.push(H2("5.1 Conclusions"));
C.push(N("**In the job market, labels pay.** Title and experience explain most of the advertised salary; 30 skills add only 1.3 points of R². About two-thirds of each title premium remains after skills are controlled, and the word 'Senior' alone is worth 14–36%."));
C.push(N("**Skills still matter, but selectively.** A handful of skills (Java, business analysis, SQL, SAS, machine learning) are each worth about a year of experience. Clerical and marketing skills (Excel, SEO) are penalised, and fashionable big-data keywords add nothing beyond the title."));
C.push(N("**The early years decide the trajectory.** Pay grows ~36% a year until about 6.5 years of experience, the period in which professionals change labels."));
C.push(N("**Inside the firm, capability is rewarded.** Junior hikes follow quantitative depth and storytelling, not raw coding. Senior success follows conscientiousness and openness, with sweet spots rather than 'more is better'."));
C.push(N("**Skills open the door; labels and experience set the price.** The career strategy that follows is to build quantitative and communication skills *and* move deliberately into the higher-paid labels."));

// ---------- 6. IMPLICATIONS ----------
C.push(H1("6. Implications"));
C.push(H2("6.1 For students and job seekers"));
C.push(B("**Target the label, not just the skill list.** A Data Scientist or ML Engineer title is worth 16–31% more than the average title even with identical skills. Apply for the label your skills justify."));
C.push(B("**Learn the skills that pay:** SQL, statistics/business analysis and a production language (Java or Python) before niche tools. Do not lead your CV with Excel or SEO."));
C.push(B("**Use the first six years.** Pay growth is steepest early, so frequent, deliberate moves up the title ladder pay off most in this window."));
C.push(B("**As a junior, invest in maths and storytelling.** In our model, raising maths & stats by one SD roughly quadruples the odds of a high hike; coding alone does not move it."));
C.push(H2("6.2 For employers and HR"));
C.push(B("**Audit title-based pay bands.** If two-thirds of a title premium is not explained by skills, equally capable people may be paid very differently. Map pay to skill and scope, not to the job title alone."));
C.push(B("**Make job titles consistent.** Thousands of title spellings for similar work make pay comparison opaque for candidates and for internal equity."));
C.push(B("**Reward communication.** Storytelling is the strongest single predictor of junior hikes, so make it an explicit, assessed competency."));
C.push(H2("6.3 For learning & development"));
C.push(B("Use the junior simulator as a development conversation: show each analyst which +0.5 improvement would move their outlook most."));
C.push(B("For seniors, coach planning and follow-through (conscientiousness) and curiosity about new methods (openness) toward the sweet spot, not the extreme. Do not use the personality model as a selection filter."));
C.push(H2("6.4 For universities, SAS and society"));
C.push(B("Curricula should weight statistics and business communication as heavily as programming. SAS skills already carry about a year's experience premium, which supports certification paths."));
C.push(B("Title inflation and opaque labels affect fairness across the profession: graduates without the network to negotiate a better label are paid less for the same skills. Transparent, skill-based job architecture benefits candidates and employers alike."));
C.push(H2("6.5 Limitations and next steps"));
C.push(B("All findings are associations from observational data. Skills are keyword mentions in postings, not verified proficiency, and salaries are band midpoints."));
C.push(B("The junior (118) and senior (161) samples come from single companies; the near-perfect senior separation suggests a synthetic or pre-screened sample."));
C.push(B("Next steps: NLP on job descriptions to capture seniority and scope; employer fixed effects to separate brand from label; re-implementing the pipeline in SAS Model Studio for governed deployment."));

// ---------- APPENDIX ----------
C.push(H1("Appendix"));
C.push(H2("Appendix A. Cleaning logs (verbatim program output)"));
const mono = (t, sz = 14) => t.split("\n").map((l) => new Paragraph({ spacing: { after: 0, line: 200 }, children: [new TextRun({ text: l.length ? l : " ", font: "Courier New", size: sz })] }));
for (const lg of ["01_clean_analytics", "02_clean_others"]) {
  C.push(H3(lg + ".py"));
  C.push(...mono(fs.readFileSync(path.join(ROOT, "results", "logs", lg + ".txt"), "utf8").trim(), 13));
}
C.push(H2("Appendix B. Full skill premium table"));
C.push(...table(["Skill", "Premium", "95% CI", "p", "Years equiv.", "Postings", "Reliable"],
  SK.map((r) => [nice(r.key), sg(r.uplift_pct) + "%", `${sg(r.ci_lo_pct)} to ${sg(r.ci_hi_pct)}`, pv(r.p_value), f(r.yrs_equivalent, 2), r.postings, r.reliable === "True" ? "Yes" : "No"]),
  [1900, 1100, 1900, 1000, 1100, 1000, 1026], "OLS skill premiums, all 30 skills (controls: title family, city, experience; HC1)", { size: 18 }));
C.push(H2("Appendix C. Additional exploratory charts"));
C.push(...fig(E("02_salary_vs_experience"), 5.2, "Salary vs experience, all postings"));
C.push(...fig(E("03_median_salary_by_location"), 5.2, "Median salary by city (top 10)"));
C.push(H2("Appendix D. Dashboard screenshots"));
for (const [n, c] of [["03_skills", "Q1 page: interactive skill premiums with confidence intervals"], ["04_labels", "Q2 page: title premiums, DS ladder and demand vs pay"],
  ["05_experience", "Q3 page: experience curve with the 6.5-year break"], ["07_success", "Senior success simulator with sweet-spot curve and archetypes"],
  ["08_salary", "Salary estimator: 'same person, different label'"], ["02_data", "Data & cleaning page"]]) C.push(...fig(S(n), 6.0, c));
C.push(H2("Appendix E. How to run the software"));
C.push(...mono("pip install -r requirements.txt\npython run_all.py          # 12 steps, ~2 minutes; logs in results/logs/\nstreamlit run app.py       # opens the dashboard at http://localhost:8501", 18));
C.push(P("Folder layout: data/raw (original files), data/clean (cleaned files), results (tables, logs, metrics), figures (charts), models (saved models), docs/screenshots."));
C.push(H2("Appendix F. Source code"));
for (const sc of ["01_clean_analytics.py", "02_clean_others.py", "04_skill_roi.py", "05_title_premium.py", "06_experience_knee.py", "07_dsjobs_ladder.py", "08_jds_hike_logit.py", "09_sds_success_traits.py", "10_train_app_models.py"]) {
  C.push(H3(sc));
  C.push(...mono(fs.readFileSync(path.join(ROOT, sc), "utf8").replace(/\t/g, "    "), 12));
}

// ---------- document ----------
const doc = new Document({
  creator: "Team AkuuJii", title: "Skills vs Labels — SAS CU Hackathon Approach Note",
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 32, bold: true, color: BLUE }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 27, bold: true, color: BLUE }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true, italics: true }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } }, titlePage: true },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Skills vs Labels — SAS CU Hackathon Round 2", size: 18, color: "7F7F7F", italics: true })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] }) },
    children: C,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("wrote", OUT, "figures", figNo, "tables", tabNo); });
