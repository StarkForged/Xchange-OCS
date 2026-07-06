const Counter = require('../Models/Counter')

// Mints a gap-free, human-readable reference number: XR-2026-000154.
// Backed by an atomic $inc on a per-year Counter document, so concurrent
// submissions never collide (Mongo serializes the findOneAndUpdate).
async function generateReferenceNumber() {
  const year = new Date().getFullYear()
  const counterId = `report-${year}`

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )

  const seq = String(counter.seq).padStart(6, '0')
  return `XR-${year}-${seq}`
}

module.exports = { generateReferenceNumber }
