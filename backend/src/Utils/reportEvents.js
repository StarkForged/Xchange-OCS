const EventEmitter = require('events')

// Notification-system placeholder for the reporting engine.
//
// The real notification pipeline doesn't exist yet, so every emit* function
// below is currently a no-op — it only logs in development. A future
// notification service can start listening on `reportEvents` (or these
// functions can be swapped to call it directly) without touching any of the
// report/admin-report controllers that already call them.
//
// Event catalogue:
//   REPORT_SUBMITTED        — a new report was filed
//   REPORT_UNDER_REVIEW     — an admin started reviewing a report
//   MORE_EVIDENCE_REQUESTED — an admin asked the reporter for more evidence
//   REPORT_RESOLVED         — a report was resolved (valid or false)
//   REPORT_DISMISSED        — a report was dismissed with no action

const REPORT_EVENTS = {
  SUBMITTED: 'REPORT_SUBMITTED',
  UNDER_REVIEW: 'REPORT_UNDER_REVIEW',
  MORE_EVIDENCE_REQUESTED: 'MORE_EVIDENCE_REQUESTED',
  RESOLVED: 'REPORT_RESOLVED',
  DISMISSED: 'REPORT_DISMISSED',
}

const reportEvents = new EventEmitter()

const noop = (eventName) => (payload) => {
  reportEvents.emit(eventName, payload)
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug(`[reportEvents] ${eventName}`, { reportId: payload?.reportId, referenceNumber: payload?.referenceNumber })
  }
}

const emitReportSubmitted        = noop(REPORT_EVENTS.SUBMITTED)
const emitReportUnderReview      = noop(REPORT_EVENTS.UNDER_REVIEW)
const emitMoreEvidenceRequested  = noop(REPORT_EVENTS.MORE_EVIDENCE_REQUESTED)
const emitReportResolved         = noop(REPORT_EVENTS.RESOLVED)
const emitReportDismissed        = noop(REPORT_EVENTS.DISMISSED)

module.exports = {
  REPORT_EVENTS,
  reportEvents,
  emitReportSubmitted,
  emitReportUnderReview,
  emitMoreEvidenceRequested,
  emitReportResolved,
  emitReportDismissed,
}
