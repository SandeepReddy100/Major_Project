const express = require('express');

const mongoose = require("mongoose");
const attendanceSchema = require("../models/attendance.model");

const modelCache = {};

function getAttendanceModel(collectionName) {
  if (modelCache[collectionName]) {
    return modelCache[collectionName];
  }

  if (mongoose.models[collectionName]) {
    modelCache[collectionName] = mongoose.model(collectionName);
  } else {
    // 🟢 Safe: only binds schema, does NOT create a new collection in DB
    modelCache[collectionName] = mongoose.model(
      collectionName,
      attendanceSchema,
      collectionName
    );
  }

  return modelCache[collectionName];
}

module.exports = getAttendanceModel;
