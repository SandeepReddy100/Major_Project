const express = require("express");
const connectDB = require("./connect");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const cron = require("node-cron");
const mongoose = require('mongoose');
 

const app = express();

app.use(cors({
  origin: [
    "https://cdciare.in",
    "https://www.cdciare.in",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "https://cdc-portal-sigma.vercel.app",
    "https://cdc-portal-7ufq3fho3-tavva-sandeep-kumar-reddys-projects.vercel.app",
    "https://cdc-beta-app.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(cookieParser());
app.use(express.json());

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const adminRoutes = require("./routes/Admin");
const loginRoutes = require("./routes/Login");
const studentRoutes = require("./routes/Student");
const facultyRoutes = require("./routes/Faculty");
const analyticsRoutes = require("./routes/Analytics");
const commonRoutes = require("./routes/CommonRoutes");
const { generateAndStoreQrCodes } = require("./workflows/Qr");
const { updateLeaderboard } = require("./workflows/Scores");
const {syncAttendanceTotals} = require("./Scripts/DaysValidation");
const {validateAndCleanData} = require("./Scripts/DocValidator");
const { validateAndSyncAttendanceLogs } = require("./Scripts/AttendaceDaysSync");


app.use("/api/admin", adminRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", commonRoutes);

// 🔹 Connect DB first
connectDB();

const PORT = process.env.PORT || 5000;


// cron.schedule(
//   "48 23 * * *",
//   async () => {
//     console.log("⏰ Cron started: Generating QR codes (12:24 AM IST)");
//     try {
//       await updateLeaderboard();
//       console.log("✅ QR generation completed");
//     } catch (err) {
//       console.error("❌ QR cron failed:", err);
//     }
//   },
//   {
//     timezone: "Asia/Kolkata" // ⭐ IMPORTANT
//   }
// );

// const runCron = (label) =>
//   async () => {
//     console.log(`⏰ Cron started (${label} IST)`);
//     try {
//       await generateAndStoreQrCodes();
//       console.log("✅ QR generation completed");
//     } catch (err) {
//       console.error("❌ QR cron failed:", err);
//     }
//   };

// cron.schedule("00 03 * * *", runCron("3:15 AM"), { timezone: "Asia/Kolkata" });
// cron.schedule("47 22 * * *", runCron("5:00 PM"), { timezone: "Asia/Kolkata" });
// cron.schedule("18 10 * * *", runCron("5:00 PM"), { timezone: "Asia/Kolkata" });

// mongoose.connection.once("open", async () => {
//   // Uncomment the line below if you want it to run IMMEDIATELY every time you save/restart the server
//   await validateAndSyncAttendanceLogs(); 
// });

// cron.schedule('0 2 * * *', async () => {
//   console.log('Running nightly attendance integrity check...');
//   await syncAttendanceTotals();
// });


// ... your app.listen() or database connection code ...

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
