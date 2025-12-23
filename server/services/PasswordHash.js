// scripts/hashPasswords.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Adjust these paths to your models
const Faculty = require("../models/faculty");
const Student = require("../models/student");
const Admin = require("../models/admin");

// ✅ Utility: check if already a bcrypt hash
function isHashed(password) {
  return password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$");
}

async function hashPasswordsForModel(Model, modelName, identifierKey) {
  const users = await Model.find({});
  console.log(`Found ${users.length} ${modelName}`);

  for (const user of users) {
    if (user.password && !isHashed(user.password)) {
      // hash only plain-text passwords
      const plainPassword = user.password || user[identifierKey]; 
      const hashed = await bcrypt.hash(plainPassword, 10);
      user.password = hashed;
      await user.save();
      console.log(`🔐 Updated ${modelName} - ${user[identifierKey]}`);
    } else {
      console.log(`⏩ Skipped ${modelName} - ${user[identifierKey]} (already hashed)`);
    }
  }
}

async function run() {
  try {
    

    await hashPasswordsForModel(Faculty, "Faculty", "facultyid");
    await hashPasswordsForModel(Student, "Student", "rollno");
    await hashPasswordsForModel(Admin, "Admin", "adminId");

    console.log("✅ All passwords checked & hashed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error hashing passwords:", err);
    process.exit(1);
  }
}

module.exports=run;
