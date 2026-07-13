import React from 'react'
import * as XLSX from 'xlsx'
import { useMasterData } from '../context/MasterDataContext'

const POSKO_LIST = [
  { key: 'PADALARANG', label: 'Padalarang' },
  { key: 'BATUJAJAR',  label: 'Batujajar'  },
  { key: 'CIKALONG',   label: 'Cikalong'   },
  { key: 'CIPEUNDEUY', label: 'Cipeundeuy' },
  { key: 'PASIRLANGU', label: 'Pasirlangu' },
]

const TOTAL_COLS = 2 + 3 + POSKO_LIST.length // No + Tanggal + ROW(3) + Posko(5)

export default function LaporanGabungan({ schedule, allGlobalSegmen, monthLabel }) {
  const { GARDU_BY_WILAYAH } = useMasterData()

  const resolveSegmen = (ids) => {
    if (!ids || ids.length === 0) return '—'
    return ids.map(id => {
      const s = allGlobalSegmen.find(s => s.id === id)
      return s ? s.name : id
    }).join('\n')
  }

  const resolveGardu = (ids, poskoKey) => {
    if (!ids || ids.length === 0) return '—'
    const garduList = GARDU_BY_WILAYAH[poskoKey] || []
    return ids.map(id => {
      const g = garduList.find(g => g._uid === id)
      return g ? g.GARDU : id
    }).join(', ')
  }

  const totalKmsAll = schedule.reduce((s, r) => s + (r.rawTotal || 0), 0).toFixed(2)
  const totalGardu  = (key) => schedule.reduce((s, r) => s + ((r.gardu?.[key] || []).length), 0)

  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

  /* ── Export PDF (browser print → Save as PDF) ── */
  const handleExportPDF = () => window.print()

  /* ── Export JSON ── */
  const handleExportJSON = () => {
    const exportData = {
      meta: {
        judul: 'Jadwal HAR ROW & Pengukuran Gardu',
        unit: 'ULP Padalarang',
        periode: monthLabel,
        diekspor: today,
        totalHariKerja: schedule.length,
        totalKms: totalKmsAll,
      },
      jadwal: schedule.map(row => ({
        no: row.id,
        hari: row.dayName,
        tanggal: row.dateStr,
        tim1_segmen: resolveSegmen(row.har1?.checkedIds),
        tim2_segmen: resolveSegmen(row.har2?.checkedIds),
        total_kms: row.totalKms || '0.00',
        gardu: Object.fromEntries(
          POSKO_LIST.map(p => [
            `posko_${p.label.toLowerCase()}`,
            resolveGardu(row.gardu?.[p.key], p.key)
          ])
        )
      }))
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Jadwal_HAR_ROW_Gardu_${monthLabel.replace(/\s/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Export Excel ── */
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Jadwal Gabungan ──
    const header1 = ['No', 'Hari', 'Tanggal', 'Tim 1 (Segmen)', 'Tim 2 (Segmen)', 'Total KMS',
      ...POSKO_LIST.map(p => `Posko ${p.label}`)]
    const rows1 = schedule.map(row => [
      row.id,
      row.dayName,
      row.dateStr,
      resolveSegmen(row.har1?.checkedIds).replace(/\n/g, '; '),
      resolveSegmen(row.har2?.checkedIds).replace(/\n/g, '; '),
      parseFloat(row.totalKms || 0),
      ...POSKO_LIST.map(p => resolveGardu(row.gardu?.[p.key], p.key))
    ])
    // Baris total
    rows1.push([
      '', 'TOTAL', '',
      '', '',
      parseFloat(totalKmsAll),
      ...POSKO_LIST.map(p => `${totalGardu(p.key)} gardu`)
    ])
    const ws1 = XLSX.utils.aoa_to_sheet([header1, ...rows1])
    // Style lebar kolom
    ws1['!cols'] = [
      { wch: 4 }, { wch: 10 }, { wch: 16 },
      { wch: 35 }, { wch: 35 }, { wch: 10 },
      ...POSKO_LIST.map(() => ({ wch: 25 }))
    ]
    XLSX.utils.book_append_sheet(wb, ws1, 'Jadwal Gabungan')

    // ── Sheet 2: Rekap KMS ──
    const header2 = ['No', 'Hari', 'Tanggal', 'KMS Tim 1', 'KMS Tim 2', 'Total KMS']
    const rows2 = schedule.map(row => [
      row.id, row.dayName, row.dateStr,
      parseFloat(row.har1?.kms || 0),
      parseFloat(row.har2?.kms || 0),
      parseFloat(row.totalKms || 0)
    ])
    rows2.push(['', 'TOTAL', '', '', '', parseFloat(totalKmsAll)])
    const ws2 = XLSX.utils.aoa_to_sheet([header2, ...rows2])
    ws2['!cols'] = [{ wch: 4 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Rekap KMS')

    // ── Sheet 3-7: Per Posko Gardu ──
    for (const p of POSKO_LIST) {
      const headerP = ['No', 'Hari', 'Tanggal', 'Gardu Dikerjakan', 'Jumlah']
      const rowsP = schedule.map(row => {
        const garduStr = resolveGardu(row.gardu?.[p.key], p.key)
        const count = (row.gardu?.[p.key] || []).length
        return [row.id, row.dayName, row.dateStr, garduStr, count]
      })
      rowsP.push(['', 'TOTAL', '', '', totalGardu(p.key)])
      const wsP = XLSX.utils.aoa_to_sheet([headerP, ...rowsP])
      wsP['!cols'] = [{ wch: 4 }, { wch: 10 }, { wch: 16 }, { wch: 50 }, { wch: 8 }]
      XLSX.utils.book_append_sheet(wb, wsP, `Gardu ${p.label}`)
    }

    const filename = `Jadwal_HAR_ROW_Gardu_${monthLabel.replace(/\s/g, '_')}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  return (
    <div className="laporan-wrap">

      {/* ── Action bar (hidden on print) ── */}
      <div className="laporan-actions no-print">
        <div>
          <div className="laporan-title-small">Preview Laporan Gabungan</div>
          <div className="laporan-subtitle">Dicetak: {today}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="laporan-pdf-hint no-print">💡 Pilih <b>"Save as PDF"</b> di dialog print</span>
          <button className="laporan-btn" style={{background:'#16a34a', color:'white', boxShadow:'0 2px 8px rgba(22,163,74,.3)'}} onClick={handleExportExcel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Export Excel
          </button>
          <button className="laporan-btn" style={{background:'#0891b2', color:'white', boxShadow:'0 2px 8px rgba(8,145,178,.3)'}} onClick={handleExportJSON}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Export JSON
          </button>
          <button className="laporan-btn laporan-btn-pdf" onClick={handleExportPDF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
          <button className="laporan-btn laporan-btn-print" onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* ── Print area ── */}
      <div className="laporan-table-outer">
        <table className="laporan-tbl">

          {/* thead — diulang di setiap halaman saat print */}
          <thead>
            <tr className="laporan-thead-title-row">
              <td colSpan={TOTAL_COLS} className="laporan-thead-title-cell">
                <div className="laporan-title-inner">
                  <div style={{textAlign: 'center'}}>
                    <div className="laporan-doc-title">JADWAL HAR ROW &amp; PENGUKURAN GARDU</div>
                    <div className="laporan-doc-sub">ULP Padalarang &middot; {monthLabel.toUpperCase()}</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr className="laporan-thead-group">
              <th rowSpan={2} className="laporan-th laporan-th-no">No</th>
              <th rowSpan={2} className="laporan-th laporan-th-date" style={{textAlign:'center'}}>Hari &amp; Tanggal</th>
              <th colSpan={3} className="laporan-th laporan-th-group laporan-th-row">HAR ROW</th>
              {POSKO_LIST.map(p => (
                <th key={p.key} className="laporan-th laporan-th-group laporan-th-gardu">
                  Posko {p.label}
                </th>
              ))}
            </tr>
            <tr>
              <th className="laporan-th laporan-th-seg" style={{textAlign:'center'}}>Tim 1 (Segmen)</th>
              <th className="laporan-th laporan-th-seg" style={{textAlign:'center'}}>Tim 2 (Segmen)</th>
              <th className="laporan-th laporan-th-kms" style={{textAlign:'center'}}>KMS</th>
              {POSKO_LIST.map(p => (
                <th key={p.key} className="laporan-th laporan-th-g" style={{textAlign:'center'}}>Nama Gardu</th>
              ))}
            </tr>
          </thead>

          {/* tbody — semua baris data + baris TOTAL di paling bawah */}
          <tbody>
            {schedule.length === 0 && (
              <tr>
                <td colSpan={TOTAL_COLS} className="laporan-td-empty">
                  Belum ada jadwal — atur konfigurasi di tab Jadwal terlebih dahulu
                </td>
              </tr>
            )}

            {schedule.map((row, idx) => (
              <tr key={row.id} className={`laporan-tr ${idx % 2 === 0 ? 'laporan-tr-even' : 'laporan-tr-odd'} laporan-tr-${row.dowClass}`}>
                <td className="laporan-td laporan-td-no">{row.id}</td>
                <td className="laporan-td laporan-td-date">
                  <span className={`laporan-day-chip laporan-day-${row.dowClass}`}>{row.dayName}</span>
                  {' '}<span className="laporan-date-str">{row.dateStr}</span>
                </td>
                <td className="laporan-td laporan-td-seg">{resolveSegmen(row.har1?.checkedIds)}</td>
                <td className="laporan-td laporan-td-seg">{resolveSegmen(row.har2?.checkedIds)}</td>
                <td className="laporan-td laporan-td-kms">{row.totalKms || '0.00'}</td>
                {POSKO_LIST.map(p => (
                  <td key={p.key} className="laporan-td laporan-td-g">
                    {resolveGardu(row.gardu?.[p.key], p.key)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Baris TOTAL — di paling bawah tbody, selalu tampil setelah data terakhir */}
            {schedule.length > 0 && (
              <tr className="laporan-tfoot-row">
                <td colSpan={2} className="laporan-tfoot-label">TOTAL</td>
                <td className="laporan-tfoot-val">—</td>
                <td className="laporan-tfoot-val">—</td>
                <td className="laporan-tfoot-val laporan-tfoot-kms">{totalKmsAll} km</td>
                {POSKO_LIST.map(p => (
                  <td key={p.key} className="laporan-tfoot-val">{totalGardu(p.key)} gardu</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer tanda tangan */}
        <div className="laporan-footer-row">
          <div className="laporan-footer-info">Dicetak: {today} &middot; Sistem Jadwal ULP Padalarang</div>
          <div className="laporan-footer-sign">
            <div className="laporan-sign-box">
              <div className="laporan-sign-title">Mengetahui,</div>
              <div className="laporan-sign-name">Manager ULP Padalarang</div>
              <div className="laporan-sign-line"></div>
              <div className="laporan-sign-nip">NIP. _______________</div>
            </div>
            <div className="laporan-sign-box">
              <div className="laporan-sign-title">Dibuat oleh,</div>
              <div className="laporan-sign-name">Koordinator HAR ROW</div>
              <div className="laporan-sign-line"></div>
              <div className="laporan-sign-nip">NIP. _______________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
