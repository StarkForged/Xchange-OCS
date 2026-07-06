// Automatic report priority classification.
//
// Base priority comes from the reason selected. Priority is then escalated
// (never downgraded) when any of the following signals are present:
//   - the target already has several open reports
//   - the reported user/seller has a low trust score
//   - the reported user is a repeat offender (multiple past valid reports)
//   - a very similar report (same reason, same target) already exists
//
// Kept as a pure function — the controller gathers the signals from the DB
// and passes them in, so this stays trivially testable.

const TIERS = ['low', 'medium', 'high', 'critical']

const BASE_PRIORITY_BY_REASON = {
  // Low
  spam: 'low',
  duplicate_listing: 'low',
  no_show: 'low',
  other: 'low',

  // Medium
  wrong_category: 'medium',
  misleading_description: 'medium',
  payment_outside_platform: 'medium',
  suspicious_activity: 'medium',
  offensive_content: 'medium',

  // High
  fraud: 'high',
  scam_fraud: 'high',
  fake_product: 'high',
  harassment: 'high',
  fake_identity: 'high',

  // Critical
  counterfeit: 'critical',
  stolen_property: 'critical',
  prohibited_item: 'critical',
  threatening_behavior: 'critical',
}

function computeReportPriority(reason, signals = {}) {
  const {
    targetOpenReportsCount = 0,   // other open reports already filed against this same target
    targetTrustScore = null,     // reported user's (or listing seller's) current trust score
    repeatOffenderCount = 0,     // past reports against this target that were found valid
    similarReportsCount = 0,     // existing reports with the same reason on the same target
  } = signals

  let tierIndex = TIERS.indexOf(BASE_PRIORITY_BY_REASON[reason] || 'low')

  let escalations = 0
  if (targetOpenReportsCount >= 3) escalations++
  if (targetTrustScore !== null && targetTrustScore < 40) escalations++
  if (repeatOffenderCount >= 2) escalations++
  if (similarReportsCount >= 2) escalations++

  tierIndex = Math.min(tierIndex + escalations, TIERS.length - 1)

  return TIERS[tierIndex]
}

module.exports = { computeReportPriority, BASE_PRIORITY_BY_REASON, TIERS }
