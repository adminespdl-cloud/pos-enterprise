// ============================================================
// appData.js — Data Master Aplikasi Jadwal ULP Padalarang
// Data Gardu: 565 gardu real dari data_gardu.json
// Data ROW  : 236 segmen real dari data_row.json (backup_har_row_2026-06-10)
// ============================================================

import rawGarduData from './data_gardu.json'
import rawRowData   from './data_row.json'

// ── 1. GARDU: group by WILAYAH_KERJA ─────────────────────────
const buildGarduByWilayah = () => {
  const grouped = {}
  for (const item of rawGarduData.data) {
    const wilayah = (item.WILAYAH_KERJA || '').trim().toUpperCase()
    if (!wilayah) continue
    if (!grouped[wilayah]) grouped[wilayah] = []
    grouped[wilayah].push(item.GARDU)
  }
  return grouped
}

export const GARDU_BY_WILAYAH = buildGarduByWilayah()

export const GARDU_STATS = {
  total: rawGarduData.total_records,
  exportedAt: rawGarduData.exported_at,
  perWilayah: Object.fromEntries(
    Object.entries(GARDU_BY_WILAYAH).map(([k, v]) => [k, v.length])
  )
}

// ── 2. ROW: group by PENYULANG, urut by _seq ─────────────────
const buildSegmenByPenyulang = () => {
  const rows = Array.isArray(rawRowData.dataRow)
    ? rawRowData.dataRow
    : rawRowData            // fallback jika struktur beda

  // Sort by seq dulu
  const sorted = [...rows].sort((a, b) => (a._seq || 0) - (b._seq || 0))

  const grouped = {}
  for (const item of sorted) {
    const peny = (item.PENYULANG || '').trim().toUpperCase()
    if (!peny) continue
    if (!grouped[peny]) grouped[peny] = []
    grouped[peny].push({
      id:    item._uid || `${peny}-${item._seq}`,
      name:  item.SEGMEN || '',
      kms:   parseFloat(item.KMS) || 1.0,
      posko: (item.POSKO || '').trim().toUpperCase(),
      seq:   item._seq || 0,
    })
  }
  return grouped
}

export const SEGMEN_BY_PENYULANG = buildSegmenByPenyulang()

// Juga susun: ROW data grouped by POSKO (untuk referensi)
const buildRowByPosko = () => {
  const rows = Array.isArray(rawRowData.dataRow)
    ? rawRowData.dataRow
    : rawRowData
  const grouped = {}
  for (const item of rows) {
    const posko = (item.POSKO || '').trim().toUpperCase()
    if (!posko) continue
    if (!grouped[posko]) grouped[posko] = []
    grouped[posko].push(item)
  }
  return grouped
}
export const ROW_BY_POSKO = buildRowByPosko()

// ── 3. Daftar Penyulang ROW ───────────────────────────────────
export const PENYULANG_ROW = Object.keys(SEGMEN_BY_PENYULANG)
  .sort()
  .map(id => ({ id, name: id }))

// ── 4. Helper: ambil segmen berdasarkan penyulang ─────────────
export const getSegmenByPenyulang = (penyulang) => {
  const segs = SEGMEN_BY_PENYULANG[(penyulang || '').toUpperCase()]
  if (segs && segs.length > 0) return segs
  // fallback dummy jika penyulang ga ada datanya
  return [{ id: `${penyulang}-S01`, name: `${penyulang} Segmen 1`, kms: 1.0, posko: '', seq: 1 }]
}

// ── 5. ROW Stats ──────────────────────────────────────────────
export const ROW_STATS = {
  total: (Array.isArray(rawRowData.dataRow) ? rawRowData.dataRow : rawRowData).length,
  exportedAt: rawRowData.exported_at || '-',
  perPenyulang: Object.fromEntries(
    Object.entries(SEGMEN_BY_PENYULANG).map(([k, v]) => [k, v.length])
  )
}
