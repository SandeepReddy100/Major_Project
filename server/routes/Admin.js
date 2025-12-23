const express=require('express');
const {HandleSessionAttendanceReportPDF, 
      HandleSessionAttendanceReportExcel,  
      HandleMonthlyAttendanceReportExcel,
      getDashboardData,
      addFaculty,
      deleteFaculty,
      updateFaculty,
      addStudent,
      deleteStudent,
      updateStudent,
      HandleUpdateAttendance, 
      getViewStudents,
      getStudentsForAttendanceUpdation,
      getViewFaculty,
      getProfileData,
      deleteAttendanceLog} = require('../controllers/Admin');

const { updateAllStudentScores, generateAndStoreQrCodes } = require('../services/DynamicRoutes.js');

const { HandleChangePassword,
        getViewStudentData, 
        getLeaderBoardData, 
        HandleResetPassword, 
        HandleBatchAttendanceReportPDF, 
        HandleBatchAttendanceReportExcel, 
        HandleMarkAttendance,
        getStudentsByBatch,
        HandleSessionPostAttendance,
        HandleMarkAttendanceMultipleBatches} = require('../services/CommonRoutes');

const { verifyAccess, authorize } = require("../middlewares/Auth");
const router=express.Router();


//-------------------------------   Manage Dynamic Routes  Start -----------------------------//


router.post('/updateScores', updateAllStudentScores);

router.post('/updateQr', generateAndStoreQrCodes);


//-------------------------------   Manage Dynamic Routes  End -----------------------------//

// Protect all routes in this file (Admin only)
router.use(verifyAccess, authorize("admin"));



router.get("/attendance-batch-report-excel", HandleBatchAttendanceReportExcel);

router.get("/attendance-batch-report-pdf", HandleBatchAttendanceReportPDF);

router.get("/attendance-Session-report-excel", HandleSessionAttendanceReportExcel);

router.get("/attendance-Session-report-pdf", HandleSessionAttendanceReportPDF);

router.post('/Mark-Attendance', HandleMarkAttendance);

router.get('/attendance-monthly-excel', HandleMonthlyAttendanceReportExcel)

router.patch('/UpdatePassword', HandleChangePassword);

router.get('/getDashboardData',getDashboardData);

router.get('/getProfileData/:adminId', getProfileData);

router.get('/getLeaderboardData', getLeaderBoardData);

router.get('/getViewStudentData', getViewStudentData);

router.patch('/ResetPassword', HandleResetPassword);

//-------------------------------   Manage Faculty Routes  Start    ----------------------------//

router.get('/getViewFaculty',getViewFaculty)

router.post('/addFaculty', addFaculty);

router.delete('/deleteFaculty', deleteFaculty);

router.patch('/updateFaculty', updateFaculty);

//-------------------------------   Manage Faculty Routes  End      ----------------------------//


//-------------------------------   Manage Student Routes  Start    ----------------------------//

router.get('/getViewStudents',getViewStudents);

router.post('/addStudent', addStudent);

router.delete('/deleteStudent', deleteStudent);

router.patch('/updateStudent', updateStudent);

//-------------------------------   Manage Student Routes  End      ----------------------------//


//-------------------------------   Manage Attendance Routes  Start -----------------------------//

router.get('/getStudentsByBatch/:batch',getStudentsByBatch);

router.post('/Mark-Session',HandleSessionPostAttendance);

router.get('/getAbsenties', getStudentsForAttendanceUpdation);

router.patch('/updateAttendance', HandleUpdateAttendance);

router.delete('/deleterecord',deleteAttendanceLog);

router.post('/MarkAllBatchAttendance',HandleMarkAttendanceMultipleBatches);


//-------------------------------   Manage Attendance Routes  End -----------------------------//





module.exports=router;