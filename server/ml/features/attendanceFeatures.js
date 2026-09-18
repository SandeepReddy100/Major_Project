const { RISK_CONFIG } = require("../config/riskConfig");
const { cleanLogs, daysBetween, pct } = require("./dateUtils");

/**
 * Pure feature computation over normalised dailyLogs.
 * NOTE: stored overallAttendance / courseAttendance counters are deliberately
 * ignored. The audit found 42% of student docs disagree with their own logs.
 */

function aggregate(logs) {
  let present = 0;
  for (const l of logs) if (l.status === "present") present += 1;
  return { total: logs.length, present, absent: logs.length - present, pct: pct(present, logs.length) };
}

function courseBreakdown(logs) {
  const map = new Map();
  for (const l of logs) {
    if (!map.has(l.course)) map.set(l.course, { course: l.course, total: 0, present: 0 });
    const c = map.get(l.course);
    c.total += 1;
    if (l.status === "present") c.present += 1;
  }
  return [...map.values()]
    .map(c => ({ ...c, pct: pct(c.present, c.total) }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}

function consecutiveAbsences(logs) {
  let streak = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].status === "absent") streak += 1;
    else break;
  }
  return streak;
}

/**
 * @param {String|null} refDate the date to measure "days since" against.
 *        Must be the batch reference date (or the cutoff date during
 *        historical scoring), not "today" — otherwise a student who simply
 *        stopped appearing in the register would show 0 instead of a large gap.
 */
function daysSinceLastPresent(logs, refDate = null) {
  if (!logs.length) return null;
  const ref = refDate || logs[logs.length - 1].date;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].status === "present") return daysBetween(logs[i].date, ref);
  }
  return daysBetween(logs[0].date, ref); // never present
}

/** Recent half vs earlier half. Falls back gracefully on sparse histories. */
function trendDelta(logs) {
  const { recentSessions } = RISK_CONFIG;
  if (logs.length < 6) return null;

  let recent, prior;
  if (logs.length >= recentSessions * 2) {
    recent = logs.slice(-recentSessions);
    prior = logs.slice(-recentSessions * 2, -recentSessions);
  } else {
    const mid = Math.floor(logs.length / 2);
    prior = logs.slice(0, mid);
    recent = logs.slice(mid);
  }

  const r = aggregate(recent).pct;
  const p = aggregate(prior).pct;
  if (r === null || p === null) return null;
  return Math.round((r - p) * 10) / 10;
}

/** @param {String|null} refDate same batch/cutoff reference date as daysSinceLastPresent. */
function calendarWindowPct(logs, refDate = null) {
  if (!logs.length) return null;
  const ref = refDate || logs[logs.length - 1].date;
  const inWindow = logs.filter(
    l => daysBetween(l.date, ref) <= RISK_CONFIG.calendarWindowDays
  );
  if (inWindow.length < 3) return null;
  return aggregate(inWindow).pct;
}

/**
 * @param {Array} dailyLogs raw logs from the attendance document
 * @param {String|null} asOfDate ISO date — features use logs <= this date only.
 *        Critical for leakage-free training in Step 6. Takes precedence over
 *        referenceDate as the "as of" point since it defines the cutoff itself.
 * @param {String|null} referenceDate batch-level reference date (the latest
 *        log date across the whole batch), used for recency features
 *        (daysSinceLastPresent, calendarPct) when asOfDate is not set, so a
 *        student who stopped appearing entirely doesn't score as "current".
 */
function computeFeatures(dailyLogs, asOfDate = null, referenceDate = null) {
  const { logs: all } = cleanLogs(dailyLogs);
  const logs = asOfDate ? all.filter(l => l.date <= asOfDate) : all;
  const ref = asOfDate || referenceDate || (logs.length ? logs[logs.length - 1].date : null);

  const { recentSessions, shortSessions, attendanceThreshold,
          minCourseSessions, minLogsForPrediction, confidenceTiers } = RISK_CONFIG;

  const overall = aggregate(logs);
  const recent = aggregate(logs.slice(-recentSessions));
  const short = aggregate(logs.slice(-shortSessions));
  const courses = courseBreakdown(logs);

  const judgedCourses = courses.filter(c => c.total >= minCourseSessions);
  const lowCourses = judgedCourses.filter(c => c.pct < attendanceThreshold);

  const confidence =
    overall.total >= confidenceTiers.high ? "high" :
    overall.total >= confidenceTiers.medium ? "medium" : "low";

  return {
    features: {
      overallPct: overall.pct,
      recentPct: recent.pct,
      shortPct: short.pct,
      calendarPct: calendarWindowPct(logs, ref),
      trendDelta: trendDelta(logs),
      consecutiveAbsences: consecutiveAbsences(logs),
      absencesInRecent: recent.absent,
      lowCourseRatio: judgedCourses.length
        ? Math.round((lowCourses.length / judgedCourses.length) * 100) / 100
        : null,
      daysSinceLastPresent: daysSinceLastPresent(logs, ref)
    },
    meta: {
      totalSessions: overall.total,
      attended: overall.present,
      missed: overall.absent,
      firstDate: logs.length ? logs[0].date : null,
      lastDate: logs.length ? logs[logs.length - 1].date : null,
      referenceDate: ref,
      recentWindowSize: recent.total,
      confidence,
      scoreable: overall.total >= minLogsForPrediction
    },
    courses,
    lowCourses,
    // Cleaned, chronologically sorted, asOfDate-filtered logs — exposed so other
    // consumers (e.g. trend projection) can build on the exact same leakage-safe
    // log set instead of re-filtering dailyLogs themselves.
    logs
  };
}

module.exports = { computeFeatures, aggregate, courseBreakdown };