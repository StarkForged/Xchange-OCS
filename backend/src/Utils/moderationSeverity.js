/**
 * Moderation severity taxonomy for the Trust Framework v2 (Phase 12D).
 *
 * Only admin-CONFIRMED moderation (a listing actually removed for cause)
 * feeds this table. Pending reports and provisional "Under Review" holds
 * never touch trust — see trustEngine.js's moderationPillar().
 */

const SEVERITY = {
  MINOR:    'minor',
  MEDIUM:   'medium',
  CRITICAL: 'critical',
}

const SEVERITY_META = {
  minor: {
    label:    'Minor',
    examples: ['Wrong category', 'Duplicate listing', 'Expired listing'],
    penalty:  3,
    recoveryMonths: 6,   // fully recovers after N clean months
  },
  medium: {
    label:    'Medium',
    examples: ['Spam', 'Misleading listing', 'Counterfeit'],
    penalty:  8,
    recoveryMonths: 12,  // only PARTIALLY recovers (half penalty lifted)
  },
  critical: {
    label:    'Critical',
    examples: ['Fraud', 'Scam', 'Identity theft'],
    penalty:  20,
    recoveryMonths: null, // never automatically recovers
  },
}

// Best-effort mapping from the existing free-form "hide reason" categories
// (see adminListing.controller.js HIDE_REASON_LABELS) to a default severity,
// used only when an admin removes a listing without explicitly picking one.
const REASON_SEVERITY_HINTS = {
  duplicate:     SEVERITY.MINOR,
  spam:          SEVERITY.MEDIUM,
  misleading:    SEVERITY.MEDIUM,
  counterfeit:   SEVERITY.MEDIUM,
  inappropriate: SEVERITY.MEDIUM,
  fraudulent:    SEVERITY.CRITICAL,
  other:         SEVERITY.MEDIUM,
}

function isValidSeverity(s) {
  return Object.values(SEVERITY).includes(s)
}

function inferSeverity(hideReasonKey) {
  return REASON_SEVERITY_HINTS[hideReasonKey] || SEVERITY.MEDIUM
}

module.exports = {
  SEVERITY,
  SEVERITY_META,
  isValidSeverity,
  inferSeverity,
}
