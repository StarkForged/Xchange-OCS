import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { categories } from '../../mock/categories'
import { createListing } from '../../features/listings/listings.service'
import useAuthStore from '../../store/auth.Store'

const LOCATION_DATA = {
  'Andhra Pradesh': {
    Visakhapatnam: ['MVP Colony', 'Gajuwaka', 'Rushikonda', 'Dwaraka Nagar', 'Seethammadhara'],
    Vijayawada: ['Benz Circle', 'Governorpet', 'Labbipet', 'Auto Nagar', 'MG Road'],
    Guntur: ['Brodipet', 'Arundelpet', 'Nagarampalem', 'Kothapet'],
  },
  Delhi: {
    'New Delhi': ['Connaught Place', 'Karol Bagh', 'Saket', 'Rohini', 'Dwarka', 'Pitampura'],
    'South Delhi': ['Lajpat Nagar', 'Greater Kailash', 'Malviya Nagar', 'Hauz Khas', 'Sarita Vihar'],
    'East Delhi': ['Laxmi Nagar', 'Mayur Vihar', 'Patparganj', 'Preet Vihar'],
    'West Delhi': ['Rajouri Garden', 'Janakpuri', 'Tilak Nagar', 'Uttam Nagar'],
  },
  Goa: {
    Panaji: ['Fontainhas', 'Miramar', 'Caranzalem', 'Dona Paula'],
    Margao: ['Fatorda', 'Aquem', 'Gogol'],
    Mapusa: ['Calangute', 'Anjuna', 'Vagator', 'Porvorim'],
  },
  Gujarat: {
    Ahmedabad: ['Navrangpura', 'Vastrapur', 'Satellite', 'Maninagar', 'Bopal', 'SG Highway', 'Prahlad Nagar'],
    Surat: ['Adajan', 'Vesu', 'Pal', 'Athwa', 'Katargam', 'Udhna'],
    Vadodara: ['Alkapuri', 'Fatehgunj', 'Manjalpur', 'Gotri', 'Karelibaug'],
    Rajkot: ['Race Course', 'Kalawad Road', 'Raiya Road', 'Aji Dam Road'],
  },
  Haryana: {
    Gurugram: ['DLF Phase 1', 'Cyber City', 'Sohna Road', 'Golf Course Road', 'Sector 14', 'MG Road'],
    Faridabad: ['Sector 21', 'NIT Faridabad', 'Sector 15', 'Old Faridabad'],
    Ambala: ['Ambala City', 'Ambala Cantt', 'Model Town'],
    Panipat: ['Sector 11', 'Sector 12', 'Tehsil Camp'],
  },
  Karnataka: {
    Bengaluru: ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Electronic City', 'Jayanagar', 'Marathahalli', 'Bannerghatta Road'],
    Mysuru: ['Vijayanagar', 'Kuvempunagar', 'Gokulam', 'Saraswathipuram', 'Hebbal'],
    Mangaluru: ['Hampankatta', 'Balmatta', 'Kadri', 'Kankanady'],
    Hubballi: ['Vidyanagar', 'Gokul Road', 'Navanagar'],
  },
  Kerala: {
    Kochi: ['Ernakulam', 'Kakkanad', 'Edapally', 'Thripunithura', 'Aluva', 'Kaloor'],
    Thiruvananthapuram: ['Kowdiar', 'Vazhuthacaud', 'Pattom', 'Kesavadasapuram', 'Sreekaryam'],
    Kozhikode: ['Calicut Beach', 'Mavoor Road', 'Palayam', 'Westhill'],
    Thrissur: ['Round South', 'Ayyanthole', 'Punkunnam'],
  },
  'Madhya Pradesh': {
    Bhopal: ['MP Nagar', 'Arera Colony', 'Kolar Road', 'Bittan Market', 'Shahpura'],
    Indore: ['Vijay Nagar', 'Palasia', 'Sapna Sangeeta', 'Geeta Bhawan', 'Rajwada', 'MR-9'],
    Jabalpur: ['Napier Town', 'Civil Lines', 'Gorakhpur', 'Adhartal'],
    Gwalior: ['Lashkar', 'Morena Road', 'City Centre'],
  },
  Maharashtra: {
    Mumbai: ['Andheri', 'Bandra', 'Dadar', 'Kurla', 'Borivali', 'Worli', 'Powai', 'Juhu', 'Malad'],
    Pune: ['Kothrud', 'Hadapsar', 'Wakad', 'Baner', 'Hinjewadi', 'Aundh', 'Koregaon Park', 'Viman Nagar'],
    Nagpur: ['Dharampeth', 'Sadar', 'Sitabuldi', 'Manish Nagar', 'Wardha Road', 'Shankar Nagar'],
    Nashik: ['College Road', 'Gangapur Road', 'Indira Nagar', 'Panchvati'],
  },
  Punjab: {
    Chandigarh: ['Sector 17', 'Sector 22', 'Sector 35', 'Sector 8', 'Sector 26', 'Mohali Phase 7'],
    Ludhiana: ['Model Town', 'Sarabha Nagar', 'BRS Nagar', 'Dugri'],
    Amritsar: ['Lawrence Road', 'Ranjit Avenue', 'Green Avenue', 'Majitha Road'],
    Jalandhar: ['Model Town', 'Nakodar Road', 'Guru Nanak Pura'],
  },
  Rajasthan: {
    Jaipur: ['Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Tonk Road', 'Mansarovar', 'Jagatpura'],
    Udaipur: ['Hiran Magri', 'Fateh Sagar', 'Sukhadia Circle', 'Sector 11'],
    Jodhpur: ['Paota', 'Ratanada', 'Shastri Nagar', 'Sardarpura'],
    Kota: ['Talwandi', 'Vigyan Nagar', 'Rangbari'],
  },
  'Tamil Nadu': {
    Chennai: ['Anna Nagar', 'T. Nagar', 'Velachery', 'OMR', 'Adyar', 'Porur', 'Tambaram', 'Perambur'],
    Coimbatore: ['RS Puram', 'Gandhipuram', 'Peelamedu', 'Saibaba Colony', 'Singanallur'],
    Madurai: ['Anna Nagar', 'KK Nagar', 'Mattuthavani', 'Bypass Road'],
    Salem: ['Fairlands', 'Hasthampatti', 'Suramangalam'],
  },
  Telangana: {
    Hyderabad: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Hitech City', 'Madhapur', 'Kondapur', 'Secunderabad', 'Kukatpally'],
    Warangal: ['Hanamkonda', 'Kazipet', 'Subedari', 'Warangal Urban'],
    Nizamabad: ['Dichpally', 'Jakranpally', 'Bodhan'],
  },
  'Uttar Pradesh': {
    Lucknow: ['Gomti Nagar', 'Hazratganj', 'Alambagh', 'Indira Nagar', 'Aliganj', 'Vikas Nagar'],
    Kanpur: ['Civil Lines', 'Kidwai Nagar', 'Kakadeo', 'Harsh Nagar', 'Swaroop Nagar'],
    Agra: ['Taj Ganj', 'Sikandra', 'Kamla Nagar', 'Sanjay Place', 'Bodla'],
    Varanasi: ['Sigra', 'Lanka', 'Assi Ghat', 'Bhelupur', 'Nadesar'],
    Noida: ['Sector 18', 'Sector 62', 'Sector 137', 'Greater Noida', 'Sector 50'],
    Prayagraj: ['Civil Lines', 'George Town', 'Naini', 'Allapur'],
  },
  'West Bengal': {
    Kolkata: ['Park Street', 'Salt Lake', 'Howrah', 'Behala', 'Dum Dum', 'New Town', 'Ballygunge'],
    Siliguri: ['Sevoke Road', 'Hill Cart Road', 'Pradhan Nagar', 'Matigara'],
    Asansol: ['Burnpur', 'Raniganj', 'Kulti'],
  },
}

const initialForm = {
  title: '',
  description: '',
  price: { amount: '', negotiable: false },
  category: null,
  location: { state: '', city: '', area: '' },
}

export default function CreateListingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [form, setForm] = useState(initialForm)
  const [attributes, setAttributes] = useState({})
  const [imageFiles, setImageFiles]       = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [coverIndex, setCoverIndex]       = useState(0)
  const [areaSelect, setAreaSelect] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const selectedCategory = categories.find((c) => c.id === form.category?.id)
  const citiesForState = form.location.state ? Object.keys(LOCATION_DATA[form.location.state] || {}) : []
  const areasForCity =
    form.location.state && form.location.city
      ? LOCATION_DATA[form.location.state]?.[form.location.city] || []
      : []

  // --- Generic deep-set helper ---
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

  // --- Category ---
  const handleCategoryChange = (e) => {
    const cat = categories.find((c) => c.id === e.target.value)
    setForm((prev) => ({ ...prev, category: cat ? { id: cat.id, name: cat.name } : null }))
    setAttributes({})
    setErrors((e) => ({ ...e, category: undefined }))
  }

  const handleAttribute = (name, value) => {
    setAttributes((prev) => ({ ...prev, [name]: value }))
  }

  // --- Location cascades ---
  const handleStateChange = (e) => {
    const state = e.target.value
    setForm((prev) => ({ ...prev, location: { state, city: '', area: '' } }))
    setAreaSelect('')
    setErrors((e) => ({ ...e, 'location.state': undefined, 'location.city': undefined }))
  }

  const handleCityChange = (e) => {
    const city = e.target.value
    setForm((prev) => ({ ...prev, location: { ...prev.location, city, area: '' } }))
    setAreaSelect('')
    setErrors((e) => ({ ...e, 'location.city': undefined }))
  }

  const handleAreaChange = (e) => {
    const val = e.target.value
    setAreaSelect(val)
    if (val !== 'Others') {
      setForm((prev) => ({ ...prev, location: { ...prev.location, area: val } }))
    } else {
      setForm((prev) => ({ ...prev, location: { ...prev.location, area: '' } }))
    }
  }

  // --- Images + cover ---
  const handleImages = (e) => {
    const incoming = Array.from(e.target.files)
    setImageFiles((prev)    => [...prev, ...incoming].slice(0, 5))
    setImagePreviews((prev) => [
      ...prev,
      ...incoming.map((f) => URL.createObjectURL(f)),
    ].slice(0, 5))
    // reset the input so the same file can be re-selected if needed
    e.target.value = ''
  }

  const removeImage = (index) => {
    setImageFiles((prev)    => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setCoverIndex((prev) => {
      if (prev === index) return 0
      if (prev > index) return prev - 1
      return prev
    })
  }

  // --- Validation ---
  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (!form.price.amount || isNaN(form.price.amount) || Number(form.price.amount) <= 0)
      errs['price.amount'] = 'Enter a valid price'
    if (!form.category) errs.category = 'Select a category'
    if (!form.location.state) errs['location.state'] = 'State is required'
    if (!form.location.city) errs['location.city'] = 'City is required'
    return errs
  }

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    // put cover file first so the backend/Cloudinary preserves the order
    const orderedFiles =
      imageFiles.length > 0
        ? [imageFiles[coverIndex], ...imageFiles.filter((_, i) => i !== coverIndex)]
        : []

    setLoading(true)
    try {
      await createListing({
        title:       form.title.trim(),
        description: form.description.trim(),
        price:       { amount: Number(form.price.amount), negotiable: form.price.negotiable },
        category:    form.category,
        attributes,
        images:      orderedFiles,
        location: {
          state: form.location.state,
          city:  form.location.city,
          area:  form.location.area,
        },
      })
      navigate('/listings')
    } catch {
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

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              value={form.location.state}
              onChange={handleStateChange}
              className={inputCls('location.state')}
            >
              <option value=''>Select state</option>
              {Object.keys(LOCATION_DATA).sort().map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors['location.state'] && (
              <p className="text-xs text-red-500 mt-1">{errors['location.state']}</p>
            )}
          </div>

          {/* City — appears after state is selected */}
          {form.location.state && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                value={form.location.city}
                onChange={handleCityChange}
                className={inputCls('location.city')}
              >
                <option value=''>Select city</option>
                {citiesForState.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors['location.city'] && (
                <p className="text-xs text-red-500 mt-1">{errors['location.city']}</p>
              )}
            </div>
          )}

          {/* Area — appears after city is selected */}
          {form.location.city && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area / Locality
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <select
                value={areaSelect}
                onChange={handleAreaChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value=''>Select area</option>
                {areasForCity.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value='Others'>Others</option>
              </select>

              {areaSelect === 'Others' && (
                <input
                  type="text"
                  placeholder="Enter your area / locality name"
                  value={form.location.area}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      location: { ...prev.location, area: e.target.value },
                    }))
                  }
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              )}
            </div>
          )}
        </section>

        {/* Images */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Images <span className="text-gray-400 font-normal normal-case">(up to 5)</span>
          </h2>

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
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Click an image to set it as the{' '}
                <span className="font-semibold text-indigo-600">cover photo</span>.
              </p>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((src, i) => (
                  <div
                    key={i}
                    onClick={() => setCoverIndex(i)}
                    className={`relative w-20 h-20 cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      coverIndex === i
                        ? 'border-indigo-500 ring-2 ring-indigo-200 scale-105'
                        : 'border-gray-200 hover:border-indigo-300 hover:scale-105'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />

                    {/* Cover badge */}
                    {coverIndex === i && (
                      <div className="absolute inset-x-0 bottom-0 bg-indigo-600/90 text-white text-[9px] font-bold text-center py-0.5 tracking-wider">
                        COVER
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none shadow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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
