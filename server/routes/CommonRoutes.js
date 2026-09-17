const express = require("express");
const router = express.Router();

const { 
    getLeaderBoardData,
    HandleChangePassword,
    HandleResetPassword,
    getViewStudentData,
    HandleBatchAttendanceReportPDF,
    HandleBatchAttendanceReportExcel,
    HandleMarkAttendanceByQR,
    HandleSessionPostAttendance,
    getStudentsByBatch,
    HandleMarkAttendanceMultipleBatches,
    getStudentsByBatches,
    getSemesterDetails,
    logout,
    getAttendanceConfigurations,
    createAnnouncement,
    getAllAnnouncements,
    modifyAnnouncement,
    deleteAnnouncement,
    getMe,
    backup
} = require('../CommonServices/CommonRoutes');

const { verifyAccess, authorize } = require('../middleware/auth');

router.use(verifyAccess);

// --- Allowed by Three roles  ---

router.get("/leaderboard", getLeaderBoardData);

router.patch("/auth/change-password", HandleChangePassword);

router.get("/me",getMe);

router.post("/logout",logout);


router.use(authorize('faculty', 'admin'));


router.get("/view-students/:semname", getViewStudentData);

router.get("/students-by-batch", getStudentsByBatch);

router.get("/students-by-batches", getStudentsByBatches); 

router.get("/get-sem-info/:semname", getSemesterDetails);

router.get("/get-sem-config/:semname",getAttendanceConfigurations);

router.post("/post-announcements" ,createAnnouncement);

router.get("/get-all-announcemnets",getAllAnnouncements);

router.patch("/modify-announcements",modifyAnnouncement);

router.delete("/delete-announcements/:id",deleteAnnouncement);


// --- Attendance Management Routes ---

router.post("/attendance-mark-qr", HandleMarkAttendanceByQR);

router.post("/attendance-session-post", HandleSessionPostAttendance);

router.post("/attendance-mark-multiple-qr", HandleMarkAttendanceMultipleBatches);

// Report Generation (PDF & Excel)

router.get("/attendance-report-pdf", HandleBatchAttendanceReportPDF);

router.get("/attendance-report-excel", HandleBatchAttendanceReportExcel);

// --- Account & Security Routes ---
router.patch("/auth/reset-password", HandleResetPassword);

router.post("/backup-att" , backup);





module.exports = router;