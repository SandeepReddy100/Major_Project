const { RISK_CONFIG } = require("../config/riskConfig");
const { extractForBatch, extractForStudent } = require("../features/featureExtractor");
const { pct, daysBetween } = require("../features/dateUtils");

/**
 * Attendance Trend Prediction — a transparent statistical baseline, not a
 * trained model. See docs/attendance-trend-prediction.md for the full
 * rationale, including why supervised forecasting is not attempted here
 * (same data-volume/class-balance gates as the At-Risk baseline).
 *
 * Reuses the exact same leakage-safe feature extraction as the At-Risk
 * system (extractForStudent/extractForBatch → computeFeatures), so
 * asOfDate discipline, session-count windows, and confidence tiers are
 * identical to riskConfig.js — no second, conflicting configuration.
 */

const MODEL = { type: "attendance-trend-projection", version: "trend-baseline-v0" };

const DISCLAIMER =
  "Projected attendance is a statistical estimate assuming the student's recent attendance rate continues unchanged over the prediction window. It is not a guaranteed outcome and does not account for future changes in circumstances, course load, or behavior.";

const LEVEL_ORDER = { DECLINING: 0, STABLE: 1, IMPROVING: 2, INSUFFICIENT_DATA: 3 };

function classifyTrend(meta, trendDelta) {
  if (!meta.scoreable || trendDelta === null || trendDelta === undefined) return "INSUFFICIENT_DATA";
  if (trendDelta <= -RISK_CONFIG.declineThreshold) return "DECLINING";
  if (trendDelta >= RISK_CONFIG.declineThreshold) return "IMPROVING";
  return "STABLE";
}

function trendStrength(direction, trendDelta) {
  if (direction === "STABLE" || direction === "INSUFFICIENT_DATA") return null;
  return Math.abs(trendDelta) >= RISK_CONFIG.declineThreshold * 2 ? "strong" : "moderate";
}

/**
 * Projects attendance forward `predictionWindowDays` by assuming the
 * student's recent per-session attendance rate (recentPct) continues,
 * scaled to however many sessions that student's own historical session
 * frequency (totalSessions / spanDays) suggests will occur in that many
 * days. Deterministic arithmetic, not a trained model.
 */
function projectForecast(meta, features) {
  const { totalSessions, attended, firstDate, lastDate } = meta;
  const spanDays = firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0;
  const horizonDays = RISK_CONFIG.predictionWindowDays;

  if (spanDays <= 0 || features.recentPct === null) return null;

  const sessionsPerDay = totalSessions / spanDays;
  const projectedSessions = Math.max(0, Math.round(sessionsPerDay * horizonDays));
  const projectedAttendedSessions = Math.min(
    projectedSessions,
    Math.max(0, Math.round(projectedSessions * (features.recentPct / 100)))
  );
  const projectedTotalSessions = totalSessions + projectedSessions;
  const projectedAttendedTotal = attended + projectedAttendedSessions;

  return {
    horizonDays,
    projectedSessions,
    projectedAttendedSessions,
    projectedTotalSessions,
    projectedAttendance: pct(projectedAttendedTotal, projectedTotalSessions)
  };
}

function buildExplanation(direction, meta, features, forecast) {
  if (direction === "INSUFFICIENT_DATA") {
    return "Too few recorded sessions to project an attendance trend for this student.";
  }

  const parts = [
    `Recent attendance over the last ${meta.recentWindowSize} sessions is ${features.recentPct}%, compared with ${features.overallPct}% overall.`
  ];

  if (direction === "DECLINING") {
    parts.push(`Attendance has dropped ${Math.abs(features.trendDelta)} percentage points compared with the prior period, so the projected attendance is lower than the current rate.`);
  } else if (direction === "IMPROVING") {
    parts.push(`Attendance has risen ${features.trendDelta} percentage points compared with the prior period, so the projected attendance is higher than the current rate.`);
  } else {
    parts.push("Attendance has stayed within a normal range compared with the prior period.");
  }

  if (forecast) {
    parts.push(`If this recent rate continues, projected attendance over the next ~${forecast.horizonDays} days is approximately ${forecast.projectedAttendance}%.`);
  }

  return parts.join(" ");
}

function buildFactors(direction, meta, features) {
  if (direction === "INSUFFICIENT_DATA") return [];

  const factors = [
    { factor: "Recent attendance rate", detail: `${features.recentPct}% over the last ${meta.recentWindowSize} sessions.` },
    { factor: "Overall attendance rate", detail: `${features.overallPct}% across ${meta.totalSessions} recorded sessions.` }
  ];

  if (features.trendDelta !== null) {
    factors.push({ factor: "Attendance trend", detail: `${features.trendDelta > 0 ? "+" : ""}${features.trendDelta} percentage points vs. the prior period.` });
  }
  if (features.consecutiveAbsences > 0) {
    factors.push({ factor: "Consecutive absences", detail: `${features.consecutiveAbsences} in a row most recently.` });
  }

  return factors;
}

/** Running attendance percentage session-by-session — for the historical-vs-projected chart. */
function buildHistory(logs) {
  let present = 0;
  return logs.map((l, i) => {
    if (l.status === "present") present += 1;
    return { sessionIndex: i + 1, date: l.date, status: l.status, runningAttendance: pct(present, i + 1) };
  });
}

function assembleTrend(computed, { includeHistory = false } = {}) {
  const { features, meta } = computed;
  const direction = classifyTrend(meta, features.trendDelta);
  const forecast = direction === "INSUFFICIENT_DATA" ? null : projectForecast(meta, features);
  const explanation = buildExplanation(direction, meta, features, forecast);
  const factors = buildFactors(direction, meta, features);

  const result = {
    rollno: computed.rollno,
    name: computed.name,
    branch: computed.branch,
    batch: computed.batch,
    sem: computed.sem,
    totalSessions: meta.totalSessions,
    attended: meta.attended,
    missed: meta.missed,
    currentAttendance: features.overallPct,
    recentAttendance: features.recentPct,
    confidence: meta.confidence,
    trend: {
      direction,
      changePoints: direction === "INSUFFICIENT_DATA" ? null : features.trendDelta,
      strength: trendStrength(direction, features.trendDelta)
    },
    forecast,
    explanation,
    factors,
    modelType: MODEL.type,
    modelVersion: MODEL.version,
    computedAt: new Date().toISOString()
  };

  if (includeHistory) result.history = buildHistory(computed.logs);
  return result;
}

async function predictStudentTrend(semname, batch, rollno, asOfDate = null) {
  const computed = await extractForStudent(semname, batch, rollno, asOfDate);
  return assembleTrend(computed, { includeHistory: true });
}

async function predictBatchTrend(semname, batch, asOfDate = null) {
  const all = await extractForBatch(semname, batch, asOfDate);
  const results = all.map((c) => assembleTrend(c, { includeHistory: false }));

  results.sort((a, b) => {
    const d = LEVEL_ORDER[a.trend.direction] - LEVEL_ORDER[b.trend.direction];
    if (d !== 0) return d;
    return (a.trend.changePoints ?? 0) - (b.trend.changePoints ?? 0);
  });

  const summary = { IMPROVING: 0, STABLE: 0, DECLINING: 0, INSUFFICIENT_DATA: 0 };
  for (const r of results) summary[r.trend.direction] += 1;

  return { sem: semname, batch, total: results.length, summary, students: results };
}

module.exports = { predictStudentTrend, predictBatchTrend, MODEL, DISCLAIMER };
