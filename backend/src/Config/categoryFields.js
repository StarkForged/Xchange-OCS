// Required dynamic-attribute fields per category, mirroring the `required`
// flags in frontend/src/mock/categories.js. Kept here (rather than trusting
// the client) so submission is rejected server-side even if the frontend
// validation is bypassed.
const CATEGORY_REQUIRED_FIELDS = {
  mobiles:     ['brand', 'ram', 'storage'],
  cars:        ['brand', 'model', 'fuelType'],
  properties:  ['brand', 'bhk', 'area'],
  electronics: ['brand', 'condition'],
  furniture:   ['brand', 'type'],
  jobs:        ['brand', 'jobType'],
  bikes:       ['brand', 'model', 'fuelType'],
}

function getRequiredFields(categoryId) {
  return CATEGORY_REQUIRED_FIELDS[categoryId] || []
}

module.exports = { CATEGORY_REQUIRED_FIELDS, getRequiredFields }
