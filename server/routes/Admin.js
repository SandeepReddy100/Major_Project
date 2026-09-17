const router = require("express").Router();
const { createSemesterSetup,
    getAllCollections,
    deleteCollections,
    addStudents,
    createTimeTable,
    uploadTimeTable,
    getTimeTable,
    modifySemesterSetup,
    getViewStudents,
    addStudent,
    deleteStudent,
    updateStudent,
    getViewFaculty,
    addFaculty,
    deleteFaculty,
    updateFaculty,
    getStudentsForAttendanceUpdation,
    HandleUpdateAttendance,
    deleteAttendanceLog,
    HandleSessionAttendanceReportPDF,
    HandleSessionAttendanceReportExcel,
    HandleMonthlyAttendanceReportExcel,
    getDashboardData,
    getProfileData,
    sendMailToBatches,
    sendMailToIndividual,
    modifyTimeTable,
    getAllTimetables,
    CreateNewAdmin,
    deleteTimetable,
    modifyCollection,
    downloadLeaderboardPDF,
    downloadLeaderboardImage,
    generatePasswordsForAllFaculty,
    deleteBackup,
    getAllBackups,
    HandleCombinedAttendanceReport
} = require("../controllers/Admin");

const {validateAttendanceTotals } = require("../Scripts/AttendaceDaysSync");
const {validateAndCleanDataController } = require("../Scripts/DocValidator");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Coder = require("../models/coding");

const { updateLeaderboard } = require("../workflows/Scores");
const { verifyAccess, authorize } = require('../middleware/auth');
const { generateAndStoreQrCodes } = require("../workflows/Qr");



router.post('/updateScores', updateLeaderboard);

router.post('/updateQr', generateAndStoreQrCodes);


router.use(verifyAccess, authorize("admin"));


router.get("/view-students/:semname", getViewStudents);

router.post("/add-student", addStudent);

router.delete("/delete-student", deleteStudent);

router.patch("/update-student", updateStudent);

router.post("/send-mail-to-batches", sendMailToBatches);

router.post("/send-mail-to-individual", sendMailToIndividual);

router.post("/update-leaderboard", updateLeaderboard);




router.get("/view-faculty", getViewFaculty);

router.post("/add-faculty", addFaculty);

router.delete("/delete-faculty", deleteFaculty);

router.put("/update-faculty", updateFaculty);




router.get("/get-students-for-attendance-updation", getStudentsForAttendanceUpdation);

router.patch("/handle-update-attendance", HandleUpdateAttendance);

router.delete("/delete-attendance-log", deleteAttendanceLog);



router.post("/create-sem", createSemesterSetup);

router.post("/modify-sem", modifySemesterSetup);

router.get("/getcollections", getAllCollections);

router.delete("/deletecollections", deleteCollections);

router.post("/addstudents/upload", upload.single("file"), addStudents);

router.post("/uploadtimetable", upload.single("file"), uploadTimeTable);

router.post("/createtimetable", createTimeTable);

router.get("/gettimetable", getTimeTable);

router.patch("/modifytimetable", modifyTimeTable);

router.get("/get-all-timetables", getAllTimetables);

router.delete("/delete-timetable", deleteTimetable);

router.put("/modify-collection", modifyCollection);




router.get("/session-attendance-report-pdf", HandleSessionAttendanceReportPDF);

router.get("/session-attendance-report-excel", HandleSessionAttendanceReportExcel);

router.get("/monthly-attendance-report-excel", HandleMonthlyAttendanceReportExcel);

router.get("/combined-attendance-report", HandleCombinedAttendanceReport);


router.get("/dashboard-data", getDashboardData);

router.get("/profile-data", getProfileData);

router.post("/create-new-admin", CreateNewAdmin);

router.get("/get-leaderboard", downloadLeaderboardPDF);

router.get("/get-leaderboard-img", downloadLeaderboardImage);

router.post('/generate-faculty-passwords', generatePasswordsForAllFaculty);


router.delete("/delete-backup", deleteBackup);

router.get("/get-all-backups", getAllBackups);

// ----------------------------------------  Scripts  ---------------------------------------------------------------------


router.put("/validate-attendance-totals", validateAttendanceTotals);

router.put("/doc-validator", validateAndCleanDataController);


module.exports = router;