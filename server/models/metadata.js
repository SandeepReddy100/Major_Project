const mongoose = require('mongoose');

const AcademicMetadataSchema = new mongoose.Schema({
  semesterName: { type: String, required: true, unique: true },        
  batches: [{
    batchName: { type: String, required: true },              
    courses: [String]                               
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AcademicMetadata', AcademicMetadataSchema, 'academic_metadata');