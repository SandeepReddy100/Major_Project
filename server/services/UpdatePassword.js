const Student = require('../models/student');
const Faculty = require('../models/faculty');
const Admin = require('../models/admin');
const bcrypt = require("bcryptjs");

async function HandleChangePassword(req, res) {
    try {
        const { username, role, oldPassword, newPassword } = req.body;

        // Pick correct model
        let Model, Check;
        if (role === "student") { Model = Student; Check = "rollno"; }
        else if (role === "faculty") { Model = Faculty; Check = "facultyid"; }
        else if (role === "admin") { Model = Admin; Check = "adminId"; }
        else return res.status(400).json({ error: "Invalid role" });

        const query = {};
        query[Check] = new RegExp(`^${username}$`, "i");
        const user = await Model.findOne(query);

        if (!user) return res.status(404).json({ error: "User not found" });

        // Check old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "Old password is incorrect" });

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error("Password change error:", err);
        res.status(500).json({ error: "Server error" });
    }
}

async function HandleResetPassword(req, res) {
  try {
    const { username, role, targetRole, ResetPassword } = req.body;
    // 👆 added `targetRole` → whose password is being reset

    if (!username || !role || !targetRole || !ResetPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // permission checks
    if (role === "student") {
      return res.status(403).json({ error: "Students are not allowed to reset passwords" });
    }

    if (role === "faculty" && targetRole !== "student") {
      return res.status(403).json({ error: "Faculty can reset only student passwords" });
    }

    if (role === "admin" && !["student", "faculty"].includes(targetRole)) {
      return res.status(403).json({ error: "Admin can reset only student or faculty passwords" });
    }

    // pick correct model based on targetRole
    let Model, Check;
    if (targetRole === "student") { Model = Student; Check = "rollno"; }
    else if (targetRole === "faculty") { Model = Faculty; Check = "facultyid"; }
    else if (targetRole === "admin") { Model = Admin; Check = "adminId"; }
    else return res.status(400).json({ error: "Invalid target role" });

    const query = {};
    query[Check] = new RegExp(`^${username}$`, "i");

    const user = await Model.findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(ResetPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: `Password reset successfully for ${targetRole} ${username}` });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Server error" });
  }
}


module.exports={
    HandleChangePassword,
    HandleResetPassword
}