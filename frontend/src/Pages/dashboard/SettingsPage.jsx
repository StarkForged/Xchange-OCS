import { useState, useEffect, useRef } from 'react'
import useAuthStore from '../../store/auth.Store'
import { getProfileAPI, updateProfileAPI } from '../../api/auth.api'

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Confirm Password Modal ─────────────────────────────────────────────────────

function ConfirmPasswordModal({ onConfirm, onClose, error, busy }) {
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const inputRef                = useRef(null)

  useEffect(() => {
    // Auto-focus the input when modal opens
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!password.trim()) return
    onConfirm(password)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Close">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Confirm Your Identity</h3>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Enter your current password to save these changes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm outline-none transition-all ${
                  error
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-100'
                    : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {show ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || busy}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Saving…' : 'Confirm & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()

  // Profile fields
  const [name,     setName]     = useState('')
  const [bio,      setBio]      = useState('')
  const [phone,    setPhone]    = useState('')
  const [location, setLocation] = useState('')

  // Notification toggles (local UI state only — not persisted to backend yet)
  const [notifMessages,  setNotifMessages]  = useState(true)
  const [notifEnquiries, setNotifEnquiries] = useState(true)
  const [notifPriceDrop, setNotifPriceDrop] = useState(false)
  const [notifMarketing, setNotifMarketing] = useState(false)
  const [showOnline,     setShowOnline]     = useState(true)
  const [publicProfile,  setPublicProfile]  = useState(true)
  const [showPhone,      setShowPhone]      = useState(false)

  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [saveState,       setSaveState]       = useState(null) // 'success' | 'error' | null
  const [showPassModal,   setShowPassModal]   = useState(false)
  const [passwordError,   setPasswordError]   = useState('')

  // Pending form payload — held until password is confirmed
  const pendingPayloadRef = useRef(null)

  // Load current profile
  useEffect(() => {
    getProfileAPI()
      .then(({ user: u }) => {
        setName(u.name       || '')
        setBio(u.bio         || '')
        setPhone(u.phone     || '')
        setLocation(u.location || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Step 1 — user clicks Save Changes: validate and open password modal
  const handleSaveProfile = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaveState(null)
    setPasswordError('')
    // Snapshot the current field values into the ref so the modal submit can use them
    pendingPayloadRef.current = { name, bio, phone, location }
    setShowPassModal(true)
  }

  // Step 2 — user enters password in modal and confirms
  const handlePasswordConfirm = async (password) => {
    if (!pendingPayloadRef.current) return
    setSaving(true)
    setPasswordError('')
    try {
      const { user: updated } = await updateProfileAPI({
        ...pendingPayloadRef.current,
        password,
      })
      updateUser(updated)
      setSaveState('success')
      setShowPassModal(false)
      pendingPayloadRef.current = null
      setTimeout(() => setSaveState(null), 3000)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save'
      if (err?.response?.status === 401) {
        setPasswordError('Incorrect password')
      } else {
        setPasswordError(msg)
        setShowPassModal(false)
        setSaveState('error')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleModalClose = () => {
    setShowPassModal(false)
    setPasswordError('')
    pendingPayloadRef.current = null
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
    <>
      {/* Password confirmation modal */}
      {showPassModal && (
        <ConfirmPasswordModal
          onConfirm={handlePasswordConfirm}
          onClose={handleModalClose}
          error={passwordError}
          busy={saving}
        />
      )}

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
            <Field label="Phone Number" value={phone}    onChange={setPhone}    placeholder="+91 00000 00000" hint="Improves your trust score" />
            <Field label="Location"     value={location} onChange={setLocation} placeholder="e.g. Mumbai, Maharashtra" hint="Improves your trust score" />
            <Field label="Bio / About"  value={bio}      onChange={setBio}      placeholder="Tell buyers a bit about yourself…" rows={3} hint="Improves your trust score" />

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
    </>
  )
}
