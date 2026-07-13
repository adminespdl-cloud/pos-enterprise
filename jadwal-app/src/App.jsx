import { useState, useMemo, useEffect, useRef } from 'react'
import './App.css'
import { useMasterData } from './context/MasterDataContext'
import MasterDataRow from './components/MasterDataRow'
import MasterDataGardu from './components/MasterDataGardu'
import LaporanGabungan from './components/LaporanGabungan'
import LaporanWA from './components/LaporanWA'

const POSKO_LIST = [
  { key: 'PADALARANG', label: 'Padalarang', defaultTarget: 4 },
  { key: 'BATUJAJAR',  label: 'Batujajar',  defaultTarget: 1 },
  { key: 'CIKALONG',   label: 'Cikalong',   defaultTarget: 1 },
  { key: 'CIPEUNDEUY', label: 'Cipeundeuy', defaultTarget: 1 },
  { key: 'PASIRLANGU', label: 'Pasirlangu', defaultTarget: 1 },
]

const DAY_NAMES   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
const DAY_ABBR    = { Senin:'Sen', Selasa:'Sel', Rabu:'Rab', Kamis:'Kam', Jumat:'Jum', Sabtu:'Sab', Minggu:'Min' }
const DOW_COLOR   = { Senin:'wd', Selasa:'wd', Rabu:'wd', Kamis:'wd', Jumat:'fri', Sabtu:'sat', Minggu:'sun' }

/* ── Sidebar field ── */
function SideField({ label, children }) {
  return (
    <div className="sf-field">
      <label className="sf-label">{label}</label>
      {children}
    </div>
  )
}

/* ── Checkbox Dropdown Cell ──
   allOptions: array of { id, name, kms? } OR just strings (for gardu)
   checked: array of ids/names that are selected
   onToggle(id): called when checkbox toggled
   displayFn(checked, allOptions): returns display string
   searchable: shows a search box inside the popover
*/
function CheckDropdown({ checked = [], allOptions = [], disabledOptions = [], onToggle, displayFn, noResultLabel = '0 dipilih', colClass, searchable = false }) {
  const [open, setOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearchText('') } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const display = displayFn ? displayFn(checked, allOptions)
    : checked.length === 0 ? noResultLabel
    : checked.length === 1 ? (typeof checked[0] === 'string' ? checked[0] : checked[0])
    : `${checked.length} dipilih`

  // Sort alphabetically + filter by search
  const sortedOptions = [...allOptions].sort((a, b) => {
    const na = (typeof a === 'string' ? a : a.name).toLowerCase()
    const nb = (typeof b === 'string' ? b : b.name).toLowerCase()
    return na.localeCompare(nb)
  })

  const filteredOptions = searchable && searchText.trim()
    ? sortedOptions.filter(opt => {
        const name = typeof opt === 'string' ? opt : opt.name
        return name.toLowerCase().includes(searchText.trim().toLowerCase())
      })
    : sortedOptions

  return (
    <td className={`td-check-cell ${colClass || ''}`} ref={ref}>
      <button className="chk-trigger" onClick={() => { setOpen(v => !v); setSearchText('') }}>
        <span className="chk-trigger-txt">{display || noResultLabel}</span>
        <svg className="chk-arrow" width="9" height="5" viewBox="0 0 9 5" fill="none">
          <path d="M1 1l3.5 3L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="chk-popover">
          {searchable && (
            <div className="chk-search-wrap">
              <input
                className="chk-search-input"
                type="text"
                placeholder="🔍 Cari gardu..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div className="chk-pop-title">
            {searchable && searchText ? `${filteredOptions.length} ditemukan` : `${allOptions.length} opsi (🔤 A–Z)`}
          </div>
          <div className="chk-pop-list">
            {filteredOptions.map(opt => {
              const id   = typeof opt === 'string' ? opt : opt.id
              const name = typeof opt === 'string' ? opt : opt.name
              const kms  = typeof opt === 'object' ? opt.kms : null
              const isChecked = checked.includes(id)
              const isDisabled = !isChecked && disabledOptions.includes(id)
              return (
                <label key={id} className={`chk-opt ${isChecked ? 'chk-opt-on' : ''} ${isDisabled ? 'chk-opt-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => onToggle(id)}
                  />
                  <span className="chk-opt-name">{name}</span>
                  {kms != null && (
                    <span className="chk-opt-kms">{kms.toFixed(2)}</span>
                  )}
                </label>
              )
            })}
            {filteredOptions.length === 0 && (
              <div className="chk-empty">{searchText ? `"${searchText}" tidak ditemukan` : 'Tidak ada data'}</div>
            )}
          </div>
        </div>
      )}
    </td>
  )
}

function App() {
  const {
    GARDU_BY_WILAYAH, GARDU_STATS, ROW_STATS, PENYULANG_ROW, getSegmenByPenyulang, allGlobalSegmen
  } = useMasterData();

  const saved = JSON.parse(localStorage.getItem('jadwal_save') || 'null')

  /* ── Config state ── */
  const [monthYear,    setMonthYear]    = useState(saved?.monthYear || '2026-06')
  const [tanggalMerah, setTanggalMerah] = useState(saved?.tanggalMerah || '1, 16')
  const [kerjaSabtu,   setKerjaSabtu]   = useState(saved?.kerjaSabtu ?? false)
  const [kerjaMinggu,  setKerjaMinggu]  = useState(saved?.kerjaMinggu ?? false)

  const defaultPenyulang = PENYULANG_ROW[0]?.id || '';
  const defaultPenyulang2 = PENYULANG_ROW[1]?.id || defaultPenyulang;

  const [targetKms1,  setTargetKms1]  = useState(saved?.targetKms1 || 3.0)
  const [penyulang1,  setPenyulang1]  = useState(saved?.penyulang1 || defaultPenyulang)
  const [segmenAwal1, setSegmenAwal1] = useState(saved?.segmenAwal1 || '')

  const [targetKms2,  setTargetKms2]  = useState(saved?.targetKms2 || 3.0)
  const [penyulang2,  setPenyulang2]  = useState(saved?.penyulang2 || defaultPenyulang2)
  const [segmenAwal2, setSegmenAwal2] = useState(saved?.segmenAwal2 || '')

  // Sync state if it was empty initially
  useEffect(() => {
    if (!penyulang1 && defaultPenyulang) setPenyulang1(defaultPenyulang);
    if (!penyulang2 && defaultPenyulang2) setPenyulang2(defaultPenyulang2);
  }, [defaultPenyulang, defaultPenyulang2, penyulang1, penyulang2]);

  const [poskoTargets, setPoskoTargets] = useState(
    saved?.poskoTargets || Object.fromEntries(POSKO_LIST.map(p => [p.key, p.defaultTarget]))
  )
  // Gardu Awal per Posko (uid of starting gardu for auto-fill)
  const [garduAwal, setGarduAwal] = useState(
    saved?.garduAwal || Object.fromEntries(POSKO_LIST.map(p => [p.key, '']))
  )

  const [schedule,  setSchedule]  = useState(saved?.schedule || [])
  const [activeTab, setActiveTab] = useState('row')

  const segmenList1 = useMemo(() => getSegmenByPenyulang(penyulang1), [penyulang1])
  const segmenList2 = useMemo(() => getSegmenByPenyulang(penyulang2), [penyulang2])

  const getMonthLabel = () => {
    if (!monthYear) return ''
    const [yr, mo] = monthYear.split('-').map(Number)
    return `${MONTH_NAMES[mo - 1]} ${yr}`
  }

  /* ── KMS compute from checked segmen ── */
  const computeKms = (checkedIds) => {
    return checkedIds.reduce((total, id) => {
      const seg = allGlobalSegmen.find(s => s.id === id)
      return total + (seg ? seg.kms : 0)
    }, 0)
  }

  /* ── Core logic ── */
  const getNextSegmens = (penyulang, idx, target) => {
    const segs = getSegmenByPenyulang(penyulang)
    let total = 0, selected = [], i = idx
    while (total < target && i < segs.length) {
      selected.push(segs[i]); total += segs[i].kms; i++
    }
    return { selected, nextIdx: i, total }
  }

  const getNextGardus = (wilayah, idx, target) => {
    const gs = GARDU_BY_WILAYAH[wilayah] || []
    const selected = []; let i = idx
    for (let c = 0; c < target && i < gs.length; c++, i++) selected.push(gs[i])
    return { selected, nextIdx: i }
  }

  const generateSchedule = () => {
    if (!monthYear) return
    const [yr, mo] = monthYear.split('-').map(Number)
    const daysInMonth = new Date(yr, mo, 0).getDate()
    const tglMerahArr = tanggalMerah.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))

    const workDays = []
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(yr, mo - 1, i)
      const dow = d.getDay()
      if (tglMerahArr.includes(i)) continue
      if (dow === 6 && !kerjaSabtu) continue
      if (dow === 0 && !kerjaMinggu) continue
      workDays.push(d)
    }

    const s1Start = segmenList1.findIndex(s => s.id === segmenAwal1)
    const s2Start = segmenList2.findIndex(s => s.id === segmenAwal2)
    let s1Idx = s1Start < 0 ? 0 : s1Start
    let s2Idx = s2Start < 0 ? 0 : s2Start
    const garduIdx = Object.fromEntries(POSKO_LIST.map(p => [p.key, 0]))

    const generated = workDays.map((d, index) => {
      const r1 = getNextSegmens(penyulang1, s1Idx, targetKms1); s1Idx = r1.nextIdx
      const r2 = getNextSegmens(penyulang2, s2Idx, targetKms2); s2Idx = r2.nextIdx
      const garduResult = {}
      for (const p of POSKO_LIST) {
        const res = getNextGardus(p.key, garduIdx[p.key], poskoTargets[p.key])
        garduIdx[p.key] = res.nextIdx
        // store as array of gardu IDs
        garduResult[p.key] = res.selected.map(g => g._uid)
      }
      return {
        id: index + 1,
        dayName: DAY_NAMES[d.getDay()],
        dowClass: DOW_COLOR[DAY_NAMES[d.getDay()]] || 'wd',
        dateStr: `${String(d.getDate()).padStart(2,'0')} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
        har1: {
          // store checked segmen as array of IDs; start at 0 (empty = 0 KMS)
          checkedIds: [],       // default 0
          rawKms: 0,
          kms: '0.00',
          // keep auto suggestion for reference
          suggestedIds: r1.selected.map(s => s.id),
        },
        har2: {
          checkedIds: [],
          rawKms: 0,
          kms: '0.00',
          suggestedIds: r2.selected.map(s => s.id),
        },
        gardu: garduResult, // { POSKO_KEY: string[] }
      }
    })

    setSchedule(generated)
  }

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (schedule.length > 0) return // Skip overwriting if loaded from storage
    }
    generateSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    monthYear, tanggalMerah, kerjaSabtu, kerjaMinggu
  ])

  /* ── Save Progress ── */
  const handleSaveProgress = () => {
    const dataToSave = {
      monthYear, tanggalMerah, kerjaSabtu, kerjaMinggu,
      targetKms1, targetKms2, penyulang1, penyulang2,
      segmenAwal1, segmenAwal2, poskoTargets, garduAwal, schedule
    }
    localStorage.setItem('jadwal_save', JSON.stringify(dataToSave))
    alert('Progress berhasil disimpan!')
  }

  /* ── Toggle segmen checkbox ── */
  const toggleSegmen = (rowId, field, segId, segList) => {
    setSchedule(prev => prev.map(row => {
      if (row.id !== rowId) return row
      const copy = JSON.parse(JSON.stringify(row))
      const cur = copy[field].checkedIds
      const newIds = cur.includes(segId) ? cur.filter(id => id !== segId) : [...cur, segId]
      const newKms = computeKms(newIds)
      copy[field].checkedIds = newIds
      copy[field].rawKms = newKms
      copy[field].kms = newKms.toFixed(2)
      // update totalKms
      const t = copy.har1.rawKms + copy.har2.rawKms
      copy.totalKms = t.toFixed(2)
      copy.rawTotal = t
      return copy
    }))
  }

  /* ── Toggle gardu checkbox ── */
  const toggleGardu = (rowId, poskoKey, garduId) => {
    setSchedule(prev => prev.map(row => {
      if (row.id !== rowId) return row
      const copy = JSON.parse(JSON.stringify(row))
      const cur = copy.gardu[poskoKey] || []
      copy.gardu[poskoKey] = cur.includes(garduId)
        ? cur.filter(g => g !== garduId)
        : [...cur, garduId]
      return copy
    }))
  }

  /* ── Fill auto (use suggested segmen) ── */
  const fillSuggested = (rowId, field) => {
    setSchedule(prev => prev.map(row => {
      if (row.id !== rowId) return row
      const copy = JSON.parse(JSON.stringify(row))
      const segList = field === 'har1' ? segmenList1 : segmenList2
      const newIds = copy[field].suggestedIds || []
      const newKms = computeKms(newIds)
      copy[field].checkedIds = newIds
      copy[field].rawKms = newKms
      copy[field].kms = newKms.toFixed(2)
      const t = copy.har1.rawKms + copy.har2.rawKms
      copy.totalKms = t.toFixed(2)
      copy.rawTotal = t
      return copy
    }))
  }

  /* ── Fill all auto ── */
  const fillAllAuto = (field, segList) => {
    const penyulang = field === 'har1' ? penyulang1 : penyulang2
    const segmenAwal = field === 'har1' ? segmenAwal1 : segmenAwal2
    const targetKms = field === 'har1' ? targetKms1 : targetKms2
    
    setSchedule(prev => {
      const sStart = segList.findIndex(s => s.id === segmenAwal)
      let sIdx = sStart < 0 ? 0 : sStart

      return prev.map(row => {
        const copy = JSON.parse(JSON.stringify(row))
        
        // Skip if row already has selected segments (preserve manual entries)
        if (copy[field].checkedIds && copy[field].checkedIds.length > 0) {
          return copy
        }
        
        const r = getNextSegmens(penyulang, sIdx, targetKms)
        sIdx = r.nextIdx
        
        const newIds = r.selected.map(s => s.id)
        const newKms = computeKms(newIds)
        copy[field].checkedIds = newIds
        copy[field].rawKms = newKms
        copy[field].kms = newKms.toFixed(2)
        
        const t = copy.har1.rawKms + copy.har2.rawKms
        copy.totalKms = t.toFixed(2)
        copy.rawTotal = t
        return copy
      })
    })
  }

  const handleP1Change = val => { setPenyulang1(val); setSegmenAwal1(getSegmenByPenyulang(val)[0]?.id || '') }
  const handleP2Change = val => { setPenyulang2(val); setSegmenAwal2(getSegmenByPenyulang(val)[0]?.id || '') }

  /* ── Fill all auto Gardu per Posko ── */
  const fillAllAutoGardu = (poskoKey) => {
    const garduList = GARDU_BY_WILAYAH[poskoKey] || []
    const target = poskoTargets[poskoKey] || 1
    const startUid = garduAwal[poskoKey]
    
    setSchedule(prev => {
      const startIdx = startUid ? garduList.findIndex(g => g._uid === startUid) : 0
      let idx = startIdx < 0 ? 0 : startIdx
      
      return prev.map(row => {
        const copy = JSON.parse(JSON.stringify(row))
        // Saat klik tombol Isi Otomatis, kita selalu overwrite untuk posko ini
        const res = getNextGardus(poskoKey, idx, target)
        idx = res.nextIdx
        copy.gardu[poskoKey] = res.selected.map(g => g._uid)
        return copy
      })
    })
  }

  /* ── KPI totals ── */
  const totalKms1   = schedule.reduce((s, r) => s + r.har1.rawKms, 0).toFixed(2)
  const totalKms2   = schedule.reduce((s, r) => s + r.har2.rawKms, 0).toFixed(2)
  const totalKmsAll = schedule.reduce((s, r) => s + r.rawTotal, 0).toFixed(2)

  /* ── Used options (for disabling) ── */
  const usedSegmenIds = useMemo(() => {
    const s = new Set()
    schedule.forEach(r => {
      r.har1.checkedIds.forEach(id => s.add(id))
      r.har2.checkedIds.forEach(id => s.add(id))
    })
    return Array.from(s)
  }, [schedule])

  const usedGarduNames = useMemo(() => {
    const obj = {}
    POSKO_LIST.forEach(p => {
      const s = new Set()
      schedule.forEach(r => {
        if (r.gardu[p.key]) r.gardu[p.key].forEach(id => s.add(id))
      })
      obj[p.key] = Array.from(s)
    })
    return obj
  }, [schedule])

  /* ── Date chip ── */
  const DateChip = ({ row }) => (
    <td className="td-date">
      <span className={`day-chip day-${row.dowClass}`}>{DAY_ABBR[row.dayName] || row.dayName}</span>
      <span className="date-str">{row.dateStr}</span>
    </td>
  )

  /* ── Display helper for segmen ── */
  const segDisplayFn = (checkedIds) => {
    if (!checkedIds || checkedIds.length === 0) return '— belum dipilih'
    const names = checkedIds.map(id => {
      const found = allGlobalSegmen.find(o => o.id === id)
      return found ? found.name : id
    })
    return names.join('; ')
  }

  /* ── Display helper for gardu ── */
  const garduDisplayFn = (checkedIds, allOptions) => {
    if (!checkedIds || checkedIds.length === 0) return '— belum dipilih'
    const names = checkedIds.map(id => {
      const found = allOptions.find(o => o._uid === id)
      return found ? found.GARDU : id
    })
    return names.join(', ')
  }

  return (
    <div className="app-shell">

      {/* ══ SHELL BAR ══ */}
      <header className="shell-bar">
        <div className="shell-left">
          <div className="shell-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="9" height="9" rx="1.5" fill="white" fillOpacity=".9"/>
              <rect x="13" y="3" width="9" height="9" rx="1.5" fill="white" fillOpacity=".55"/>
              <rect x="2" y="14" width="9" height="9" rx="1.5" fill="white" fillOpacity=".55"/>
              <rect x="13" y="14" width="9" height="9" rx="1.5" fill="white" fillOpacity=".3"/>
            </svg>
          </div>
          <div className="shell-sep" />
          <div className="shell-breadcrumb">
            <span className="bc-org">PLN ULP Padalarang</span>
            <span className="bc-arrow">›</span>
            <span className="bc-page">Jadwal HAR ROW &amp; Pengukuran Gardu</span>
          </div>
        </div>
        <div className="shell-right">
          <span className="shell-month">{getMonthLabel()}</span>
          <div className="shell-avatar">ULP</div>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="app-body">

        {/* ══ SIDEBAR ══ */}
        <aside className="sidebar">
          <div className="sb-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Pengaturan
          </div>

          <div className="sb-section">
            <div className="sb-section-title">📆 Periode</div>
            <SideField label="Bulan & Tahun">
              <input type="month" className="sf-ctrl" value={monthYear} onChange={e => setMonthYear(e.target.value)} />
            </SideField>
            <SideField label="Tanggal Merah">
              <input type="text" className="sf-ctrl" value={tanggalMerah} onChange={e => setTanggalMerah(e.target.value)} placeholder="cth: 1, 16" />
            </SideField>
            <div className="sf-field">
              <label className="sf-label">Hari Kerja</label>
              <div className="sf-checks">
                <label className="sf-chk"><input type="checkbox" checked={kerjaSabtu} onChange={e => setKerjaSabtu(e.target.checked)} />Sabtu</label>
                <label className="sf-chk"><input type="checkbox" checked={kerjaMinggu} onChange={e => setKerjaMinggu(e.target.checked)} />Minggu</label>
              </div>
            </div>
          </div>

          <div className="sb-section sb-section-tim1">
            <div className="sb-section-title">👷 Tim HAR ROW 1</div>
            <SideField label="Penyulang">
              <select className="sf-ctrl" value={penyulang1} onChange={e => handleP1Change(e.target.value)}>
                {PENYULANG_ROW.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </SideField>
            <SideField label="Segmen Awal">
              <select className="sf-ctrl" value={segmenAwal1} onChange={e => setSegmenAwal1(e.target.value)}>
                {segmenList1.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </SideField>
            <SideField label="Target KMS/Hari">
              <div className="sf-addon">
                <input type="number" step="0.1" min="0" className="sf-ctrl" value={targetKms1} onChange={e => setTargetKms1(parseFloat(e.target.value))} />
                <span className="sf-unit">km</span>
              </div>
            </SideField>
            <button className="sb-fill-btn" onClick={() => fillAllAuto('har1', segmenList1)}>⚡ Isi Otomatis Tim 1</button>
          </div>

          <div className="sb-section sb-section-tim2">
            <div className="sb-section-title">👷 Tim HAR ROW 2</div>
            <SideField label="Penyulang">
              <select className="sf-ctrl" value={penyulang2} onChange={e => handleP2Change(e.target.value)}>
                {PENYULANG_ROW.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </SideField>
            <SideField label="Segmen Awal">
              <select className="sf-ctrl" value={segmenAwal2} onChange={e => setSegmenAwal2(e.target.value)}>
                {segmenList2.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </SideField>
            <SideField label="Target KMS/Hari">
              <div className="sf-addon">
                <input type="number" step="0.1" min="0" className="sf-ctrl" value={targetKms2} onChange={e => setTargetKms2(parseFloat(e.target.value))} />
                <span className="sf-unit">km</span>
              </div>
            </SideField>
            <button className="sb-fill-btn" onClick={() => fillAllAuto('har2', segmenList2)}>⚡ Isi Otomatis Tim 2</button>
          </div>

          <div className="sb-section">
            <div className="sb-section-title">⚡ Target Gardu/Hari</div>
            {POSKO_LIST.map(p => {
              const garduOpts = GARDU_BY_WILAYAH[p.key] || []
              return (
                <div key={p.key} style={{marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--n-100)'}}>
                  <div style={{fontWeight: 600, fontSize: '0.72rem', color: 'var(--n-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em'}}>{p.label}</div>
                  <SideField label="Target/Hari">
                    <input type="number" min="1" className="sf-ctrl" value={poskoTargets[p.key]}
                      onChange={e => setPoskoTargets(prev => ({ ...prev, [p.key]: parseInt(e.target.value) || 1 }))} />
                  </SideField>
                  <SideField label="Gardu Awal">
                    <select className="sf-ctrl" value={garduAwal[p.key]} onChange={e => setGarduAwal(prev => ({...prev, [p.key]: e.target.value}))}>
                      <option value="">— Dari Awal —</option>
                      {garduOpts.map(g => (
                        <option key={g._uid} value={g._uid}>{g.GARDU}</option>
                      ))}
                    </select>
                  </SideField>
                  <button className="sb-fill-btn" style={{marginTop: 4}} onClick={() => fillAllAutoGardu(p.key)}>
                    ⚡ Isi Otomatis {p.label}
                  </button>
                </div>
              )
            })}
          </div>
          
          <div className="sb-section" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
             <button className={`sb-fill-btn ${activeTab === 'master-row' ? 'tab-active' : ''}`} onClick={() => setActiveTab('master-row')} style={{background: activeTab==='master-row' ? 'var(--brand-50)' : 'transparent', borderColor: activeTab==='master-row' ? 'var(--brand-200)' : 'var(--n-200)', color: activeTab==='master-row' ? 'var(--brand)' : 'var(--n-600)'}}>
               📂 Master Data ROW
             </button>
             <button className={`sb-fill-btn ${activeTab === 'master-gardu' ? 'tab-active' : ''}`} onClick={() => setActiveTab('master-gardu')} style={{background: activeTab==='master-gardu' ? 'var(--brand-50)' : 'transparent', borderColor: activeTab==='master-gardu' ? 'var(--brand-200)' : 'var(--n-200)', color: activeTab==='master-gardu' ? 'var(--brand)' : 'var(--n-600)'}}>
               📂 Master Data Gardu
             </button>
          </div>

          <div className="sb-footer">
            <button className="sb-print-btn" onClick={() => window.print()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Jadwal
            </button>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="main-content">

          {/* KPI Bar */}
          <div className="kpi-bar">
            <div className="kpi-item kpi-blue"><div className="kpi-val">{schedule.length}</div><div className="kpi-lbl">Hari Kerja</div></div>
            <div className="kpi-item kpi-teal"><div className="kpi-val">{totalKms1}</div><div className="kpi-lbl">KMS Tim 1</div></div>
            <div className="kpi-item kpi-indigo"><div className="kpi-val">{totalKms2}</div><div className="kpi-lbl">KMS Tim 2</div></div>
            <div className="kpi-item kpi-sky"><div className="kpi-val">{totalKmsAll}</div><div className="kpi-lbl">KMS Gabungan</div></div>
            <div className="kpi-item kpi-amber"><div className="kpi-val">{GARDU_STATS.total}</div><div className="kpi-lbl">Total Gardu</div></div>
            <div className="kpi-item kpi-slate"><div className="kpi-val">{ROW_STATS.total}</div><div className="kpi-lbl">Total Segmen</div></div>
          </div>

          {/* Tab Bar */}
          <div className="tab-bar">
            <button className={`tab-btn ${activeTab === 'row' ? 'tab-active' : ''}`} onClick={() => setActiveTab('row')}>🛣️ Jadwal HAR ROW</button>
            <button className={`tab-btn ${activeTab === 'gardu' ? 'tab-active' : ''}`} onClick={() => setActiveTab('gardu')}>⚡ Pengukuran Gardu</button>
            <button className={`tab-btn ${activeTab === 'master-row' ? 'tab-active' : ''}`} onClick={() => setActiveTab('master-row')}>📂 Master Data ROW</button>
            <button className={`tab-btn ${activeTab === 'master-gardu' ? 'tab-active' : ''}`} onClick={() => setActiveTab('master-gardu')}>📂 Master Data Gardu</button>
            <button className={`tab-btn ${activeTab === 'laporan' ? 'tab-active' : ''}`} onClick={() => setActiveTab('laporan')}>📋 Laporan Gabungan</button>
            <button className={`tab-btn ${activeTab === 'wa' ? 'tab-active' : ''}`} onClick={() => setActiveTab('wa')} style={{color: activeTab==='wa' ? '#25d366' : '', borderColor: activeTab==='wa' ? '#25d366' : ''}}>📱 Laporan WA</button>
            <button className="tab-btn" onClick={handleSaveProgress} style={{background: '#3b82f6', color: 'white', borderColor: '#2563eb', padding: '0 16px', fontWeight: 'bold'}}>💾 Simpan Progress</button>
            <div className="tab-spacer" />
            <span className="tab-info">{schedule.length} hari kerja · {getMonthLabel()}</span>
          </div>

          {/* Table */}
          <div className="tbl-wrap">
            <div className="tbl-scroll">

              {/* ── LAPORAN GABUNGAN Tab ── */}
              {activeTab === 'laporan' && (
                <LaporanGabungan
                  schedule={schedule}
                  allGlobalSegmen={allGlobalSegmen}
                  monthLabel={getMonthLabel()}
                />
              )}

              {/* ── LAPORAN WA Tab ── */}
              {activeTab === 'wa' && (
                <LaporanWA
                  schedule={schedule}
                  allGlobalSegmen={allGlobalSegmen}
                />
              )}

              {/* ── MASTER DATA ROW Tab ── */}
              {activeTab === 'master-row' && (
                <div style={{padding: '0 20px'}}>
                  <MasterDataRow />
                </div>
              )}

              {/* ── MASTER DATA GARDU Tab ── */}
              {activeTab === 'master-gardu' && (
                <div style={{padding: '0 20px'}}>
                  <MasterDataGardu />
                </div>
              )}

              {/* ── HAR ROW Tab ── */}
              {activeTab === 'row' && (
                <table className="data-tbl">
                  <thead>
                    <tr className="thead-title">
                      <th colSpan={7}>
                        JADWAL HAR ROW — TIM 1 &amp; TIM 2
                        <span className="thead-month"> · {getMonthLabel().toUpperCase()} · ULP PADALARANG</span>
                      </th>
                    </tr>
                    <tr>
                      <th className="th th-no" rowSpan="2">No</th>
                      <th className="th th-date" rowSpan="2">Hari &amp; Tanggal</th>
                      <th className="th th-g-tim1" colSpan="2">
                        HAR ROW — TIM 1 <small>({PENYULANG_ROW.find(p=>p.id===penyulang1)?.name || penyulang1})</small>
                      </th>
                      <th className="th th-g-tim2" colSpan="2">
                        HAR ROW — TIM 2 <small>({PENYULANG_ROW.find(p=>p.id===penyulang2)?.name || penyulang2})</small>
                      </th>
                      <th className="th th-g-total" rowSpan="2">TOTAL<br/>KMS</th>
                    </tr>
                    <tr>
                      <th className="th th-s th-s-tim1">Segmen ROW</th>
                      <th className="th th-s th-s-tim1 th-kms">KMS</th>
                      <th className="th th-s th-s-tim2">Segmen ROW</th>
                      <th className="th th-s th-s-tim2 th-kms">KMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.length === 0 ? (
                      <tr><td colSpan={7} className="td-empty">
                        <div className="empty-box"><span className="empty-icon">📋</span><span className="empty-txt">Atur konfigurasi di kiri untuk membuat jadwal</span></div>
                      </td></tr>
                    ) : schedule.map((row, idx) => (
                      <tr key={row.id} className={`dr ${idx%2===0?'dr-even':'dr-odd'} dr-${row.dowClass}`}>
                        <td className="td-no">{row.id}</td>
                        <DateChip row={row} />

                        {/* Tim 1 Segmen Checkbox */}
                        <CheckDropdown
                          checked={row.har1.checkedIds}
                          allOptions={segmenList1}
                          disabledOptions={usedSegmenIds}
                          onToggle={id => toggleSegmen(row.id, 'har1', id, segmenList1)}
                          displayFn={segDisplayFn}
                          noResultLabel="— klik untuk pilih"
                          colClass="col-seg-1"
                        />
                        <td className={`td-kms td-kms-1 ${row.har1.rawKms === 0 ? 'td-kms-zero' : ''}`}>
                          {row.har1.kms}
                        </td>

                        {/* Tim 2 Segmen Checkbox */}
                        <CheckDropdown
                          checked={row.har2.checkedIds}
                          allOptions={segmenList2}
                          disabledOptions={usedSegmenIds}
                          onToggle={id => toggleSegmen(row.id, 'har2', id, segmenList2)}
                          displayFn={segDisplayFn}
                          noResultLabel="— klik untuk pilih"
                          colClass="col-seg-2"
                        />
                        <td className={`td-kms td-kms-2 ${row.har2.rawKms === 0 ? 'td-kms-zero' : ''}`}>
                          {row.har2.kms}
                        </td>

                        <td className={`td-total-kms ${row.rawTotal === 0 ? 'td-kms-zero' : ''}`}>
                          {row.totalKms}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {schedule.length > 0 && (
                    <tfoot>
                      <tr className="tf-row">
                        <td colSpan={2} className="tf-lbl">TOTAL</td>
                        <td className="tf-cell" />
                        <td className="tf-cell tf-kms1">{totalKms1} km</td>
                        <td className="tf-cell" />
                        <td className="tf-cell tf-kms2">{totalKms2} km</td>
                        <td className="tf-cell tf-total-km">{totalKmsAll} km</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}

              {/* ── GARDU Tab ── */}
              {activeTab === 'gardu' && (
                <table className="data-tbl">
                  <thead>
                    <tr className="thead-title thead-title-gardu">
                      <th colSpan={2 + POSKO_LIST.length}>
                        JADWAL PENGUKURAN GARDU PER POSKO
                        <span className="thead-month"> · {getMonthLabel().toUpperCase()} · ULP PADALARANG</span>
                      </th>
                    </tr>
                    <tr>
                      <th className="th th-no">No</th>
                      <th className="th th-date">Hari &amp; Tanggal</th>
                      {POSKO_LIST.map(p => (
                        <th key={p.key} className="th th-g-gardu">
                          Posko {p.label}
                          <div className="th-target">Target: {poskoTargets[p.key]} grd/hari</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.length === 0 ? (
                      <tr><td colSpan={2 + POSKO_LIST.length} className="td-empty">
                        <div className="empty-box"><span className="empty-icon">⚡</span><span className="empty-txt">Atur konfigurasi di kiri untuk membuat jadwal</span></div>
                      </td></tr>
                    ) : schedule.map((row, idx) => (
                      <tr key={row.id} className={`dr ${idx%2===0?'dr-even':'dr-odd'} dr-${row.dowClass}`}>
                        <td className="td-no">{row.id}</td>
                        <DateChip row={row} />
                        {POSKO_LIST.map(p => {
                          const allGardu = GARDU_BY_WILAYAH[p.key] || []
                          const checked  = row.gardu[p.key] || []
                          return (
                            <CheckDropdown
                              key={p.key}
                              checked={checked}
                              allOptions={allGardu.map(g => ({id: g._uid, name: g.GARDU}))}
                              disabledOptions={usedGarduNames[p.key] || []}
                              onToggle={id => toggleGardu(row.id, p.key, id)}
                              displayFn={(c, o) => garduDisplayFn(c, allGardu)}
                              noResultLabel="— klik untuk pilih"
                              colClass="col-gardu"
                              searchable={true}
                            />
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
