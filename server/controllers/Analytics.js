const { RISK_CONFIG } = require("../ml/config/riskConfig");
const { predictBatch, predictStudent } = require("../ml/services/predictionService");
const { predictBatchTrend, predictStudentTrend, MODEL: TREND_MODEL, DISCLAIMER: TREND_DISCLAIMER } = require("../ml/services/trendPredictionService");
const { canAccessBatch } = require("../CommonServices/facultyScope");

const DISCLAIMER =
  "Decision-support signal based on recorded attendance patterns. Not a prediction of academic outcome. Review the underlying attendance log before acting.";

const LEVELS = ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"];

/** Reads model identity from the actual prediction output — never hard-coded here. */
function modelMeta(sample) {
  return {
    version: RISK_CONFIG.modelVersion,
    trained: sample ? sample.trained : false,
    type: sample ? sample.modelType : "heuristic-logistic"
  };
}

function handleServiceError(err, res) {
  if (err && err.statusCode) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  console.error("Analytics error:", err);
  return res.status(500).json({ success: false, error: "Server error" });
}

/** GET /api/analytics/batch-risk?semname=&batch=&level= */
async function getBatchRisk(req, res) {
  try {
    const { semname, batch, level } = req.query;

    if (!semname || !batch) {
      return res.status(400).json({ success: false, error: "semname and batch query parameters are required" });
    }

    if (level && !LEVELS.includes(String(level).toUpperCase())) {
      return res.status(400).json({ success: false, error: `level must be one of ${LEVELS.join(", ")}` });
    }

    const allowed = await canAccessBatch(req.user, semname, batch);
    if (!allowed) {
      return res.status(403).json({ success: false, error: "You do not have access to this semester/batch" });
    }

    const result = await predictBatch(semname, batch, { level: level ? level.toUpperCase() : null });

    return res.status(200).json({
      success: true,
      data: {
        sem: result.sem,
        batch: result.batch,
        total: result.total,
        summary: result.summary,
        students: result.students
      },
      model: modelMeta(result.students[0]),
      disclaimer: DISCLAIMER
    });
  } catch (err) {
    return handleServiceError(err, res);
  }
}

/** GET /api/analytics/student-risk/:rollno?semname=&batch= */
async function getStudentRisk(req, res) {
  try {
    const { rollno } = req.params;
    const { semname, batch } = req.query;

    if (!rollno || !semname || !batch) {
      return res.status(400).json({ success: false, error: "semname, batch and rollno are required" });
    }

    const allowed = await canAccessBatch(req.user, semname, batch);
    if (!allowed) {
      return res.status(403).json({ success: false, error: "You do not have access to this semester/batch" });
    }

    const student = await predictStudent(semname, batch, rollno);

    return res.status(200).json({
      success: true,
      data: student,
      model: modelMeta(student),
      disclaimer: DISCLAIMER
    });
  } catch (err) {
    return handleServiceError(err, res);
  }
}

/** GET /api/analytics/my-risk — identity comes only from the token, never from the request. */
async function getMyRisk(req, res) {
  try {
    const { userId, sem, batch } = req.user;
    const rollno = userId;

    if (!rollno || !sem || !batch) {
      return res.status(400).json({ success: false, error: "Student sem/batch not found on token" });
    }

    const student = await predictStudent(sem, batch, rollno);

    // Students see the risk status and explanations, never the raw probability.
    const { riskProbability, ...studentSafeView } = student;

    return res.status(200).json({
      success: true,
      data: studentSafeView,
      model: modelMeta(student),
      disclaimer: DISCLAIMER
    });
  } catch (err) {
    return handleServiceError(err, res);
  }
}

/** GET /api/analytics/attendance-trend?semname=&batch= */
async function getBatchTrend(req, res) {
  try {
    const { semname, batch } = req.query;

    if (!semname || !batch) {
      return res.status(400).json({ success: false, error: "semname and batch query parameters are required" });
    }

    const allowed = await canAccessBatch(req.user, semname, batch);
    if (!allowed) {
      return res.status(403).json({ success: false, error: "You do not have access to this semester/batch" });
    }

    const result = await predictBatchTrend(semname, batch);

    return res.status(200).json({
      success: true,
      data: {
        sem: result.sem,
        batch: result.batch,
        total: result.total,
        summary: result.summary,
        students: result.students
      },
      model: TREND_MODEL,
      disclaimer: TREND_DISCLAIMER
    });
  } catch (err) {
    return handleServiceError(err, res);
  }
}

/** GET /api/analytics/attendance-trend/:rollno?semname=&batch= */
async function getStudentTrend(req, res) {
  try {
    const { rollno } = req.params;
    const { semname, batch } = req.query;

    if (!rollno || !semname || !batch) {
      return res.status(400).json({ success: false, error: "semname, batch and rollno are required" });
    }

    const allowed = await canAccessBatch(req.user, semname, batch);
    if (!allowed) {
      return res.status(403).json({ success: false, error: "You do not have access to this semester/batch" });
    }

    const student = await predictStudentTrend(semname, batch, rollno);

    return res.status(200).json({
      success: true,
      data: student,
      model: TREND_MODEL,
      disclaimer: TREND_DISCLAIMER
    });
  } catch (err) {
    return handleServiceError(err, res);
  }
}

module.exports = { getBatchRisk, getStudentRisk, getMyRisk, getBatchTrend, getStudentTrend };
