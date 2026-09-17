const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  Workspace_email: {
    type: String
  },
  Workspace_password: {
    type: String
  },
  name : {
    type: String,
    required: true,
    unique: true
  },
});

module.exports = mongoose.model('Admin', adminSchema, 'admin');
