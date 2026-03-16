export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })

export const now = () => new Date().toISOString()

const seq = (key, prefix, pad = 4) => {
  const n = parseInt(localStorage.getItem(key) || '0') + 1
  localStorage.setItem(key, n)
  return `${prefix}-${String(n).padStart(pad, '0')}`
}

export const poSeq  = () => seq('poSeq',  'PO')
export const soSeq  = () => seq('soSeq',  'SO')
export const skuSeq = (cat = 'PRD') => seq('skuSeq', cat.substring(0, 3).toUpperCase())

export const fmtNum  = n => Number(n || 0).toLocaleString('fr-DZ')
export const fmtDate = d => d
  ? new Date(d).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

export const today = new Date().toLocaleDateString('en', {
  weekday: 'short', month: 'short', day: 'numeric'
})
