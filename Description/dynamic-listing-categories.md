# Dynamic Category Listing System

This document explains how Xchange implements **dynamic, category-specific listing
attributes** — i.e. how a "Mobiles" listing ends up asking for RAM/Storage while a
"Cars" listing asks for Fuel Type/Transmission, without hardcoding a form or a
schema per category.

The core idea: **the category config is data, not code.** One category-to-fields
map drives the form UI, client-side validation, server-side validation, and
storage. Add a new category or field by editing config in two places — no new
components, no schema migration.

---

## 1. The category schema (source of truth for form fields)

**File:** `frontend/src/mock/categories.js`

```js
export const categories = [
  {
    id: "mobiles",
    name: "Mobiles",
    fields: [
      { name: "brand", label: "Brand", type: "text", required: true },
      { name: "ram", label: "RAM", type: "select", options: ["4GB","6GB","8GB","12GB"], required: true },
      { name: "storage", label: "Storage", type: "select", options: ["64GB","128GB","256GB","512GB"], required: true },
      { name: "battery", label: "Battery Health (%)", type: "number", required: false }
    ]
  },
  { id: "cars", name: "Cars", fields: [ /* brand, model, fuelType, kmDriven, transmission */ ] },
  { id: "properties", name: "Properties", fields: [ /* brand, bhk, area, furnishing, ... */ ] },
  { id: "electronics", name: "Electronics", fields: [ /* brand, condition, warranty */ ] },
  { id: "furniture", name: "Furniture", fields: [ /* brand, type, material, condition */ ] },
  { id: "jobs", name: "Jobs", fields: [ /* brand, jobType, salary, experience */ ] },
  { id: "bikes", name: "Bikes", fields: [ /* brand, model, kmDriven, fuelType */ ] },
]
```

Each category is an object with:
- `id` / `name` — stored on the listing as `category: { id, name }`.
- `fields` — an array describing every dynamic attribute for that category:
  - `name` — the key the value is stored under (`attributes[name]`).
  - `label` — human-readable label shown in the form and on the detail page.
  - `type` — `"text"`, `"number"`, or `"select"` (drives which input renders).
  - `options` — only for `"select"` fields, the dropdown choices.
  - `required` — whether the field is mandatory for that category.

This array is the **single definition** of what "dynamic" means per category —
everything downstream (form rendering, validation, storage, display) reads from
it instead of special-casing category names.

---

## 2. Rendering the form dynamically

**File:** `frontend/src/pages/listings/CreateListingPage.jsx`

```js
const selectedCategory = categories.find((c) => c.id === form.category?.id)

const renderAttributeField = (field) => {
  const val = attributes[field.name] ?? ''
  if (field.type === 'select') {
    return (
      <select value={val} onChange={(e) => handleAttribute(field.name, e.target.value)}>
        <option value=''>Select {field.label}</option>
        {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      placeholder={field.label}
      value={val}
      onChange={(e) => handleAttribute(field.name, e.target.value)}
    />
  )
}

{selectedCategory?.fields?.length > 0 && (
  <div className="grid grid-cols-2 gap-3">
    {selectedCategory.fields.map((field) => (
      <div key={field.name}>
        <label>{field.label}{field.required && <span> *</span>}</label>
        {renderAttributeField(field)}
      </div>
    ))}
  </div>
)}
```

**Explanation:**
- When the user picks a category from the dropdown, `handleCategoryChange` looks
  up that category's `fields` array and **resets `attributes` to `{}`** — the
  form doesn't carry over irrelevant values from a previously-selected category.
- `selectedCategory.fields.map(...)` is what makes the form "dynamic" — the
  component has no `if (category === 'mobiles') { ...show RAM... }` branching.
  It just iterates over whatever fields the config says this category has.
- `renderAttributeField` is a small factory that picks `<select>` vs `<input>`
  based on `field.type`, so one function handles every field of every category.
- All collected values live in a flat `attributes` state object keyed by
  `field.name` (e.g. `{ brand: "Apple", ram: "8GB", storage: "128GB" }`).

### Client-side required-field validation

```js
const dynamicFields = selectedCategory?.fields || []
dynamicFields.forEach((field) => {
  if (!field.required) return
  const val = attributes[field.name]
  if (val === undefined || val === null || !String(val).trim()) {
    errs[field.name] = `${field.label} is required`
  }
})
```
This walks the *same* `fields` array to decide what's required — again, no
hardcoded per-category rules on the frontend.

---

## 3. Submitting the dynamic attributes

**File:** `frontend/src/api/listings.api.js`

```js
export const createListingAPI = async (data) => {
  const formData = new FormData()
  formData.append('title',       data.title)
  formData.append('description', data.description || '')
  formData.append('price',       JSON.stringify(data.price))
  formData.append('category',    JSON.stringify(data.category))
  formData.append('location',    JSON.stringify(data.location || {}))
  formData.append('attributes',  JSON.stringify(data.attributes || {}))
  data.images?.forEach((file) => formData.append('images', file))

  const response = await api.post('/listings', formData, {
    headers: { 'Content-Type': undefined },
  })
  return response.data
}
```

**Explanation:** Because the request is `multipart/form-data` (needed for image
uploads), every non-file field is sent as a string. The dynamic `attributes`
object — whatever shape it has for the chosen category — is JSON-stringified
into a single form field and reconstructed on the server.

---

## 4. Server-side required-field validation (never trust the client)

**File:** `backend/src/Config/categoryFields.js`

```js
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
```

**Explanation:** This is a deliberate **mirror** of the `required: true` flags
in `frontend/src/mock/categories.js`. The frontend config isn't trusted as the
enforcement layer because a client can bypass browser validation (disabled JS,
direct API calls, modified requests). So the backend keeps its own lightweight
map of `categoryId → required attribute names`, used purely for validation —
it doesn't define labels/types/options because the server doesn't need to
render a form.

**File:** `backend/src/Controllers/listing.controller.js` (`createListing`)

```js
const { getRequiredFields } = require('../Config/categoryFields')

const parse = (val) => {
  if (typeof val !== 'string') return val
  try { return JSON.parse(val) } catch { return val }
}

exports.createListing = async (req, res, next) => {
  const category   = parse(req.body.category)
  const attributes = parse(req.body.attributes) || {}
  const missing = []

  // ...other required-field checks (title, description, price, location, images)...

  // Required dynamic fields come from the category config — not hardcoded per category.
  for (const fieldName of getRequiredFields(category?.id)) {
    const val = attributes?.[fieldName]
    if (val === undefined || val === null || !String(val).trim()) {
      missing.push(fieldName)
    }
  }

  if (missing.length > 0) {
    throw new ApiError(400, `The following fields are required: ${missing.join(', ')}`)
  }

  const listing = await Listing.create({
    title, description, category, condition, price,
    images: imageUrls, seller: req.user._id, location,
    attributes,   // <-- stored as-is, whatever shape this category's fields produced
    status,
  })

  res.status(201).json({ listing })
}
```

**Explanation:**
- `parse()` un-stringifies the JSON fields that `FormData` flattened to text
  (`category`, `price`, `location`, `attributes`).
- `getRequiredFields(category.id)` looks up which attribute keys are mandatory
  for the submitted category and rejects the request (`400`) if any are
  missing/blank — this is the security-relevant re-validation.
- Attributes for fields that *aren't* required (e.g. `battery`, `kmDriven`,
  `warranty`) are accepted as-is if present, or simply absent from the object
  if the user left them blank — no per-field code needed.

---

## 5. Storage: a flexible/mixed-type field, not per-category columns

**File:** `backend/src/Models/Listing.js`

```js
const listingSchema = new mongoose.Schema({
  // ...title, description, price, images, seller, location...
  category: {
    id:   { type: String, required: true },
    name: { type: String, required: true },
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // ...
})
```

**Explanation:** This is the piece that makes the "dynamic" part actually work
at the database level. Instead of a rigid schema with a column per possible
attribute (`ram`, `bhk`, `fuelType`, `jobType`, ...) — which would require a
migration every time a category's fields changed — `attributes` is a
`Mixed` (schemaless) field. It stores whatever key/value pairs the category
produced (`{ brand, ram, storage, battery }` for mobiles, `{ brand, bhk, area,
furnishing, bathrooms, parking }` for properties, etc.) as a single embedded
document. Mongoose doesn't validate its internal shape — validation for
required attribute keys is enforced explicitly in the controller
(`getRequiredFields`), as shown above.

---

## 6. Rendering attributes back out on the listing detail page

**File:** `frontend/src/pages/listings/ListingDetailPage.jsx`

```js
const { attributes, /* ... */ } = listing
const hasAttributes = attributes && Object.keys(attributes).length > 0

const formatAttributeKey = (key) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())

{hasAttributes && (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
    {Object.entries(attributes).map(([key, value]) => (
      <div key={key}>
        <p>{formatAttributeKey(key)}</p>
        <p>{String(value)}</p>
      </div>
    ))}
  </div>
)}
```

**Explanation:** The detail page doesn't know or care which category a listing
belongs to — it just does `Object.entries(attributes)` and renders every
key/value pair as a "Product Details" tile, converting camelCase keys
(`kmDriven` → `Km Driven`) into readable labels on the fly. This is what lets
one component correctly display Mobiles' RAM/Storage, Cars' Fuel Type/
Transmission, or Properties' BHK/Area without category-specific JSX.

---

## End-to-end flow summary

```
frontend/src/mock/categories.js  (category → fields definition)
            │
            ▼
CreateListingPage.jsx renders fields dynamically per selected category
            │  (attributes state: { brand: "Apple", ram: "8GB", ... })
            ▼
listings.api.js JSON.stringifies `attributes` into FormData
            │
            ▼  (multipart POST /api/listings)
listing.controller.js `parse()`s attributes back into an object
            │
            ▼
categoryFields.js `getRequiredFields(category.id)` re-validates required keys
            │
            ▼
Listing.js stores `attributes` as Schema.Types.Mixed (no fixed shape)
            │
            ▼
ListingDetailPage.jsx / ListingCard.jsx render `Object.entries(attributes)`
generically as "Product Details" tiles
```

### Why this design

- **Single source of truth (mostly):** the frontend `categories.js` fields
  array drives the UI; the backend `categoryFields.js` mirrors only the
  `required` subset needed for trust-boundary validation.
- **No schema changes to add a category:** add an entry to `categories.js`
  (frontend) and `CATEGORY_REQUIRED_FIELDS` (backend) — the model, controller,
  form renderer, and detail page all keep working unmodified.
- **Security:** required-field validation is enforced server-side
  independently of the client, since `attributes` arrives as unstructured
  JSON inside a multipart request and the client's validation can be bypassed.
- **Trade-off:** because `attributes` is `Mixed`, there's no DB-level type
  enforcement or indexing on individual attribute keys (e.g. can't efficiently
  query "all mobiles with RAM = 8GB" without a Mongo query on a nested mixed
  field). This is acceptable at the project's current scale where filtering is
  mainly by category, price, and text search — not by dynamic attribute value.
