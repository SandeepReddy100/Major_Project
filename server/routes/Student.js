const express = require("express");
const {
  getDashboardData,
  HandleGetAnnouncements,
  getLogData,
  getProfileData,
  updateCodingHandles,
  getTimeTable
} = require("../controllers/Student");
const { verifyAccess, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(verifyAccess);

router.use(authorize("student"));

router.get("/get-dashboard-data", getDashboardData);

router.get("/get-log-data", getLogData);

router.get("/get-profile-data", getProfileData);

router.get("/get-timetable-data", getTimeTable);

router.patch("/update-coding-handles", updateCodingHandles);

router.get("/get-announcements", HandleGetAnnouncements);


module.exports = router;