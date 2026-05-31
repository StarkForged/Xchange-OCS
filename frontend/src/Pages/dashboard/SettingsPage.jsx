import { useState, useEffect } from 'react'
import useAuthStore from '../../store/auth.Store'
import { getProfileAPI, updateProfileAPI } from '../../api/auth.api'

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, disabled, hint, rows }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none resize-none ${disabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${disabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
        />
      )}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Toggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange?.(!value)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()

  // Profile fields
  const [name,     setName]     = useState('')
  const [bio,      setBio]      = useState('')
  const [phone,    setPhone]    = useState('')
  const [location, setLocation] = useState('')

  // Notification toggles (local UI state only — not persisted to backend yet)
  const [notifMessages,    setNotifMessages]    = useState(true)
  const [notifEnquiries,   setNotifEnquiries]   = useState(true)
  const [notifPriceDrop,   setNotifPriceDrop]   = useState(false)
  const [notifMarketing,   setNotifMarketing]   = useState(false)
  const [showOnline,       setShowOnline]       = useState(true)
  const [publicProfile,    setPublicProfile]    = useState(true)
  const [showPhone,        setShowPhone]        = useState(false)

  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saveState, setSaveState] = useState(null) // 'success' | 'error' | null

  // Load current profile
  useEffect(() => {
    getProfileAPI()
      .then(({ user: u }) => {
        setName(u.name     || '')
        setBio(u.bio       || '')
        setPhone(u.phone   || '')
        setLocation(u.location || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setSaveState(null)
    try {
      const { user: updated } = await updateProfileAPI({ name, bio, phone, location })
      updateUser(updated)
      setSaveState('success')
      setTimeout(() => setSaveState(null), 3000)
    } catch {
      setSaveState('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-3">
            <div className="h-4 w-1/4 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account preferences and profile</p>
      </div>

      {/* Account */}
      <Section title="Account Information" description="This information is visible on your public profile">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name"   value={name}     onChange={setName}     placeholder="Your name" />
            <Field label="Email"       value={user?.email || ''} disabled hint="Contact support to change your email" />
          </div>
          <Field label="Phone Number" value={phone}    onChange={setPhone}    placeholder="+91 00000 00000" hint="Improves your trust score by 20 pts" />
          <Field label="Location"     value={location} onChange={setLocation} placeholder="e.g. Mumbai, Maharashtra"      hint="Improves your trust score by 10 pts" />
          <Field label="Bio / About"  value={bio}      onChange={setBio}      placeholder="Tell buyers a bit about yourself…" rows={3} hint="Improves your trust score by 15 pts" />

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saveState === 'success' && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-sm text-red-500 font-medium">Failed to save. Try again.</span>
            )}
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section title="Password & Security" description="Keep your account secure">
        <div className="space-y-4">
          <Field label="Current Password" type="password" value="" placeholder="••••••••" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="New Password"     type="password" value="" placeholder="••••••••" />
            <Field label="Confirm Password" type="password" value="" placeholder="••••••••" />
          </div>
          <button type="button" className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
            Update Password
          </button>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" description="Choose what you want to be notified about">
        <div className="space-y-5 divide-y divide-gray-50">
          <Toggle label="New messages"     description="When a buyer or seller messages you" value={notifMessages}  onChange={setNotifMessages} />
          <div className="pt-4"><Toggle label="Listing enquiries" description="When someone contacts you about your listing" value={notifEnquiries}  onChange={setNotifEnquiries} /></div>
          <div className="pt-4"><Toggle label="Price drop alerts" description="When a saved listing drops in price"          value={notifPriceDrop} onChange={setNotifPriceDrop} /></div>
          <div className="pt-4"><Toggle label="Marketing emails"  description="Tips, features and marketplace updates"       value={notifMarketing} onChange={setNotifMarketing} /></div>
        </div>
      </Section>

      {/* Privacy */}
      <Section title="Privacy" description="Control what others can see">
        <div className="space-y-5 divide-y divide-gray-50">
          <Toggle label="Show online status"            description="Let sellers see when you're active"                  value={showOnline}    onChange={setShowOnline} />
          <div className="pt-4"><Toggle label="Public profile"      description="Allow others to view your listings and reviews" value={publicProfile} onChange={setPublicProfile} /></div>
          <div className="pt-4"><Toggle label="Show phone to buyers" description="Visible only after a chat is started"           value={showPhone}    onChange={setShowPhone} /></div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone" description="Irreversible account actions">
        <div className="space-y-5 divide-y divide-gray-50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Deactivate Account</p>
              <p className="text-xs text-gray-400 mt-0.5">Temporarily hide your profile and listings</p>
            </div>
            <button className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Deactivate</button>
          </div>
          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Account</p>
              <p className="text-xs text-gray-400 mt-0.5">Permanently delete your account and all data</p>
            </div>
            <button className="text-xs font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition">Delete Account</button>
          </div>
        </div>
      </Section>
    </div>
  )
}
