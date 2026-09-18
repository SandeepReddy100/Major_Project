const { RISK_CONFIG } = require("../../config/riskConfig");

/**
 * Logistic-form scorer with PRIOR weights, not learned weights.
 * Reports trained:false so the UI can never present it as a fitted model.
 * Step 6 replaces WEIGHTS with coefficients fitted by scikit-learn.
 */

const WEIGHTS = {
  intercept: -1.5,
  temperature: 3.0,   // damps saturation so probabilities stay interpretable
  clip: 2.0,          // z-score clamp

  terms: {
    // Primary signals
    overallPct:           { center: 78,  scale: 12,  weight: -0.90, label: "Overall attendance" },
    recentPct:            { center: 78,  scale: 15,  weight: -1.00, label: "Recent attendance" },
    trendDelta:           { center: 0,   scale: 10,  weight: -0.70, label: "Attendance trend" },
    lowCourseRatio:       { center: 0.2, scale: 0.3, weight:  0.60, label: "Courses below threshold" },
    consecutiveAbsences:  { center: 1,   scale: 2,   weight:  0.70, label: "Consecutive absences" },

    // Down-weighted: collinear with the primary signals above, kept small
    // so they still contribute to explanations without double-counting evidence.
    shortPct:             { center: 78,  scale: 20,  weight: -0.35, label: "Last few sessions" },
    calendarPct:          { center: 78,  scale: 15,  weight: -0.30, label: "Last 30 days" },
    absencesInRecent:     { center: 2,   scale: 2,   weight:  0.35, label: "Recent absences" },
    daysSinceLastPresent: { center: 5,   scale: 7,   weight:  0.40, label: "Time since last attended" }
  }
};

const sigmoid = x => 1 / (1 + Math.exp(-x));
const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));

function score(features) {
  const contributions = [];
  const unavailable = [];
  let sum = WEIGHTS.intercept;

  for (const [key, spec] of Object.entries(WEIGHTS.terms)) {
    const raw = features[key];

    if (raw === null || raw === undefined || Number.isNaN(raw)) {
      unavailable.push(key);
      continue;
    }

    const z = clamp((raw - spec.center) / spec.scale, WEIGHTS.clip);
    const contribution = spec.weight * z;
    sum += contribution;

    contributions.push({
      feature: key,
      label: spec.label,
      value: raw,
      z: Math.round(z * 100) / 100,
      contribution: Math.round(contribution * 1000) / 1000,
      direction: contribution > 0 ? "increases_risk" : "decreases_risk"
    });
  }

  const logit = sum / WEIGHTS.temperature;
  const probability = Math.round(sigmoid(logit) * 10000) / 10000; // 4dp for stable sorting

  const level =
    probability >= RISK_CONFIG.levels.HIGH ? "HIGH" :
    probability >= RISK_CONFIG.levels.MEDIUM ? "MEDIUM" : "LOW";

  contributions.sort((a, b) => b.contribution - a.contribution);

  return {
    probability,
    level,
    logit: Math.round(logit * 1000) / 1000,
    contributions,
    unavailable,
    modelType: "heuristic-logistic",
    trained: false,
    modelVersion: RISK_CONFIG.modelVersion
  };
}

module.exports = { score, WEIGHTS };