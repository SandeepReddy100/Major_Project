const jwt = require("jsonwebtoken");
const Faculty = require("../models/faculty");
const Admin = require("../models/admin");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const getModel = require('../CommonServices/getModel');
const studentSchema = require('../models/Student');
const CryptoJS = require("crypto-js");
require("dotenv").config();

const EncDec_SECRET_KEY = process.env.SECRET_KEY;

// =============================================  Helpers End =======================================


const findStudentGlobally = async (rollno) => {
    const allCollections = await mongoose.connection.db.listCollections().toArray();
    const targetCollections = allCollections
        .map((col) => col.name)
        .filter((name) => name.includes("SEM-students"));

    for (const collectionName of targetCollections) {
        const DynamicStudentModel = getModel(collectionName, studentSchema);
        const foundStudent = await DynamicStudentModel.findOne({ 
            rollno: new RegExp(`^${rollno}$`, "i")
        }).lean();
        if (foundStudent) return foundStudent;
    }
    return null;
};

const encryptData = (data) => {
  try {
    if (!data) return null;
    const stringData = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return CryptoJS.AES.encrypt(stringData, EncDec_SECRET_KEY).toString();
  } catch (err) {
    console.error("Encryption Logic Error:", err.message);
    return null;
  }
};

const decryptData = (ciphertext) => {
  try {
    if (!ciphertext) return null;
    
    // Replace spaces with + in case of URL encoding issues
    const normalizedCiphertext = ciphertext.replace(/ /g, '+');
    
    const bytes = CryptoJS.AES.decrypt(normalizedCiphertext, EncDec_SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      console.error("❌ Decryption produced an empty string. Key mismatch or Corrupt Payload.");
      return null;
    }

    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (err) {
    console.error("❌ Decryption Error:", err.message);
    return null;
  }
};

const getRole = (userStr) => {
      const u = userStr.toLowerCase();
      if (u.startsWith("2")) return "student"; 
      if (u.startsWith("iare")) return "faculty"; 
      if (u.startsWith("cdc")) return "admin";
      return null;
};

// =============================================  Helpers End =======================================

async function HandleLogin(req, res) {
    try {
        const { payload } = req.body;
        if (!payload) return res.status(400).json({ error: "Payload required" });

        const decryptedBody = decryptData(payload);
        if (!decryptedBody) return res.status(400).json({ error: "Decryption failed" });

        const { username, password } = decryptedBody;
        const role = getRole(username); 
        if (!role) return res.status(400).json({ error: "Invalid role" });

        let user = null;
        let identifierKey = "";

        if (role === "admin") {
            user = await Admin.findOne({ adminId: new RegExp(`^${username}$`, "i") });
            identifierKey = user?.adminId;
        } else if (role === "faculty") {
            user = await Faculty.findOne({ facultyid: new RegExp(`^${username}$`, "i") });
            identifierKey = user?.facultyid;
        } else if (role === "student") {
            user = await findStudentGlobally(username);
            identifierKey = user?.rollno;
        }

        if(!user) return res.status(401).json({ error: encryptData("user not found") });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: encryptData("Invalid credentials") });
        }

        // --- Token Generation ---
        const accessToken = jwt.sign(
            { id: user._id, role, userId: identifierKey, sem: user.sem, batch: user.batch },
            process.env.JWT_SECRET,
            { expiresIn: "180m" } 
        );

        const refreshToken = jwt.sign(
            { id: user._id, role, userId: identifierKey }, 
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "1d" } // Long lived
        );

        // --- Set Cookies ---
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        res.cookie("webToken", accessToken, { ...cookieOptions, maxAge: 180 * 60 * 1000 });
        res.cookie("refreshToken", refreshToken, { 
            ...cookieOptions, 
            path: "/api/refresh", 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        return res.status(200).json({
            data: encryptData({ message: "Login successful", role, username: identifierKey })
        });

    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

async function HandleRefreshToken(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ error: "Session expired" });

        // Verify the Refresh Token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        let user = null;
        // Re-verify user still exists
        if (decoded.role === "admin") user = await Admin.findById(decoded.id);
        else if (decoded.role === "faculty") user = await Faculty.findById(decoded.id);
        else if (decoded.role === "student") user = await findStudentGlobally(decoded.userId);

        if (!user) return res.status(401).json({ error: "User not found" });

        // Generate NEW Access Token
        const newAccessToken = jwt.sign(
            { 
                id: user._id, 
                role: decoded.role, 
                userId: decoded.userId, 
                sem: user.sem, 
                batch: user.batch 
            },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.cookie("webToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
        });

        return res.status(200).json({ status: "Success", message: "Token Refreshed" });

    } catch (err) {
        console.error("Refresh Error:", err);
        return res.status(403).json({ error: "Invalid Refresh Token" });
    }
};

async function HandleLogout(req, res) {
    res.clearCookie("webToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    return res.status(200).json({ message: "Logged out successfully" });
};

module.exports = { HandleLogin, HandleRefreshToken, HandleLogout };