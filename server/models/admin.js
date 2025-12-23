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
  name : {
    type: String,
    required: true,
    unique: true
  },
});

module.exports = mongoose.model('Admin', adminSchema, 'admin');
