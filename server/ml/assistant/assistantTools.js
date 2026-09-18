const { predictBatch, predictStudent } = require("../services/predictionService");
const { predictBatchTrend, predictStudentTrend } = require("../services/trendPredictionService");
const { canAccessBatch } = require("../../CommonServices/facultyScope");

/**
 * The assistant's entire data surface. Each function here:
 *   1. takes already-validated parameters (sem/batch/rollno),
 *   2. checks authorization BEFORE any data is fetched,
 *   3. calls the existing, unmodified prediction/trend services,
 *   4. returns a minimized plain-JSON object (no _id, no raw dailyLogs,
 *      no passwords/tokens — those were never present in these service
 *      outputs to begin with).
 *
 * There is no other path from the assistant to the database. The LLM never
 * sees a Mongoose model, a query object, or anything beyond what these
 * functions return.
 */

class ScopeError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 403;
  }
}

async function assertScope(user, sem, batch) {
  const allowed = await canAccessBatch(user, sem, batch);
  if (!allowed) throw new ScopeError("You do not have access to this semester/batch");
}

function minimizeRiskStudent(s) {
  return {
    rollno: s.rollno,
    name: s.name,
    riskLevel: s.riskLevel,
    riskProbability: s.riskProbability,
    currentAttendance: s.currentAttendance,
    confidence: s.confidence,
    lowCourses: s.lowCourses || [],
    topFactor: s.factors?.[0]?.detail || null
  };
}

function minimizeTrendStudent(s) {
  return {
    rollno: s.rollno,
    name: s.name,
    direction: s.trend.direction,
    changePoints: s.trend.changePoints,
    currentAttendance: s.currentAttendance,
    recentAttendance: s.recentAttendance,
    projectedAttendance: s.forecast?.projectedAttendance ?? null
  };
}

async function toolGetBatchRisk(user, sem, batch) {
  await assertScope(user, sem, batch);
  const result = await predictBatch(sem, batch, {});
  return {
    sem: result.sem,
    batch: result.batch,
    total: result.total,
    summary: result.summary,
    students: result.students.map(minimizeRiskStudent)
  };
}

async function toolGetStudentRisk(user, sem, batch, rollno) {
  await assertScope(user, sem, batch);
  const s = await predictStudent(sem, batch, rollno);
  return {
    rollno: s.rollno,
    name: s.name,
    branch: s.branch,
    sem: s.sem,
    batch: s.batch,
    riskLevel: s.riskLevel,
    riskProbability: s.riskProbability,
    currentAttendance: s.currentAttendance,
    totalSessions: s.totalSessions,
    attended: s.attended,
    missed: s.missed,
    confidence: s.confidence,
    factors: s.factors,
    recommendations: s.recommendations,
    lowCourses: s.lowCourses || []
  };
}

async function toolGetBatchTrend(user, sem, batch) {
  await assertScope(user, sem, batch);
  const result = await predictBatchTrend(sem, batch);
  return {
    sem: result.sem,
    batch: result.batch,
    total: result.total,
    summary: result.summary,
    students: result.students.map(minimizeTrendStudent)
  };
}

async function toolGetStudentTrend(user, sem, batch, rollno) {
  await assertScope(user, sem, batch);
  const s = await predictStudentTrend(sem, batch, rollno);
  return {
    rollno: s.rollno,
    name: s.name,
    direction: s.trend.direction,
    changePoints: s.trend.changePoints,
    currentAttendance: s.currentAttendance,
    recentAttendance: s.recentAttendance,
    forecast: s.forecast,
    explanation: s.explanation,
    factors: s.factors
  };
}

module.exports = { toolGetBatchRisk, toolGetStudentRisk, toolGetBatchTrend, toolGetStudentTrend, ScopeError };
