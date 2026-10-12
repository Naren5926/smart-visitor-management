// Minimal CSV helpers (RFC 4180 basics: quoted fields, escaped quotes, CRLF) for the bulk student upload.

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^﻿/, '') // strip the BOM Excel adds

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

const normalize = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '')
const HEADER_ALIASES = {
  name: ['name', 'studentname', 'fullname'],
  className: ['class', 'classname', 'section', 'department', 'dept'],
  year: ['year', 'yearofstudy'],
  rollNo: ['rollno', 'rollnumber', 'roll', 'registerno', 'regno'],
  email: ['email', 'emailid', 'mail'],
}

// Turns CSV text into student objects. Throws a readable Error when required columns are missing.
export function parseStudentsCsv(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('The file needs a header row and at least one student')

  const headers = rows[0].map(normalize)
  const index = {}
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    index[key] = headers.findIndex((h) => aliases.includes(h))
  }
  const missing = ['name', 'className', 'year', 'rollNo'].filter((k) => index[k] === -1)
  if (missing.length) {
    const labels = { name: 'Name', className: 'Class', year: 'Year', rollNo: 'Roll No' }
    throw new Error(`Missing column(s): ${missing.map((k) => labels[k]).join(', ')}`)
  }

  return rows.slice(1).map((r) => {
    const get = (k) => (index[k] === -1 ? '' : (r[index[k]] ?? '').trim())
    return { name: get('name'), className: get('className'), year: get('year'), rollNo: get('rollNo'), email: get('email') }
  })
}

const escapeCell = (v) => {
  let s = String(v ?? '')
  // Stop spreadsheet formula injection when the file is opened in Excel.
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n')

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
