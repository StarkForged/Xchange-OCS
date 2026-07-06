import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createReportAPI, getReportStatusAPI } from '../../api/report.api'

export const LISTING_REASONS = [
  { value: 'scam_fraud',              label: 'Scam / Fraud' },
  { value: 'fake_product',            label: 'Fake Product' },
  { value: 'counterfeit',             label: 'Counterfeit' },
  { value: 'misleading_description',  label: 'Misleading Description' },
  { value: 'wrong_category',          label: 'Wrong Category' },
  { value: 'duplicate_listing',       label: 'Duplicate Listing' },
  { value: 'spam',                    label: 'Spam' },
  { value: 'prohibited_item',         label: 'Prohibited Item' },
  { value: 'stolen_property',         label: 'Stolen Property' },
  { value: 'offensive_content',       label: 'Offensive Content' },
  { value: 'other',                   label: 'Other' },
]

export const USER_REASONS = [
  { value: 'fraud',                       label: 'Fraud' },
  { value: 'fake_identity',                label: 'Fake Identity' },
  { value: 'harassment',                   label: 'Harassment' },
  { value: 'threatening_behavior',         label: 'Threatening Behaviour' },
  { value: 'no_show',                      label: 'No Show' },
  { value: 'payment_outside_platform',     label: 'Asking Payment Outside Xchange' },
  { value: 'suspicious_activity',          label: 'Suspicious Activity' },
  { value: 'spam',                         label: 'Spam' },
  { value: 'other',                        label: 'Other' },
]

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.pdf'
const MAX_FILES = 5
const MAX_SIZE = 10 * 1024 * 1024

const STEPS = ['Reason', 'Details', 'Evidence', 'Confirm']

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function PdfIcon() {
  return (
    <svg className="w-8 h-8 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function ProgressSteps({ step }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      {STEPS.map((label, i) => {
        const n = i + 1
        const active = n === step
        const done = n < step
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
            {n < STEPS.length && <div className={`flex-1 h-0.5 mx-2 rounded-full ${done ? 'bg-emerald-400' : 'bg-gray-100'}`} />}
          </div>
        )
      })}
    </div>
  )
}

export default function ReportModal({ reportType, targetId, targetLabel, onClose }) {
  const reasons = reportType === 'listing' ? LISTING_REASONS : USER_REASONS

  const [checking, setChecking]   = useState(true)
  const [duplicate, setDuplicate] = useState(null)

  const [step, setStep]           = useState(1)
  const [reason, setReason]       = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles]         = useState([])
  const [fileError, setFileError] = useState('')
  const [declared, setDeclared]   = useState(false)
  const [dragOver, setDragOver]   = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult]       = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const params = reportType === 'listing'
      ? { reportType, listingId: targetId }
      : { reportType, reportedUserId: targetId }
    getReportStatusAPI(params)
      .then((d) => { if (!cancelled && d.alreadyReported) setDuplicate(d.report) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [reportType, targetId])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const addFiles = useCallback((incoming) => {
    setFileError('')
    const list = Array.from(incoming)
    const valid = []
    for (const f of list) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setFileError(`"${f.name}" isn't a supported file type (JPG, PNG, WEBP, PDF only).`)
        continue
      }
      if (f.size > MAX_SIZE) {
        setFileError(`"${f.name}" is larger than 10MB.`)
        continue
      }
      valid.push(f)
    }
    setFiles((prev) => {
      const combined = [...prev, ...valid]
      if (combined.length > MAX_FILES) {
        setFileError(`You can upload up to ${MAX_FILES} files.`)
        return combined.slice(0, MAX_FILES)
      }
      return combined
    })
  }, [])

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const descLen = description.trim().length
  const descValid = descLen >= 30 && descLen <= 1000

  const canProceed =
    step === 1 ? !!reason :
    step === 2 ? descValid :
    step === 3 ? files.length >= 1 && files.length <= MAX_FILES :
    step === 4 ? declared :
    false

  const goNext = () => { if (canProceed) setStep((s) => Math.min(4, s + 1)) }
  const goBack = () => setStep((s) => Math.max(1, s - 1))

  const handleSubmit = async () => {
    if (!canProceed || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const formData = new FormData()
      formData.append('reportType', reportType)
      if (reportType === 'listing') formData.append('listingId', targetId)
      else formData.append('reportedUserId', targetId)
      formData.append('reason', reason)
      formData.append('description', description.trim())
      formData.append('declaration', 'true')
      files.forEach((f) => formData.append('attachments', f))

      const data = await createReportAPI(formData, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
      })
      setResult(data)
    } catch (err) {
      if (err.status === 409) {
        setDuplicate(err.data?.report)
      } else {
        setSubmitError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reasonLabel = reasons.find((r) => r.value === reason)?.label

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {reportType === 'listing' ? 'Report Listing' : 'Report User'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex-1">

          {checking ? (
            <div className="py-10 text-center text-sm text-gray-400">Checking report status…</div>

          ) : duplicate ? (
            /* ── Already reported ─────────────────────────────────────── */
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">You already reported this.</p>
                <p className="text-xs text-gray-500 mt-1">Reference {duplicate.referenceNumber} · Status: <span className="capitalize font-semibold">{duplicate.status?.replace(/_/g, ' ')}</span></p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Close
                </button>
                <Link
                  to="/dashboard/reports"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors text-center"
                >
                  View Report Status
                </Link>
              </div>
            </div>

          ) : result ? (
            /* ── Confirmation ─────────────────────────────────────────── */
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">Report Submitted</p>
                <p className="text-sm text-gray-500 mt-1">Thank you. Our moderation team will review your report.</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reference ID</p>
                <p className="text-sm font-mono font-bold text-gray-800">{result.report?.referenceNumber}</p>
                <p className="text-[11px] text-gray-400 mt-1">Estimated review time: {result.estimatedReviewTime}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Close
                </button>
                <Link
                  to="/dashboard/reports"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors text-center"
                >
                  My Reports
                </Link>
              </div>
            </div>

          ) : (
            /* ── Wizard ────────────────────────────────────────────────── */
            <div className="space-y-5">
              <ProgressSteps step={step} />

              {targetLabel && (
                <p className="text-xs text-gray-400 truncate">
                  Reporting: <span className="font-semibold text-gray-600">{targetLabel}</span>
                </p>
              )}

              {/* Step 1 — Reason */}
              {step === 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Why are you reporting this {reportType}?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {reasons.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setReason(r.value)}
                        className={`text-left px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                          reason === r.value
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-300'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2 — Description */}
              {step === 2 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Tell us what happened</p>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                    placeholder="Explain exactly what happened. Include as much detail as possible."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={descLen > 0 && descLen < 30 ? 'text-rose-500 font-semibold' : 'text-gray-400'}>
                      {descLen < 30 ? `Minimum 30 characters (${30 - descLen} more needed)` : 'Looks good'}
                    </span>
                    <span className="text-gray-400">{descLen} / 1000</span>
                  </div>
                </div>
              )}

              {/* Step 3 — Evidence */}
              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Upload evidence</p>
                  <p className="text-xs text-gray-400">
                    At least one file is required. JPG, PNG, WEBP, or PDF — up to {MAX_FILES} files, 10MB each.
                  </p>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl py-8 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs font-semibold text-gray-600">Drag & drop files here, or click to browse</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_EXT}
                      multiple
                      className="hidden"
                      onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
                    />
                  </div>

                  {fileError && <p className="text-xs text-rose-500">{fileError}</p>}

                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                          {f.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(f)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                          ) : (
                            <PdfIcon />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-700 truncate">{f.name}</p>
                            <p className="text-[10px] text-gray-400">{formatBytes(f.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 — Declaration + review */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-700">Review & confirm</p>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-2 text-xs">
                    <p><span className="text-gray-400">Reason:</span> <span className="font-semibold text-gray-700">{reasonLabel}</span></p>
                    <p className="text-gray-600 leading-relaxed line-clamp-3">{description.trim()}</p>
                    <p className="text-gray-400">{files.length} file{files.length === 1 ? '' : 's'} attached</p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declared}
                      onChange={(e) => setDeclared(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed">
                      I confirm this report is truthful. Submitting false reports may reduce my trust score.
                    </span>
                  </label>

                  {submitError && <p className="text-xs text-rose-500">{submitError}</p>}
                  {submitting && uploadProgress > 0 && (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav — only during the wizard */}
        {!checking && !duplicate && !result && (
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={step === 1 ? onClose : goBack}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 4 ? (
              <button
                onClick={goNext}
                disabled={!canProceed}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || submitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
