const mongoose = require("mongoose");
const { RISK_CONFIG } = require("../config/riskConfig");
const { cleanLogs, daysBetween, addDays, pct } = require("../features/dateUtils");

const ATT_MARKER = "-SEM-attendance-";

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function windowPct(logs, fromExclusive, toInclusive) {
  let total = 0, present = 0;
  for (const l of logs) {
    if (l.date > fromExclusive && l.date <= toInclusive) {
      total += 1;
      if (l.status === "present") present += 1;
    }
  }
  return { total, present, pct: pct(present, total) };
}

function upToPct(logs, cutoff) {
  let total = 0, present = 0;
  for (const l of logs) {
    if (l.date <= cutoff) {
      total += 1;
      if (l.status === "present") present += 1;
    }
  }
  return { total, present, pct: pct(present, total) };
}

async function auditCollection(name) {
  const [semPart, batch] = name.split(ATT_MARKER);
  const col = mongoose.connection.db.collection(name);

  const docs = await col
    .find({}, { projection: { rollno: 1, dailyLogs: 1, overallAttendance: 1, courseAttendance: 1 } })
    .toArray();

  const report = {
    collection: name,
    sem: semPart,
    batch,
    students: docs.length,
    studentsWithLogs: 0,
    totalLogs: 0,
    unparseableDates: 0,
    logsPerStudent: { min: null, median: 0, max: 0 },
    dateRange: { first: null, last: null, spanDays: 0, distinctDates: 0 },
    courseVariants: {},
    counterMismatch: { overall: 0, checked: 0 },
    labelFeasibility: { cutoffs: 0, rows: 0, positives: 0, positiveRate: null }
  };

  if (!docs.length) return report;

  const allDates = new Set();
  const perStudent = [];
  const counts = [];

  for (const doc of docs) {
    const { logs, unparseable } = cleanLogs(doc.dailyLogs);
    report.unparseableDates += unparseable;
    report.totalLogs += logs.length;
    if (logs.length) report.studentsWithLogs += 1;
    counts.push(logs.length);

    for (const l of logs) {
      allDates.add(l.date);
      if (!report.courseVariants[l.course]) report.courseVariants[l.course] = new Set();
      report.courseVariants[l.course].add(String(l.rawCourse));
    }

    // Counter integrity: stored overall vs recomputed from logs
    const stored = doc.overallAttendance || {};
    const recomputed = {
      total: logs.length,
      present: logs.filter(l => l.status === "present").length
    };
    report.counterMismatch.checked += 1;
    if (Number(stored.totalDays || 0) !== recomputed.total ||
        Number(stored.presentDays || 0) !== recomputed.present) {
      report.counterMismatch.overall += 1;
    }

    perStudent.push({ rollno: doc.rollno, logs });
  }

  report.logsPerStudent = {
    min: Math.min(...counts),
    median: median(counts),
    max: Math.max(...counts)
  };

  const sortedDates = [...allDates].sort();
  report.dateRange.distinctDates = sortedDates.length;
  report.dateRange.first = sortedDates[0] || null;
  report.dateRange.last = sortedDates[sortedDates.length - 1] || null;
  report.dateRange.spanDays =
    sortedDates.length > 1 ? daysBetween(sortedDates[0], sortedDates[sortedDates.length - 1]) : 0;

  for (const k of Object.keys(report.courseVariants)) {
    report.courseVariants[k] = [...report.courseVariants[k]];
  }

  // ---- Label feasibility (the decision-maker) ----
  // Features come from date <= t, label comes from (t, t+window]. No leakage.
  const { predictionWindowDays, attendanceThreshold, declineThreshold,
          minHistoryDays, minLogsForPrediction } = RISK_CONFIG;

  const first = report.dateRange.first;
  const last = report.dateRange.last;
  let rows = 0, positives = 0, cutoffs = 0;

  if (first && last) {
    let t = addDays(first, minHistoryDays);
    while (daysBetween(t, last) >= predictionWindowDays) {
      let cutoffHadRows = false;
      const horizon = addDays(t, predictionWindowDays);

      for (const s of perStudent) {
        const past = upToPct(s.logs, t);
        if (past.total < minLogsForPrediction) continue;

        const future = windowPct(s.logs, t, horizon);
        if (future.total < 3) continue; // not enough future signal to label

        rows += 1;
        cutoffHadRows = true;

        const belowThreshold = future.pct < attendanceThreshold;
        const declining = past.pct - future.pct >= declineThreshold;
        if (belowThreshold || declining) positives += 1;
      }

      if (cutoffHadRows) cutoffs += 1;
      t = addDays(t, 7); // weekly rolling cutoff
    }
  }

  report.labelFeasibility = {
    cutoffs, rows, positives,
    positiveRate: rows ? Math.round((positives / rows) * 1000) / 1000 : null
  };

  return report;
}

async function auditRiskData() {
  const all = await mongoose.connection.db.listCollections().toArray();
  const targets = all.map(c => c.name).filter(n => n.includes(ATT_MARKER)).sort();

  const perCollection = [];
  for (const name of targets) {
    perCollection.push(await auditCollection(name));
  }

  const totals = perCollection.reduce((acc, r) => {
    acc.students += r.students;
    acc.studentsWithLogs += r.studentsWithLogs;
    acc.totalLogs += r.totalLogs;
    acc.unparseableDates += r.unparseableDates;
    acc.counterMismatch += r.counterMismatch.overall;
    acc.rows += r.labelFeasibility.rows;
    acc.positives += r.labelFeasibility.positives;
    acc.cutoffs = Math.max(acc.cutoffs, r.labelFeasibility.cutoffs);
    acc.spanDays = Math.max(acc.spanDays, r.dateRange.spanDays);
    return acc;
  }, { students: 0, studentsWithLogs: 0, totalLogs: 0, unparseableDates: 0,
       counterMismatch: 0, rows: 0, positives: 0, cutoffs: 0, spanDays: 0 });

  const positiveRate = totals.rows ? totals.positives / totals.rows : 0;
  const g = RISK_CONFIG.trainingGates;

  const checks = {
    enoughRows: totals.rows >= g.minRows,
    balancedClasses: positiveRate >= g.minPositiveRate && positiveRate <= g.maxPositiveRate,
    enoughCutoffs: totals.cutoffs >= g.minCutoffs,
    enoughSpan: totals.spanDays >= g.minSpanDays
  };

  const verdict = Object.values(checks).every(Boolean)
    ? "TRAIN_SUPERVISED_MODEL"
    : "USE_TRANSPARENT_BASELINE";

  return {
    generatedAt: new Date().toISOString(),
    config: RISK_CONFIG,
    collectionsFound: targets.length,
    totals: { ...totals, positiveRate: Math.round(positiveRate * 1000) / 1000 },
    checks,
    verdict,
    perCollection
  };
}

module.exports = { auditRiskData };