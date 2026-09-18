const { RISK_CONFIG } = require("../config/riskConfig");

const impactOf = c => (c >= 0.5 ? "high" : c >= 0.2 ? "medium" : "low");

/** Turns model contributions into sentences a faculty member can act on. */
function buildFactors(scored, computed) {
  const { features, meta, lowCourses } = computed;
  const t = RISK_CONFIG.attendanceThreshold;
  const out = [];

  for (const c of scored.contributions) {
    if (c.contribution <= 0.15) continue; // only risk-increasing, meaningful terms

    let detail = null;

    switch (c.feature) {
      case "overallPct":
        detail = `Overall attendance is ${features.overallPct}% across ${meta.totalSessions} recorded sessions.`;
        break;
      case "recentPct":
        detail = `Attendance in the last ${meta.recentWindowSize} sessions is ${features.recentPct}%.`;
        break;
      case "shortPct":
        detail = `Attendance across the most recent few sessions is ${features.shortPct}%.`;
        break;
      case "calendarPct":
        detail = `Attendance over the last 30 days is ${features.calendarPct}%.`;
        break;
      case "trendDelta":
        detail = `Attendance has moved by ${features.trendDelta} percentage points between the earlier and recent periods.`;
        break;
      case "consecutiveAbsences":
        detail = `${features.consecutiveAbsences} consecutive absences in the most recent sessions.`;
        break;
      case "absencesInRecent":
        detail = `${features.absencesInRecent} absences out of the last ${meta.recentWindowSize} sessions.`;
        break;
      case "lowCourseRatio": {
        const names = lowCourses.slice(0, 3).map(x => x.course).join(", ");
        detail = `${lowCourses.length} course(s) below ${t}%${names ? `: ${names}` : ""}.`;
        break;
      }
      case "daysSinceLastPresent":
        detail = `${features.daysSinceLastPresent} days since the last attended session.`;
        break;
      default:
        detail = c.label;
    }

    out.push({
      factor: c.label,
      detail,
      impact: impactOf(c.contribution),
      contribution: c.contribution
    });
  }

  if (!out.length) {
    out.push({
      factor: "No significant risk drivers",
      detail: "Attendance patterns are within normal range for this batch.",
      impact: "low",
      contribution: 0
    });
  }

  return out.slice(0, 5);
}

module.exports = { buildFactors };