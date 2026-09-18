const { RISK_CONFIG } = require("../config/riskConfig");

function buildRecommendations(scored, computed) {
  const { features, meta, lowCourses } = computed;
  const t = RISK_CONFIG.attendanceThreshold;
  const recs = [];

  if (!meta.scoreable) {
    return ["Too few recorded sessions to assess. Verify attendance is being marked for this student."];
  }

  if (features.overallPct !== null && features.overallPct < t) {
    recs.push(`Attendance is below the ${t}% threshold. Prioritise attending all upcoming sessions.`);
  }

  if (features.consecutiveAbsences >= 3) {
    recs.push("Recent consecutive absences suggest a possible underlying issue. A direct conversation is advisable.");
  }

  if (features.trendDelta !== null && features.trendDelta <= -RISK_CONFIG.declineThreshold) {
    recs.push("Attendance has declined recently compared to earlier in the term. Early follow-up can reverse this.");
  }

  if (lowCourses.length) {
    const names = lowCourses.slice(0, 3).map(c => c.course).join(", ");
    recs.push(`Focus on course(s) currently below ${t}%: ${names}.`);
  }

  if (meta.confidence === "low") {
    recs.push("This assessment is based on limited data and should be verified against the attendance log.");
  }

  if (!recs.length) {
    recs.push("No action required at present. Continue monitoring.");
  }

  return recs;
}

module.exports = { buildRecommendations };