const express = require('express');
const { getDashboardData,
        getStudentData,
        getProfileData,
        getAllAnnouncements,
        getFacultyTimeTable
      } = require('../controllers/Faculty');

        

const router = express.Router();

const { verifyAccess, authorize } = require("../middleware/auth");
        
router.use(verifyAccess, authorize("faculty"));
        

router.get('/get-dashboard-data', getDashboardData);

router.get('/get-student-data/:rollno', getStudentData);

router.get('/get-profile-data',getProfileData);

router.get('/get-timetable-data',getFacultyTimeTable);

router.get("/get-all-announcements", getAllAnnouncements);


module.exports = router;