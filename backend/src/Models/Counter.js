const mongoose = require('mongoose')

// Generic atomic sequence counter — used to mint gap-free, human-readable
// reference numbers (e.g. report reference XR-2026-000154) via
// findOneAndUpdate({ $inc }), which Mongo guarantees is atomic even under
// concurrent requests.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "report-2026"
  seq: { type: Number, default: 0 },
})

module.exports = mongoose.model('Counter', counterSchema)
