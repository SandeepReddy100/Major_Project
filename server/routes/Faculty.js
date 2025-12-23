const express = require('express');
const { HandelPostAnnouncements,  
        getDashboardData, 
        getProfileData, 
        getStudentData } = require('../controllers/Faculty');

const { getLeaderBoardData, 
        HandleResetPassword, 
        HandleChangePassword, 
        getViewStudentData, 
        HandleBatchAttendanceReportExcel, 
        HandleBatchAttendanceReportPDF, 
        HandleMarkAttendance,
        getStudentsByBatch,
        HandleSessionPostAttendance,
        HandleMarkAttendanceMultipleBatches,
        getStudentsByBatches} = require('../services/CommonRoutes');
        
const { verifyAccess, authorize } = require("../middlewares/Auth");
const { generateAndStoreQrCodes } = require('../services/DynamicRoutes.js');

const router = express.Router();
        
// Protect all routes in this file (Admin only)
router.post('/MarkAllBatchAttendance',HandleMarkAttendanceMultipleBatches);

        
router.use(verifyAccess, authorize("faculty"));
        
router.get('/getDashboardData/:facultyid', getDashboardData);

router.get('/getLeaderBoardData', getLeaderBoardData);

router.get('/getViewStudentData', getViewStudentData);

router.get('/getStudentData/:rollno', getStudentData);

router.get('/getProfileData/:facultyid',getProfileData);

router.patch('/UpdatePassword', HandleChangePassword);

router.patch('/ResetPassword', HandleResetPassword);

router.post("/announcements", HandelPostAnnouncements);

router.get('/getStudentsByBatches',getStudentsByBatches);

router.get('/getStudentsByBatch/:batch',getStudentsByBatch);

router.post('/Mark-Attendance', HandleMarkAttendance);

router.post('/Mark-Session',HandleSessionPostAttendance);


router.get("/batch-report-excel/",HandleBatchAttendanceReportExcel);

router.get("/batch-report-pdf", HandleBatchAttendanceReportPDF);

router.post('/updateQr', generateAndStoreQrCodes);



module.exports = router;