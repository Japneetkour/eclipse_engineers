// Skills vs Labels — Round 3 presentation (.pptx)
// usage: node build_deck.js out.pptx
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/mnt/skills/public/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";
const ROOT = path.resolve(__dirname, "..", "..");
const FIGR = (n) => path.join(ROOT, "figures", "report", n + ".png");
const SHOT = (n) => path.join(ROOT, "docs", "screenshots", n + ".png");
const csv = (f) => {
  const [h, ...rows] = fs.readFileSync(path.join(ROOT, "results", f), "utf8").trim().split(/\r?\n/);
  const H = h.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [H[i] || "key", isNaN(+v) || v === "" ? v : +v])));
};
const SK = csv("skill_uplift_table.csv"), TP = csv("title_premium_table.csv"), LAD = csv("dsjobs_title_ladder.csv");
const EQ = csv("experience_quantiles.csv"), JOR = csv("jds_odds_ratios.csv"), SOR = csv("sds_odds_ratios.csv");
const MET = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "model_metrics.json"), "utf8"));
const pngSize = (f) => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const THEME = {
  name: "Skills vs Labels", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: "1B1F3B", lt1: "FFFFFF", dk2: "3B4466", lt2: "F2F3F7", accent1: "E8673C", accent2: "2A78D6",
    accent3: "1BAF7A", accent4: "EDA100", accent5: "8A93A6", accent6: "E34948", hlink: "2A78D6", folHlink: "6B4FBB" },
};
const HEX = THEME.colors;
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Skills vs Labels"; pres.author = "Team AkuuJii";
const C = pres.SchemeColor;

// ---------------- layouts ----------------
pres.defineSlideMaster({
  title: "DARK", background: { color: HEX.dk1 },
  objects: [{ placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.55, w: 8.8, h: 1.3, fontSize: 44, bold: true, color: C.background1, fontFace: "Cambria", valign: "bottom", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.95, w: 8.8, h: 1.2, fontSize: 18, color: "D9DCE8", fontFace: "Calibri", valign: "top", align: "left" }, text: "" } }],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: HEX.lt1 },
  objects: [{ placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9.0, h: 0.7, fontSize: 24, bold: true, color: C.text1, fontFace: "Cambria", valign: "middle", align: "left" }, text: "" } },
    { text: { text: "Skills vs Labels · SAS CU Hackathon", options: { x: 0.5, y: 5.25, w: 5, h: 0.25, fontSize: 9, color: "8A93A6", fontFace: "Calibri" } } }],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.3, fontSize: 9, color: "8A93A6", align: "right" },
});

let n = 0;
const content = (title, section) => { const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section }); s.addText(title, { placeholder: "title" }); n++; return s; };
const tag = (s, x, y, text, fill = C.accent1, w = 0.62) => s.addText(text, { shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.12, x, y, w, h: 0.32, fill: { color: fill },
  color: C.background1, fontSize: 11, bold: true, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "tag " + text });
const stat = (s, x, y, w, big, small, color = C.accent1, size = 40) => {
  s.addText(big, { x, y, w, h: 0.75, fontSize: size, bold: true, color, fontFace: "Cambria", margin: 0, isTextBox: true });
  s.addText(small, { x, y: y + 0.75, w, h: 0.6, fontSize: 12, color: C.text2, margin: 0, valign: "top", isTextBox: true });
};
const para = (s, x, y, w, h, items, size = 15) => s.addText(items.map((t, i) => {
  const arr = typeof t === "string" ? [{ text: t }] : t;
  return arr.map((r, j) => ({ text: r.text, options: { bold: r.bold, color: r.color, breakLine: j === arr.length - 1 && i < items.length - 1, paraSpaceAfter: 8 } }));
}).flat(), { x, y, w, h, fontSize: size, color: C.text1, valign: "top", margin: 0, isTextBox: true });
const card = (s, x, y, w, h, fill = C.background2) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: fill } });
const img = (s, file, x, y, maxW, maxH) => { const { w, h } = pngSize(file); const k = Math.min(maxW / w, maxH / h); s.addImage({ path: file, x: x + (maxW - w * k) / 2, y, w: w * k, h: h * k }); };
const AX = { catAxisLabelColor: "3B4466", valAxisLabelColor: "3B4466", catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
  dataLabelFontFace: "+mn-lt", catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 10, dataLabelColor: "1B1F3B",
  valGridLine: { color: "E4E5EB", size: 0.5 }, catGridLine: { style: "none" }, titleFontFace: "+mn-lt", titleColor: "1B1F3B", titleFontSize: 12 };

// ---------------- 1 title ----------------
pres.addSection({ title: "Opening" });
let s = pres.addSlide({ masterName: "DARK", sectionTitle: "Opening" }); n++;
s.addText("Skills vs Labels", { placeholder: "title" });
s.addText("Is a data professional paid for what they can do, or for what their job is called?", { placeholder: "body" });
tag(s, 0.6, 1.15, "SAS CU HACKATHON", C.accent1, 2.1);
s.addText("Team AkuuJii · Japneet Kour Khanduja (24BCS12959) · [Members] · Chandigarh University", { x: 0.6, y: 4.75, w: 8.8, h: 0.35, fontSize: 12, color: "B8BED3", margin: 0, isTextBox: true });
s.addNotes("Good morning. Our team asked one simple question about data-science careers: are people paid for their skills, or for the label on their job? We used all four hackathon datasets to answer it at three stages of a career.");

// ---------------- 2 the question ----------------
s = content("Two signals on every job — which one sets the pay?", "Opening");
card(s, 0.5, 1.25, 4.3, 2.65); card(s, 5.2, 1.25, 4.3, 2.65, "FDEEE8");
s.addText("SKILLS", { x: 0.75, y: 1.4, w: 3.8, h: 0.4, fontSize: 18, bold: true, color: C.accent2, margin: 0, isTextBox: true });
s.addText("What you can do", { x: 0.75, y: 1.8, w: 3.8, h: 0.3, fontSize: 13, color: C.text2, italic: true, margin: 0, isTextBox: true });
["Python", "SQL", "Machine learning", "Statistics", "Storytelling"].forEach((t, i) => tag(s, 0.75 + (i % 3) * 1.3, 2.3 + Math.floor(i / 3) * 0.45, t, C.accent2, 1.25));
s.addText("LABELS", { x: 5.45, y: 1.4, w: 3.8, h: 0.4, fontSize: 18, bold: true, color: C.accent1, margin: 0, isTextBox: true });
s.addText("What your job is called", { x: 5.45, y: 1.8, w: 3.8, h: 0.3, fontSize: 13, color: C.text2, italic: true, margin: 0, isTextBox: true });
["Data Analyst", "Data Scientist", "ML Engineer", "Senior …", "Manager"].forEach((t, i) => tag(s, 5.45 + (i % 3) * 1.3, 2.3 + Math.floor(i / 3) * 0.45, t, C.accent1, 1.25));
s.addText("Five questions across the career: the market (Q1–Q3), the junior pay review (Q4) and senior success (Q5).", { x: 0.5, y: 4.2, w: 9, h: 0.6, fontSize: 15, color: C.text1, margin: 0, isTextBox: true });
s.addNotes("Every job carries a skill list and a label. Students are told to collect skills, but employers advertise and pay by title. We test which one actually drives reward: in the job market, in junior salary hikes, and in senior success.");

// ---------------- 3 data & approach ----------------
s = content("Four datasets, one reproducible pipeline", "Opening");
[["14,800", "analytics job postings (after cleaning)"], ["1,597", "data-science job rows, 608 companies"], ["118", "junior data scientists, 5 skill scores"], ["161", "senior data scientists, Big-Five traits"]]
  .forEach(([b, t], i) => stat(s, 0.5 + i * 2.3, 1.2, 2.1, b, t, i < 2 ? C.accent1 : C.accent2));
img(s, FIGR("f01_workflow"), 0.5, 2.6, 9.0, 2.55);
s.addNotes("Two job-market files and two people files. Twelve scripted steps take the raw files to cleaned data, five statistical studies, trained models and a dashboard. One command reruns everything in about two minutes.");

// ---------------- 4 cleaning ----------------
s = content("Cleaning: every fix counted and justified", "Opening");
const fixes = [["1,041", "duplicate postings removed"], ["2,273", "location spellings standardised"], ["7", "title families from free-text titles"],
  ["30", "skill columns from free-text skills"], ["95", "company-name variants merged"], ["21", "repeated junior records dropped"]];
fixes.forEach(([b, t], i) => { const x = 0.5 + (i % 3) * 3.05, y = 1.25 + Math.floor(i / 3) * 1.55; card(s, x, y, 2.85, 1.35);
  s.addText(b, { x: x + 0.2, y: y + 0.12, w: 2.5, h: 0.65, fontSize: 32, bold: true, color: C.accent1, fontFace: "Cambria", margin: 0, isTextBox: true });
  s.addText(t, { x: x + 0.2, y: y + 0.78, w: 2.5, h: 0.45, fontSize: 13, color: C.text1, margin: 0, isTextBox: true }); });
s.addText("Text salaries and experience parsed to numbers · log salary used in all models · logs saved for every step", { x: 0.5, y: 4.4, w: 9, h: 0.4, fontSize: 12, color: C.text2, italic: true, margin: 0, isTextBox: true });
s.addNotes("The data was messy. We removed 1,041 repeated postings, standardised 2,273 location spellings, grouped thousands of titles into seven families, and turned free-text skills into 30 columns. Every step prints a log that is in our report appendix.");

// ---------------- 5 Q1 skills ----------------
pres.addSection({ title: "The market" });
s = content("Q1 · A few skills pay — some even cost you", "The market");
tag(s, 0.5, 1.12, "Q1");
const pick = ["java", "business_analysis", "sql", "sas", "machine_learning", "python", "big_data", "excel", "seo"];
const rows = pick.map((k) => SK.find((r) => r.key === k));
s.addChart(pres.charts.BAR, [{ name: "Premium %", labels: rows.map((r) => r.key.replace(/_/g, " ")), values: rows.map((r) => +r.uplift_pct.toFixed(1)) }], {
  x: 0.5, y: 1.5, w: 5.6, h: 3.6, barDir: "bar", catAxisOrientation: "maxMin", showValue: true, dataLabelFormatCode: '+0"%";-0"%"',
  dataLabelPosition: "outEnd", showLegend: false, chartColors: ["2A78D6", "2A78D6", "2A78D6", "2A78D6", "2A78D6", "2A78D6", "8A93A6", "E34948", "E34948"],
  valAxisMinVal: -15, valAxisMaxVal: 30, catAxisLabelPos: "low", valAxisLabelFormatCode: '0"%"', showTitle: true, title: "Pay premium, title + city + experience held fixed", ...AX });
stat(s, 6.5, 1.5, 3.0, "1.4 yrs", "Java's premium equals 1.4 years of experience; SQL and business analysis about 1.1", C.accent2);
para(s, 6.5, 3.05, 3.0, 2.0, [[{ text: "17 of 30", bold: true }, { text: " skills have a reliable effect" }], [{ text: "Big data, Spark", bold: true }, { text: " add nothing once the title is known" }], [{ text: "Excel, SEO", bold: true }, { text: " signal lower-paid roles" }]], 13);
s.addNotes("Holding title, city and experience fixed, Java, business analysis and SQL each add around 18 to 23 percent, worth more than a year of experience. But big data and Spark add nothing once the title is known, and Excel and SEO carry penalties. Grey means not significant.");

// ---------------- 6 Q2 titles ----------------
s = content("Q2 · Labels keep most of their premium after 30 skills", "The market");
tag(s, 0.5, 1.12, "Q2");
const tps = [...TP].sort((a, b) => b.premium_A_pct - a.premium_A_pct);
s.addChart(pres.charts.BAR, [{ name: "Title only (Model A)", labels: tps.map((r) => r.title_family), values: tps.map((r) => +r.premium_A_pct.toFixed(1)) },
  { name: "After 30 skills (Model B)", labels: tps.map((r) => r.title_family), values: tps.map((r) => +r.premium_B_pct.toFixed(1)) }], {
  x: 0.5, y: 1.5, w: 5.9, h: 3.65, barDir: "bar", barGrouping: "clustered", catAxisOrientation: "maxMin", chartColors: ["B9BDCB", "E8673C"], catAxisLabelPos: "low",
  showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", showValue: false, valAxisLabelFormatCode: '0"%"',
  showTitle: true, title: "% pay vs the average title", ...AX });
stat(s, 6.8, 1.5, 2.7, "62%", "of the average title premium survives the skill controls");
para(s, 6.8, 3.0, 2.7, 2.1, [[{ text: "ML Engineer +31%", bold: true }, { text: ", Data Scientist +16% at equal skills" }], [{ text: "R² 0.480 → 0.493", bold: true }, { text: " when all 30 skills are added" }], [{ text: "DA vs DS skill profiles: cosine 0.47", bold: true }]], 13);
s.addNotes("This is our core test. Model A explains pay with title, city and experience. Model B adds all 30 skills. If titles were just skills in disguise, the orange bars would collapse to zero. They don't: on average 62 percent of the premium survives, and R squared barely moves. The label itself carries pay.");

// ---------------- 7 Q2b ladder ----------------
s = content("Q2 · Same experience, different title, very different pay", "The market");
tag(s, 0.5, 1.12, "Q2");
const L = [{ job_title: "Data Analyst", premium_vs_data_analyst_pct: 0 }, ...LAD].sort((a, b) => b.premium_vs_data_analyst_pct - a.premium_vs_data_analyst_pct);
s.addChart(pres.charts.BAR, [{ name: "Premium", labels: L.map((r) => r.job_title), values: L.map((r) => +r.premium_vs_data_analyst_pct.toFixed(0)) }], {
  x: 0.5, y: 1.5, w: 5.9, h: 3.65, barDir: "bar", catAxisOrientation: "maxMin", showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '+0"%"',
  showLegend: false, chartColors: ["E8673C"], valAxisMinVal: 0, valAxisMaxVal: 240, valAxisLabelFormatCode: '0"%"', showTitle: true, title: "DS Jobs: premium vs Data Analyst at equal required experience", ...AX });
stat(s, 6.8, 1.5, 2.7, "14–36%", "what the word 'Senior' adds on top of the base role at the same experience");
para(s, 6.8, 3.1, 2.7, 2.0, [[{ text: "55% of postings", bold: true }, { text: " are Business/Data Analyst roles: the two lowest-paid titles" }], [{ text: "Demand vs pay: Spearman −0.65", bold: true }]], 13);
s.addNotes("An independent check in the Data Science Jobs file. At the same required experience, a Senior Data Scientist posting pays 194 percent more than a Data Analyst posting. The word Senior alone adds 14 to 36 percent. And the volume of jobs sits in the lowest-paid labels.");

// ---------------- 8 Q3 experience ----------------
s = content("Q3 · Pay growth is front-loaded: the first 6.5 years decide it", "The market");
tag(s, 0.5, 1.12, "Q3");
const eq = EQ.filter((r) => r.yr_group !== "21+" && +r.yr_group <= 16 && r.n >= 50);
s.addChart(pres.charts.LINE, [{ name: "Median", labels: eq.map((r) => String(r.yr_group)), values: eq.map((r) => r.median) },
  { name: "75th percentile", labels: eq.map((r) => String(r.yr_group)), values: eq.map((r) => r.p75) }], {
  x: 0.5, y: 1.5, w: 5.9, h: 3.65, chartColors: ["2A78D6", "B9BDCB"], lineSize: 2.5, lineDataSymbol: "circle", lineDataSymbolSize: 6,
  showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", showTitle: true, title: "Salary (₹ lakh) by years of experience",
  catAxisTitle: "years of experience", showCatAxisTitle: true, catAxisTitleFontSize: 10, catAxisTitleColor: "3B4466", ...AX });
stat(s, 6.8, 1.5, 1.35, "+36%", "a year, up to 6.5 years", C.accent2, 30);
stat(s, 8.2, 1.5, 1.35, "+7%", "a year after", C.accent1, 30);
para(s, 6.8, 3.1, 2.7, 2.0, [[{ text: "Break at 6.5 yrs", bold: true }, { text: " (bootstrap 95% CI 6.0–7.0)" }], [{ text: "Top earners", bold: true }, { text: " keep climbing until ~10 years" }], [{ text: "Median ₹1.5 L → ₹12.5 L", bold: true }, { text: " in the first 6–9 years" }]], 13);
s.addNotes("Piecewise regression finds a clear break at 6.5 years: about 36 percent a year before it, 7 percent after. That early window is exactly when people move from Analyst to Scientist to Senior labels.");

// ---------------- 9 Q4 juniors ----------------
pres.addSection({ title: "Inside the firm" });
s = content("Q4 · Juniors are paid for maths and storytelling, not coding", "Inside the firm");
tag(s, 0.5, 1.12, "Q4", C.accent2);
const jl = { maths_stats: "Maths & stats", storytelling: "Dashboard & storytelling", ai_and_ml: "AI & ML", big_data: "Big data", coding: "Coding" };
s.addChart(pres.charts.BAR, [{ name: "Odds ratio", labels: JOR.map((r) => jl[r.key]), values: JOR.map((r) => +r.odds_ratio_per_1SD.toFixed(1)) }], {
  x: 0.5, y: 1.5, w: 5.6, h: 3.0, barDir: "bar", catAxisOrientation: "maxMin", showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '"×"0.0',
  showLegend: false, chartColors: ["2A78D6", "2A78D6", "2A78D6", "2A78D6", "8A93A6"], valAxisMinVal: 0, valAxisMaxVal: 4.5, showTitle: true,
  title: "Odds of a HIGH hike per +1 SD of skill (grey = not significant)", ...AX });
s.addText(`Logistic regression, 118 juniors · CV AUC ${MET.hike.roc_auc.toFixed(2)} · accuracy ${(100 * MET.hike.accuracy).toFixed(0)}% vs 51% by guessing`, { x: 0.5, y: 4.6, w: 5.6, h: 0.4, fontSize: 11, color: C.text2, margin: 0, isTextBox: true });
card(s, 6.5, 1.5, 3.0, 2.15, "E8F1FB");
s.addText("Decision rule", { x: 6.7, y: 1.62, w: 2.6, h: 0.35, fontSize: 14, bold: true, color: C.accent2, margin: 0, isTextBox: true });
s.addText([{ text: "Storytelling > 4.15", options: { breakLine: true } }, { text: "AND Maths & stats > 3.55", options: { breakLine: true } }, { text: "AND AI & ML > 4.0", options: { breakLine: true } }, { text: "→ high hike", options: { bold: true } }],
  { x: 6.7, y: 2.0, w: 2.6, h: 1.5, fontSize: 14, color: C.text1, margin: 0, valign: "top", isTextBox: true });
para(s, 6.5, 3.85, 3.0, 1.2, [[{ text: "Coding alone: n.s.", bold: true }, { text: " (p = 0.19)" }], [{ text: "+1 SD maths ≈ 4× the odds", bold: true }]], 13);
s.addNotes("Inside the company, skills do matter. Maths and statistics and dashboard storytelling roughly quadruple and triple the odds of a high hike. Coding alone is not significant. A simple tree turns it into a rule a manager can use.");

// ---------------- 10 Q5 seniors ----------------
s = content("Q5 · Seniors succeed on conscientiousness and openness", "Inside the firm");
tag(s, 0.5, 1.12, "Q5", C.accent2);
const sl = { conscientiousness: "Conscientiousness", openness: "Openness", neuroticism: "Neuroticism", extraversion: "Extraversion", agreeableness: "Agreeableness" };
s.addChart(pres.charts.BAR, [{ name: "Odds ratio", labels: SOR.map((r) => sl[r.key]), values: SOR.map((r) => +r.OR_per_1SD.toFixed(1)) }], {
  x: 0.5, y: 1.5, w: 5.6, h: 3.0, barDir: "bar", catAxisOrientation: "maxMin", showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '"×"0.0',
  showLegend: false, chartColors: ["1BAF7A", "1BAF7A", "1BAF7A", "1BAF7A", "8A93A6"], valAxisMinVal: 0, valAxisMaxVal: 32, showTitle: true,
  title: "Odds of HIGH success per +1 SD of trait (grey = not significant)", ...AX });
s.addText(`161 seniors · linear logit CV AUC 0.96 · with squared terms ${MET.success.roc_auc.toFixed(3)} · accuracy ${(100 * MET.success.accuracy).toFixed(0)}% vs 53%`, { x: 0.5, y: 4.6, w: 5.6, h: 0.4, fontSize: 11, color: C.text2, margin: 0, isTextBox: true });
stat(s, 6.5, 1.5, 3.0, "89%", "success rate of the 'driven achievers' archetype (n = 88); two other archetypes never succeed", C.accent3);
para(s, 6.5, 3.15, 3.0, 1.9, [[{ text: "Rule:", bold: true }, { text: " Openness > 38.5 AND Conscientiousness > 36.5" }], [{ text: "Descriptive of this sample", bold: true }, { text: ", not a hiring test" }]], 13);
s.addNotes("For senior customer-facing data scientists, personality separates success almost perfectly. Conscientiousness and openness dominate. One personality archetype, the driven achievers, accounts for nearly all success. Because the separation is so clean, we treat this as descriptive, not as a hiring test.");

// ---------------- 11 sweet spots ----------------
s = content("Q5 · More is not always better: every trait has a sweet spot", "Inside the firm");
tag(s, 0.5, 1.12, "Q5", C.accent2);
img(s, FIGR("f10_sweet_spots"), 0.5, 1.55, 9.0, 2.4);
para(s, 0.5, 4.15, 9.0, 0.9, [[{ text: "Optima: ", bold: true }, { text: "conscientiousness ≈ 57, openness ≈ 53, extraversion ≈ 51, agreeableness ≈ 49, neuroticism ≈ 40 (scale 17–68). Squared terms lift CV AUC 0.964 → 0.975 (p < 0.001): aim high, then plateau." }]], 14);
s.addNotes("We tested whether more is always better. For all five traits it is not: each has an inverted-U with a peak inside the observed range. The effect is real but modest, so the practical message is aim high, then plateau.");

// ---------------- 12 dashboard ----------------
pres.addSection({ title: "Solution" });
s = content("The dashboard: our results as a decision tool", "Solution");
img(s, SHOT("08_salary"), 0.5, 1.25, 4.4, 2.75); img(s, SHOT("06_hike"), 5.1, 1.25, 4.4, 2.75);
s.addText("Salary estimator — 'same person, different label'", { x: 0.5, y: 4.1, w: 4.4, h: 0.3, fontSize: 12, bold: true, color: C.text1, align: "center", margin: 0, isTextBox: true });
s.addText("Junior hike simulator — shows the biggest lever", { x: 5.1, y: 4.1, w: 4.4, h: 0.3, fontSize: 12, bold: true, color: C.text1, align: "center", margin: 0, isTextBox: true });
s.addText("8 pages · 3 trained models · Streamlit · `python run_all.py` then `streamlit run app.py`", { x: 0.5, y: 4.55, w: 9, h: 0.35, fontSize: 12, color: C.text2, align: "center", margin: 0, isTextBox: true });
s.addNotes("We packaged everything into a Streamlit dashboard. The salary estimator shows the same person under different labels, which makes the title premium tangible. The hike and success simulators show which change would help most. I can demo it live if time allows.");

// ---------------- 13 verdicts ----------------
s = content("Hypotheses: what held and what did not", "Solution");
const V = [["H1", "Advanced skills carry the largest premiums", "Partly", "Java, SQL lead; big data n.s."], ["H2", "Titles are 'skills in disguise'", "Rejected", "62% of premium survives"],
  ["H3", "Pay growth slows after early years", "Supported", "Break at 6.5 yrs"], ["H4", "Coding and AI/ML drive junior hikes", "Rejected", "Maths & storytelling lead"], ["H5", "Success rises steadily with C and O", "Partly", "Sweet spots for all 5 traits"]];
const vc = { Partly: "EDA100", Rejected: "E34948", Supported: "1BAF7A" };
s.addTable([[{ text: "", options: { fill: { color: HEX.dk1 } } }, { text: "Hypothesis", options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 } } }, { text: "Verdict", options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 }, align: "center" } }, { text: "Evidence", options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk1 } } }],
  ...V.map(([h, t, v, e]) => [{ text: h, options: { bold: true } }, { text: t }, { text: v, options: { bold: true, color: "FFFFFF", fill: { color: vc[v] }, align: "center" } }, { text: e }])],
  { x: 0.5, y: 1.3, w: 9.0, colW: [0.6, 3.9, 1.4, 3.1], fontSize: 14, fontFace: "Calibri", color: HEX.dk1, border: { type: "solid", pt: 0.75, color: "D5D8E2" }, rowH: 0.55, valign: "middle" });
s.addNotes("Two of our starting beliefs were wrong. Titles are not skills in disguise, and junior hikes are not driven by coding. Experience front-loading held, and the personality story holds with an important twist: sweet spots.");

// ---------------- 14 conclusion ----------------
pres.addSection({ title: "Close" });
s = pres.addSlide({ masterName: "DARK", sectionTitle: "Close" }); n++;
s.addText("Skills open the door. Labels and experience set the price.", { placeholder: "title", fontSize: 34 });
s.addText([{ text: "Market: the label pays — 62% of title premiums survive 30 skill controls; 'Senior' alone is worth 14–36%.", options: { bullet: true, breakLine: true } },
  { text: "Career: pay grows ~36% a year until 6.5 years — the window for moving up the ladder.", options: { bullet: true, breakLine: true } },
  { text: "Inside the firm: maths, storytelling, conscientiousness and openness are rewarded.", options: { bullet: true } }], { placeholder: "body", fontSize: 16 });
s.addNotes("Our conclusion in one line: skills open the door, but labels and experience set the price. In the market, the label pays. The early years are decisive. Inside the firm, capability is rewarded: maths, storytelling, and for seniors conscientiousness and openness.");

// ---------------- 15 implications ----------------
s = content("What each stakeholder should do", "Close");
const imp = [["Students", C.accent2, ["Aim for the better-paid label your skills justify", "Learn SQL, statistics and a production language first", "Use the first 6 years to climb", "Practise storytelling"]],
  ["Employers & HR", C.accent1, ["Audit title-based pay bands", "Standardise job titles", "Make storytelling an assessed competency", "Use personality models for development, not hiring"]],
  ["Universities & SAS", C.accent3, ["Weight statistics and communication like coding", "Capstones end in a business presentation", "Bundle modelling with visual analytics in certifications", "Promote transparent, skill-based job architecture"]]];
imp.forEach(([h, col, items], i) => { const x = 0.5 + i * 3.05; card(s, x, 1.25, 2.85, 3.75);
  s.addText(h, { x: x + 0.2, y: 1.38, w: 2.45, h: 0.4, fontSize: 17, bold: true, color: col, margin: 0, isTextBox: true });
  para(s, x + 0.2, 1.9, 2.45, 3.0, items, 13); });
s.addNotes("For students: aim for the label your skills justify and use the early years. For employers: audit title-based pay and standardise titles. For universities and SAS: weight statistics and communication as heavily as coding.");

// ---------------- 16 limits + thanks ----------------
s = content("Limits, next steps — and thank you", "Close");
para(s, 0.5, 1.3, 4.3, 3.5, [[{ text: "Observational data:", bold: true }, { text: " associations, not causes" }], [{ text: "Skills are keywords", bold: true }, { text: " in postings, not verified proficiency" }],
  [{ text: "Salaries are bands", bold: true }, { text: "; people samples are single-company (118, 161)" }], [{ text: "Senior data separates almost perfectly:", bold: true }, { text: " likely synthetic or pre-screened" }]], 14);
para(s, 5.2, 1.3, 4.3, 2.2, [[{ text: "Next:", bold: true }, { text: " NLP on job descriptions for seniority and scope" }], [{ text: "Employer fixed effects", bold: true }, { text: " to separate brand from label" }], [{ text: "Re-run in SAS Model Studio", bold: true }, { text: " for governed deployment" }]], 14);
card(s, 5.2, 3.75, 4.3, 1.2, HEX.dk1);
s.addText("Thank you — questions?", { x: 5.4, y: 3.9, w: 3.9, h: 0.9, fontSize: 24, bold: true, color: C.background1, fontFace: "Cambria", align: "center", valign: "middle", margin: 0, isTextBox: true });
s.addNotes("These are associations from observational data, salaries are bands, and the people samples are small and single-company. Next we would add NLP on job descriptions and employer effects, and re-run in SAS Model Studio. Thank you, we are happy to take questions.");

pres.writeFile({ fileName: OUT }).then(async () => { await applyTheme(OUT, THEME); console.log("wrote", OUT, n, "slides"); });
