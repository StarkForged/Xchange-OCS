import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { categories } from '../../mock/categories'
import { createListing } from '../../features/listings/listings.service'
import useAuthStore from '../../store/auth.Store'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'West Bengal',
]

const initialForm = {
  title: '',
  description: '',
  price: { amount: '', negotiable: false },
  category: null,
  location: { city: '', state: '' },
}

export default function CreateListingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [form, setForm] = useState(initialForm)
  const [attributes, setAttributes] = useState({})
  const [imagePreviews, setImagePreviews] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const selectedCategory = categories.find((c) => c.id === form.category?.id)

  // --- Handlers ---

  const set = (path, value) => {
    setForm((prev) => {
      const updated = { ...prev }
      const keys = path.split('.')
      let ref = updated
      for (let i = 0; i < keys.length - 1; i++) {
        ref[keys[i]] = { ...ref[keys[i]] }
        ref = ref[keys[i]]
      }
      ref[keys[keys.length - 1]] = value
      return updated
    })
    setErrors((e) => ({ ...e, [path]: undefined }))
  }

  const handleCategoryChange = (e) => {
    const cat = categories.find((c) => c.id === e.target.value)
    setForm((prev) => ({ ...prev, category: cat ? { id: cat.id, name: cat.name } : null }))
    setAttributes({})
    setErrors((e) => ({ ...e, category: undefined }))
  }

  const handleAttribute = (name, value) => {
    setAttributes((prev) => ({ ...prev, [name]: value }))
  }

  const handleImages = (e) => {
    const files = Array.from(e.target.files)
    const previews = files.map((f) => URL.createObjectURL(f))
    setImagePreviews((prev) => [...prev, ...previews].slice(0, 5))
  }

  const removeImage = (index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // --- Validation ---

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (!form.price.amount || isNaN(form.price.amount) || Number(form.price.amount) <= 0)
      errs['price.amount'] = 'Enter a valid price'
    if (!form.category) errs.category = 'Select a category'
    if (!form.location.city.trim()) errs['location.city'] = 'City is required'
    if (!form.location.state) errs['location.state'] = 'State is required'
    return errs
  }

  // --- Submit ---

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await createListing({
        title: form.title.trim(),
        description: form.description.trim(),
        price: { amount: Number(form.price.amount), negotiable: form.price.negotiable },
        category: form.category,
        attributes,
        images: imagePreviews,
        seller: user?._id || 'user_unknown',
        location: { city: form.location.city.trim(), state: form.location.state },
      })
      navigate('/listings')
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // --- Field helpers ---

  const inputCls = (key) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      errors[key] ? 'border-red-400' : 'border-gray-300'
    }`

  const renderAttributeField = (field) => {
    const val = attributes[field.name] ?? ''
    if (field.type === 'select') {
      return (
        <select
          key={field.name}
          value={val}
          onChange={(e) => handleAttribute(field.name, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value=''>Select {field.label}</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }
    return (
      <input
        key={field.name}
        type={field.type === 'number' ? 'number' : 'text'}
        placeholder={field.label}
        value={val}
        onChange={(e) => handleAttribute(field.name, e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Listing</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Info</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              placeholder="e.g. iPhone 13 128GB"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputCls('title')}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe your item..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={inputCls('description')}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>
        </section>

        {/* Price */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Price</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              placeholder="e.g. 15000"
              min="0"
              value={form.price.amount}
              onChange={(e) => set('price.amount', e.target.value)}
              className={inputCls('price.amount')}
            />
            {errors['price.amount'] && <p className="text-xs text-red-500 mt-1">{errors['price.amount']}</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.price.negotiable}
              onChange={(e) => set('price.negotiable', e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">Price is negotiable</span>
          </label>
        </section>

        {/* Category */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Category</h2>

          <div>
            <select
              value={form.category?.id || ''}
              onChange={handleCategoryChange}
              className={inputCls('category')}
            >
              <option value=''>Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>

          {/* Dynamic Attributes */}
          {selectedCategory?.fields?.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {selectedCategory.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                  {renderAttributeField(field)}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Location */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Location</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. Mumbai"
                value={form.location.city}
                onChange={(e) => set('location.city', e.target.value)}
                className={inputCls('location.city')}
              />
              {errors['location.city'] && <p className="text-xs text-red-500 mt-1">{errors['location.city']}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={form.location.state}
                onChange={(e) => set('location.state', e.target.value)}
                className={inputCls('location.state')}
              >
                <option value=''>Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors['location.state'] && <p className="text-xs text-red-500 mt-1">{errors['location.state']}</p>}
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Images (up to 5)</h2>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-6 cursor-pointer hover:border-indigo-400 transition-colors">
            <span className="text-sm text-gray-500">Click to upload photos</span>
            <span className="text-xs text-gray-400 mt-1">JPG, PNG — preview only</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImages}
            />
          </label>

          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit */}
        {errors.submit && (
          <p className="text-sm text-red-500 text-center">{errors.submit}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/listings')}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Publishing...' : 'Publish Listing'}
          </button>
        </div>

      </form>
    </div>
  )
}
