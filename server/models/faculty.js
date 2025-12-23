const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  facultyid: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  designation: { type: String },  
  subjects_assigned: [String],   
  batches_assigned: [String], 

}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema, "faculty");

