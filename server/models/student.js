const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollno: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },  
  branch: { type: String },
  batch: { type: String },
  sem:{ type: String },
  email: { type: String, required: true },
  qrData: { type: String, default:""},   
  qrLink: { type: String, default:"" },   
}, {
  timestamps: true ,
  toObject: { retainKeyOrder: true }, 
  toJSON: { retainKeyOrder: true }
});

module.exports = { studentSchema };
