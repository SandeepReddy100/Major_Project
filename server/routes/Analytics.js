const express = require("express");
const { getBatchRisk, getStudentRisk, getMyRisk, getBatchTrend, getStudentTrend } = require("../controllers/Analytics");
const { postAssistant } = require("../controllers/Assistant");
const { verifyAccess, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(verifyAccess);

router.get("/batch-risk", authorize("faculty", "admin"), getBatchRisk);

router.get("/student-risk/:rollno", authorize("faculty", "admin"), getStudentRisk);

router.get("/my-risk", authorize("student"), getMyRisk);

router.get("/attendance-trend", authorize("faculty", "admin"), getBatchTrend);

router.get("/attendance-trend/:rollno", authorize("faculty", "admin"), getStudentTrend);

router.post("/assistant", authorize("faculty", "admin"), postAssistant);

module.exports = router;
