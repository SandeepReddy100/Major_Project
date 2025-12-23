const express = require("express");
const connectDB = require("./Connect");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const Run=require('./services/PasswordHash')

const LoginRouter = require("./routes/Login");
const StudentRouter = require("./routes/Student");
const FacultyRouter = require("./routes/Faculty");
const AdminRouter = require("./routes/Admin");


const app = express();
const cookieParser = require("cookie-parser");
const { generateAndStoreQrCodes } = require("./services/DynamicRoutes");

// Middlewares
app.use(cookieParser());
app.use(express.json()); // ✅ only once
app.use(cors({
 origin: [
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "https://cdc-portal-sigma.vercel.app",
    "https://cdc-portal-7ufq3fho3-tavva-sandeep-kumar-reddys-projects.vercel.app"
  ],  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
// app.use(cors())

// Database connection
connectDB();

// Run();

// Routes
app.use("/api/login", LoginRouter);
app.use("/api/Student", StudentRouter);
app.use("/api/Faculty", FacultyRouter);
app.use("/api/Admin", AdminRouter);


// generateAndStoreQrCodes();


// Start server
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});
