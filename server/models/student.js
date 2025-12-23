const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollno: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },  
  branch: { type: String },
  batch: { type: String },
  email: { type: String, required: true },
  qrData: { type: String },   
  qrLink: { type: String },   
}, {
  timestamps: true 
});

module.exports = mongoose.model('Student', studentSchema);
