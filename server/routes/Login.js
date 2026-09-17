const express = require("express");
const router = express.Router();
const { HandleLogin, HandleRefreshToken, HandleLogout } = require("../controllers/Login");

router.post("/login", HandleLogin);

router.post("/refresh", HandleRefreshToken);

router.post("/logout", HandleLogout);

module.exports = router;