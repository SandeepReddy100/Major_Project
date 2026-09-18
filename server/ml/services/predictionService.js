const { RISK_CONFIG } = require("../config/riskConfig");
const { extractForBatch, extractForStudent } = require("../features/featureExtractor");
const { score } = require("../models/scorer/baselineScorer");
const { buildFactors } = require("./explanationService");
const { buildRecommendations } = require("./recommendationService");

const LEVEL_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2, INSUFFICIENT_DATA: 3 };

function assemble(computed) {
  const base = {
    rollno: computed.rollno,
    name: computed.name,
    branch: computed.branch,
    batch: computed.batch,
    sem: computed.sem,
    currentAttendance: computed.features.overallPct,
    totalSessions: computed.meta.totalSessions,
    attended: computed.meta.attended,
    missed: computed.meta.missed,
    confidence: computed.meta.confidence,
    modelVersion: RISK_CONFIG.modelVersion,
    computedAt: new Date().toISOString()
  };

  if (!computed.meta.scoreable) {
    return {
      ...base,
      riskLevel: "INSUFFICIENT_DATA",
      riskProbability: null,
      modelType: "heuristic-logistic",
      trained: false,
      factors: [],
      recommendations: buildRecommendations(null, computed)
    };
  }

  const scored = score(computed.features);

  return {
    ...base,
    riskLevel: scored.level,
    riskProbability: scored.probability,
    modelType: scored.modelType,
    trained: scored.trained,
    factors: buildFactors(scored, computed),
    recommendations: buildRecommendations(scored, computed),
    features: computed.features,
    lowCourses: computed.lowCourses.map(c => ({ course: c.course, pct: c.pct, total: c.total }))
  };
}

async function predictStudent(semname, batch, rollno, asOfDate = null) {
  const computed = await extractForStudent(semname, batch, rollno, asOfDate);
  return assemble(computed);
}

async function predictBatch(semname, batch, { level = null, asOfDate = null } = {}) {
  const all = await extractForBatch(semname, batch, asOfDate);
  let results = all.map(assemble);

  if (level) {
    const wanted = String(level).toUpperCase();
    results = results.filter(r => r.riskLevel === wanted);
  }

  results.sort((a, b) => {
    const d = LEVEL_ORDER[a.riskLevel] - LEVEL_ORDER[b.riskLevel];
    if (d !== 0) return d;
    return (b.riskProbability ?? -1) - (a.riskProbability ?? -1);
  });

  const summary = { HIGH: 0, MEDIUM: 0, LOW: 0, INSUFFICIENT_DATA: 0 };
  for (const r of results) summary[r.riskLevel] += 1;

  return { sem: semname, batch, total: results.length, summary, students: results };
}

module.exports = { predictStudent, predictBatch };