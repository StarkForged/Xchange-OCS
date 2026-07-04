/**
 * One-time admin seed script.
 * Creates the single administrator account. Safe to re-run — updates if already exists.
 *
 * Usage (from project root):
 *   node backend/scripts/seedAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const mongoose = require('mongoose')
const User     = require('../src/Models/User')

const ADMIN_EMAIL = 'stark92005@gmail.com'
const ADMIN_PASS  = 'stark@2109'
const ADMIN_NAME  = 'Admin'

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected.')

  const existing = await User.findOne({ email: ADMIN_EMAIL })

  if (existing) {
    existing.role          = 'admin'
    existing.password      = ADMIN_PASS   // pre('save') hook handles hashing
    existing.accountStatus = 'active'
    existing.name          = ADMIN_NAME
    await existing.save()
    console.log(`Admin account updated → ${ADMIN_EMAIL}`)
  } else {
    await User.create({
      name:          ADMIN_NAME,
      email:         ADMIN_EMAIL,
      password:      ADMIN_PASS,          // pre('save') hook handles hashing
      role:          'admin',
      accountStatus: 'active',
    })
    console.log(`Admin account created → ${ADMIN_EMAIL}`)
  }

  await mongoose.disconnect()
  console.log('Done.')
}

seed().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
