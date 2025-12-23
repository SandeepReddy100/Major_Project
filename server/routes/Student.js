const express = require("express");
const { getLeaderBoardData, HandleChangePassword } = require("../services/CommonRoutes");
const { getDashboardData, HandleGetAnnouncements, getLogData, getProfileData } = require("../controllers/Student");
const { verifyAccess, authorize } = require("../middlewares/Auth"); // ✅ import auth

const router = express.Router();

// ✅ Protect all routes in this file (student only)
router.use(verifyAccess, authorize("student"));

// Routes
router.post("/getDashboardData", getDashboardData);
router.patch("/UpdatePassword", HandleChangePassword);
router.get("/getLeaderBoardData/:rollno", getLeaderBoardData);
router.get("/getLogData/:rollno", getLogData);
router.post("/getProfileData", getProfileData);
router.get("/GetAnnouncements/:batch", HandleGetAnnouncements);

module.exports = router;
