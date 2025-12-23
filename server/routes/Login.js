const express=require('express');
const { HandleLogin } = require('../controllers/Login');
const router=express.Router();

router.post('/', HandleLogin);

module.exports = router;