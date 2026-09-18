require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { auditRiskData } = require("./dataset/auditData");

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing in .env");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected. Running read-only audit...\n");

    const report = await auditRiskData();

    const dir = path.join(__dirname, "reports");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `audit-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(file, JSON.stringify(report, null, 2));

    console.log("================ RISK DATA AUDIT ================");
    console.log(`Attendance collections : ${report.collectionsFound}`);
    console.log(`Students               : ${report.totals.students} (${report.totals.studentsWithLogs} with logs)`);
    console.log(`Total dailyLogs        : ${report.totals.totalLogs}`);
    console.log(`Unparseable dates      : ${report.totals.unparseableDates}`);
    console.log(`Counter mismatches     : ${report.totals.counterMismatch}`);
    console.log(`Max date span (days)   : ${report.totals.spanDays}`);
    console.log("------------------------------------------------");
    console.log(`Training rows          : ${report.totals.rows}`);
    console.log(`Positive labels        : ${report.totals.positives} (${(report.totals.positiveRate * 100).toFixed(1)}%)`);
    console.log(`Rolling cutoffs        : ${report.totals.cutoffs}`);
    console.log("------------------------------------------------");
    console.table(report.checks);
    console.log(`VERDICT: ${report.verdict}`);
    console.log("================================================");
    console.log(`\n📄 Full report: ${file}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Audit failed:", err.message);
    process.exit(1);
  }
})();