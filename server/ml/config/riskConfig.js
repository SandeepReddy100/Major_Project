require("dotenv").config();

const RISK_CONFIG = {

  // Institutional attendance threshold (%)
  attendanceThreshold: Number(
    process.env.RISK_ATTENDANCE_THRESHOLD || 75
  ),

  // Session-count windows (primary — data is ~2 sessions/week per student)
  recentSessions: 10,
  shortSessions: 5,

  // Calendar window (secondary, nullable)
  calendarWindowDays: 30,

  // Future window used to build the training label (days)
  predictionWindowDays: Number(
    process.env.RISK_PREDICTION_WINDOW_DAYS || 14
  ),

  // Percentage-point drop that counts as "declining"
  declineThreshold: Number(
    process.env.RISK_DECLINE_THRESHOLD || 8
  ),

  // Minimum sessions before we score at all
  minLogsForPrediction: Number(
    process.env.RISK_MIN_LOGS || 8
  ),

  // Confidence tiers by session count
  confidenceTiers: {
    high: 20,
    medium: 12
  },

  // Minimum sessions in a course before judging that course
  minCourseSessions: 3,

  // Minimum history (days) required before a cutoff date is usable
  minHistoryDays: 21,

  // Probability cut points for risk levels
  levels: {
    HIGH: 0.66,
    MEDIUM: 0.4
  },

  modelVersion:
    process.env.RISK_MODEL_VERSION || "heuristic-baseline-v0",

  // Gates that decide whether a supervised model is justified
  trainingGates: {
    minRows: 500,
    minPositiveRate: 0.05,
    maxPositiveRate: 0.60,
    minCutoffs: 4,
    minSpanDays: 56
  }
};

module.exports = { RISK_CONFIG };