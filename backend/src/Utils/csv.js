/**
 * Minimal, dependency-free CSV serializer for the Admin Export Center
 * (Phase 12E). Deliberately simple — columns are `{ key, label }` pairs and
 * nested paths are dot-notated (e.g. 'transaction.completedAt'). A PDF export
 * can be added later without changing this shape; it just needs a different
 * renderer for the same `rows`/`columns` inputs.
 */

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const str = value instanceof Date ? value.toISOString() : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

/**
 * @param {object[]} rows
 * @param {{ key: string, label: string }[]} columns
 * @returns {string} CSV text (with header row)
 */
function toCSV(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(getPath(row, c.key))).join(',')
  )
  return [header, ...lines].join('\r\n')
}

module.exports = { toCSV }
