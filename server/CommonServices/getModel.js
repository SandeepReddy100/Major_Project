const mongoose = require("mongoose");
const modelCache = {};

function getDynamicModel(collectionName, schema) {
  if (!schema) {
    console.error(`CRITICAL ERROR: Schema is undefined for collection: ${collectionName}`);
    return null; 
  }

  if (modelCache[collectionName]) {
    return modelCache[collectionName];
  }

  if (mongoose.models[collectionName]) {
    delete mongoose.models[collectionName];
    delete mongoose.modelSchemas[collectionName];
  }

  const Model = mongoose.model(collectionName, schema, collectionName);
  
  modelCache[collectionName] = Model;
  return Model;
}

module.exports = getDynamicModel;