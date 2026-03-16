import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs'

// ── helpers ───────────────────────────────────────────────────────────────────
function download(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function flattenRows(rows) {
  return rows.map(r => {
    const out = {}
    for (const [k, v] of Object.entries(r)) {
      if (Array.isArray(v)) out[k] = JSON.stringify(v)
      else if (v !== null && typeof v === 'object') out[k] = JSON.stringify(v)
      else out[k] = v ?? ''
    }
    return out
  })
}

// ── CSV ───────────────────────────────────────────────────────────────────────
export function exportCSV(rows, filename = 'export.csv') {
  if (!rows.length) return
  const flat = flattenRows(rows)
  const headers = Object.keys(flat[0])
  const csv = [
    headers.join(','),
    ...flat.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  download(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), filename)
}

// ── JSON ──────────────────────────────────────────────────────────────────────
export function exportJSON(rows, filename = 'export.json') {
  download(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), filename)
}

// ── Excel (SheetJS via CDN) ───────────────────────────────────────────────────
export async function exportExcel(rows, filename = 'export.xlsx', sheetName = 'Sheet1') {
  if (!rows.length) return
  const flat = flattenRows(rows)
  try {
    // Dynamic import from CDN
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')
    const ws = XLSX.utils.json_to_sheet(flat)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename)
  } catch {
    // fallback: export as CSV with .xlsx extension hint
    exportCSV(rows, filename.replace('.xlsx', '.csv'))
  }
}

// ── HTML ──────────────────────────────────────────────────────────────────────
export function exportHTML(rows, filename = 'export.html', title = 'Export') {
  if (!rows.length) return
  const flat = flattenRows(rows)
  const headers = Object.keys(flat[0])
  const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`
  const tbody = flat.map(r => `<tr>${headers.map(h => `<td>${r[h]}</td>`).join('')}</tr>`).join('\n')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1a1a2e;color:white}</style>
</head><body><h2>${title}</h2><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`
  download(new Blob([html], { type: 'text/html;charset=utf-8' }), filename)
}

// ── Image (canvas screenshot) ─────────────────────────────────────────────────
export async function exportImage(elementId, filename = 'export.png') {
  const el = document.getElementById(elementId)
  if (!el) return alert('Element not found for screenshot')
  try {
    const { default: html2canvas } = await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js')
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0a0b0f' })
    canvas.toBlob(blob => download(blob, filename), 'image/png')
  } catch { alert('Image export requires html2canvas. Try HTML export instead.') }
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────
export function shareWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

// ── Email ─────────────────────────────────────────────────────────────────────
export function shareEmail(subject, body) {
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ── Format order as text summary ─────────────────────────────────────────────
export function orderSummaryText(order, getClient, getProduct) {
  const client = getClient(order.client_id)?.full_name || '—'
  const lines  = (order.lines || []).map(l => {
    const p = getProduct(l.product_id)
    return `  • ${p?.name || l.product_id}  x${l.qty}  @ ${l.unit_price}  = ${l.line_total}`
  }).join('\n')
  return `Order: ${order.so_number || order.po_number}\nClient: ${client}\nDate: ${order.delivery_date || order.expected_date || ''}\n\nLines:\n${lines}\n\nSubtotal: ${order.subtotal}  Tax: ${order.tax_amount}  TOTAL: ${order.total}`
}
