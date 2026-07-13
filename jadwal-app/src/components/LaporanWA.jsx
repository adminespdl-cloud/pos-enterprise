import React, { useState, useMemo } from 'react'
import { useMasterData } from '../context/MasterDataContext'

const POSKO_LIST = [
  { key: 'PADALARANG', label: 'Padalarang' },
  { key: 'BATUJAJAR',  label: 'Batujajar'  },
  { key: 'CIKALONG',   label: 'Cikalong'   },
  { key: 'CIPEUNDEUY', label: 'Cipeundeuy' },
  { key: 'PASIRLANGU', label: 'Pasirlangu' },
]

export default function LaporanWA({ schedule, allGlobalSegmen }) {
  const { GARDU_BY_WILAYAH } = useMasterData()

  // Selected day from schedule
  const [selectedRowId, setSelectedRowId] = useState(schedule[0]?.id || null)

  // LM 1-A Tier 1
  const [targetTiang1a, setTargetTiang1a] = useState(113)
  const [carryOver1a, setCarryOver1a] = useState(0)
  const [rencana1a, setRencana1a] = useState('')

  // LM 1-B Tier 2
  const [targetTiang1b, setTargetTiang1b] = useState(29)
  const [carryOver1b, setCarryOver1b] = useState(0)
  const [rencana1b, setRencana1b] = useState('')

  // LM 1-B1 Gardu Tier 1
  const [targetGardu1b1, setTargetGardu1b1] = useState(8)
  const [carryOver1b1, setCarryOver1b1] = useState(0)

  // LM 1-B2 Gardu Tier 2
  const [targetGardu1b2, setTargetGardu1b2] = useState(2)
  const [carryOver1b2, setCarryOver1b2] = useState(0)
  const [thermovisiGardu, setThermovisiGardu] = useState('')

  // LM 2-A ROW
  const [targetKmsRow, setTargetKmsRow] = useState(3)
  const [carryOverRow, setCarryOverRow] = useState(0)

  // LM 2-B Tebang
  const [targetTebang, setTargetTebang] = useState(4)
  const [carryOverTebang, setCarryOverTebang] = useState(0)
  const [rencanaTegang, setRencanaTegang] = useState('')
  const [detailTebang, setDetailTebang] = useState('')

  // LM 3 Tindaklanjut
  const [targetTindak, setTargetTindak] = useState(1)
  const [kumulatifBelum, setKumulatifBelum] = useState(1)
  const [rencanaTindak, setRencanaTindak] = useState(0)
  const [penyulangTindak, setPenyulangTindak] = useState('')
  const [lokasiTindak, setLokasiTindak] = useState('')

  const [copied, setCopied] = useState(false)

  const selectedRow = useMemo(() => schedule.find(r => r.id === selectedRowId), [schedule, selectedRowId])

  // Resolve segmen IDs -> names + kms
  const resolveSegmen = (ids) => {
    if (!ids || ids.length === 0) return []
    return ids.map(id => allGlobalSegmen.find(s => s.id === id)).filter(Boolean)
  }

  // Resolve gardu IDs -> names
  const resolveGardu = (ids, poskoKey) => {
    if (!ids || ids.length === 0) return []
    const garduList = GARDU_BY_WILAYAH[poskoKey] || []
    return ids.map(id => garduList.find(g => g._uid === id)).filter(Boolean).map(g => g.GARDU)
  }

  // Build segmen detail for LM 2-A (ROW sections from schedule)
  const rowSections = useMemo(() => {
    if (!selectedRow) return []
    const sections = []
    const segs1 = resolveSegmen(selectedRow.har1?.checkedIds || [])
    const segs2 = resolveSegmen(selectedRow.har2?.checkedIds || [])

    // Group by penyulang
    const grouped = {}
    for (const s of [...segs1, ...segs2]) {
      const peny = s.id.split('-')[1] || 'UNKNOWN'
      if (!grouped[peny]) grouped[peny] = { segs: [], kms: 0 }
      grouped[peny].segs.push(s.name)
      grouped[peny].kms += s.kms
    }
    for (const [peny, val] of Object.entries(grouped)) {
      sections.push({ penyulang: peny, segs: val.segs, kms: val.kms })
    }
    return sections
  }, [selectedRow, allGlobalSegmen])

  const totalKmsHari = useMemo(() => {
    if (!selectedRow) return '0.00'
    return (selectedRow.rawTotal || 0).toFixed(2)
  }, [selectedRow])

  // Gardu list for LM 1-B1
  const garduHariIni = useMemo(() => {
    if (!selectedRow) return []
    const all = []
    for (const p of POSKO_LIST) {
      const names = resolveGardu(selectedRow.gardu?.[p.key] || [], p.key)
      all.push(...names)
    }
    return all
  }, [selectedRow])

  const generateText = () => {
    if (!selectedRow) return 'Pilih tanggal terlebih dahulu'

    const garduCount = garduHariIni.length
    const thermovisiList = thermovisiGardu
      ? thermovisiGardu.split('\n').map((g, i) => `${i+1}. Thermovisi gardu ${g.trim()}`).join('\n')
      : '1. Thermovisi gardu \n2. Thermovisi gardu '

    const rowDetail = rowSections.length > 0
      ? rowSections.map((s, i) => `${i+1}. Penyulang ${s.penyulang}\nSection: \n${s.segs.join(', ')} ${s.kms.toFixed(2)} KMS`).join('\n\n')
      : 'Detail rencana pekerjaan belum diisi'

    const garduDetail = garduHariIni.length > 0
      ? garduHariIni.map(g => `-Gardu ${g}`).join('\n')
      : '-Gardu (belum dipilih)'

    const tebangDetail = detailTebang
      ? detailTebang.split('\n').map((t, i) => `${i+1}. ${t.trim()}`).join('\n')
      : '(belum diisi)'

    return `Ysh Management UP3 & UID
kami sampaikan laporan Pukul 06.00-09.00
Rencana BREAKFAST Kegiatan 4DX KEHANDALAN JARINGAN di :
ULP PADALARANG 
${selectedRow.dayName}, ${selectedRow.dateStr}


A. INSPEKSI & ASSESMENT
LM 1-A/ INSPEKSI PENYULANG TIER 1
Target Harian : ${targetTiang1a} tiang
Target + Carry Over : ${carryOver1a} tiang
Rencana Inspeksi Hari ini : ${rencana1a} tiang
Detail rencana pekerjaan & lokasi pekerjaan :

${rowDetail}

LM 1-B/ INSPEKSI PENYULANG TIER 2
Target Harian : ${targetTiang1b} tiang
Target + Carry Over : ${carryOver1b} tiang
Rencana Inspeksi Hari ini : ${rencana1b} tiang
Detail rencana pekerjaan & lokasi pekerjaan :

LM 1-B1/ INSPEKSI GARDU (TIER 1)
Target Harian : ${targetGardu1b1} Gardu       
Target + Carry Over : ${carryOver1b1} Gardu 
Rencana Inspeksi Hari ini : ${garduCount} Gardu
Detail realisasi pekerjaan & lokasi pekerjaan : 

${garduDetail}

LM 1-B2/ INSPEKSI GARDU (TIER 2)
Target Harian : ${targetGardu1b2} Gardu       
Target + Carry Over : ${carryOver1b2} Gardu 
Rencana Inspeksi Hari ini : ${targetGardu1b2} Gardu
Detail realisasi pekerjaan & lokasi pekerjaan : 
${thermovisiList}

=======================

B. ROW & TEBANG TUNTAS
LM 2-A/ PEMELIHARAAN ROW
Target Harian : ${targetKmsRow} kms
Target + Carry Over : ${carryOverRow} kms
Rencana Pengamanan ROW Hari ini : ${totalKmsHari} kms
Detail rencana pekerjaan & lokasi pekerjaan :

${rowDetail}

LM 2-B/ TEBANG POHON
Target Harian : ${targetTebang} Batang       
Target + Carry Over : ${carryOverTebang} Batang
Rencana Tebang : ${rencanaTegang} Batang
Detail rencana Tebang pohon : 
${tebangDetail}

=======================

3. TINDAKLANJUT HASIL TEMUAN INSPEKSI
LM 3/ TINDAKLANJUT TEMUAN INSPEKSI
Target Tindaklanjut Hasil Temuan : ${targetTindak} Titik
Komulatif Hasil Temuan Belum di Tindaklanjut : ${kumulatifBelum} titik
Rencana Tindak Lanjut Temuan Inspeksi Hari ini : ${rencanaTindak} Titik
Detail realisasi pekerjaan & lokasi pekerjaan
Penyulang : ${penyulangTindak}
Lokasi : ${lokasiTindak}

=======================

Demikian kami sampaikan`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const waText = generateText()

  return (
    <div className="wa-wrap">
      <div className="wa-layout">

        {/* LEFT: Form */}
        <div className="wa-form-col">
          <div className="wa-section-card">
            <div className="wa-card-title">📅 Pilih Tanggal</div>
            <select className="sf-ctrl" value={selectedRowId} onChange={e => setSelectedRowId(Number(e.target.value))}>
              {schedule.map(r => (
                <option key={r.id} value={r.id}>{r.dayName}, {r.dateStr}</option>
              ))}
            </select>
            {selectedRow && (
              <div className="wa-info-chip">
                ROW: {totalKmsHari} km · {garduHariIni.length} gardu terjadwal
              </div>
            )}
          </div>

          <div className="wa-section-card">
            <div className="wa-card-title">🔍 LM 1-A: Inspeksi Tier 1</div>
            <div className="wa-row2">
              <div><label className="wa-label">Target Tiang</label><input type="number" className="sf-ctrl" value={targetTiang1a} onChange={e=>setTargetTiang1a(Number(e.target.value))} /></div>
              <div><label className="wa-label">Carry Over</label><input type="number" className="sf-ctrl" value={carryOver1a} onChange={e=>setCarryOver1a(Number(e.target.value))} /></div>
            </div>
            <label className="wa-label">Rencana Inspeksi (tiang)</label>
            <input type="text" className="sf-ctrl" value={rencana1a} onChange={e=>setRencana1a(e.target.value)} placeholder="jumlah tiang" />
          </div>

          <div className="wa-section-card">
            <div className="wa-card-title">🔍 LM 1-B: Inspeksi Tier 2</div>
            <div className="wa-row2">
              <div><label className="wa-label">Target Tiang</label><input type="number" className="sf-ctrl" value={targetTiang1b} onChange={e=>setTargetTiang1b(Number(e.target.value))} /></div>
              <div><label className="wa-label">Carry Over</label><input type="number" className="sf-ctrl" value={carryOver1b} onChange={e=>setCarryOver1b(Number(e.target.value))} /></div>
            </div>
            <label className="wa-label">Rencana Inspeksi (tiang)</label>
            <input type="text" className="sf-ctrl" value={rencana1b} onChange={e=>setRencana1b(e.target.value)} placeholder="jumlah tiang" />
          </div>

          <div className="wa-section-card">
            <div className="wa-card-title">⚡ LM 1-B1: Gardu Tier 1</div>
            <div className="wa-info-chip" style={{marginBottom:8}}>
              Gardu hari ini: {garduHariIni.length > 0 ? garduHariIni.join(', ') : '(belum dipilih di tab Gardu)'}
            </div>
            <div className="wa-row2">
              <div><label className="wa-label">Target</label><input type="number" className="sf-ctrl" value={targetGardu1b1} onChange={e=>setTargetGardu1b1(Number(e.target.value))} /></div>
              <div><label className="wa-label">Carry Over</label><input type="number" className="sf-ctrl" value={carryOver1b1} onChange={e=>setCarryOver1b1(Number(e.target.value))} /></div>
            </div>
          </div>

          <div className="wa-section-card">
            <div className="wa-card-title">⚡ LM 1-B2: Gardu Tier 2 (Thermovisi)</div>
            <div className="wa-row2">
              <div><label className="wa-label">Target</label><input type="number" className="sf-ctrl" value={targetGardu1b2} onChange={e=>setTargetGardu1b2(Number(e.target.value))} /></div>
              <div><label className="wa-label">Carry Over</label><input type="number" className="sf-ctrl" value={carryOver1b2} onChange={e=>setCarryOver1b2(Number(e.target.value))} /></div>
            </div>
            <label className="wa-label">Nama Gardu Thermovisi (1 per baris)</label>
            <textarea className="sf-ctrl wa-textarea" rows={3} value={thermovisiGardu} onChange={e=>setThermovisiGardu(e.target.value)} placeholder={"GRD-A\nGRD-B"} />
          </div>

          <div className="wa-section-card">
            <div className="wa-card-title">🛣️ LM 2-A: Pemeliharaan ROW</div>
            <div className="wa-info-chip" style={{marginBottom:8}}>Total KMS hari ini: <b>{totalKmsHari} km</b> (otomatis dari jadwal)</div>
            <div className="wa-row2">
              <div><label className="wa-label">Target KMS</label><input type="number" step="0.1" className="sf-ctrl" value={targetKmsRow} onChange={e=>setTargetKmsRow(Number(e.target.value))} /></div>
              <div><label className="wa-label">Carry Over</label><input type="number" step="0.1" className="sf-ctrl" value={carryOverRow} onChange={e=>setCarryOverRow(Number(e.target.value))} /></div>
            </div>
          </div>

          <div className="wa-section-card">
            <div className="wa-card-title">🌿 LM 2-B: Tebang Pohon</div>
            <div className="wa-row2">
              <div><label className="wa-label">Target Batang</label><input type="number" className="sf-ctrl" value={targetTebang} onChange={e=>setTargetTebang(Number(e.target.value))} /></div>
              <div><label className="wa-label">Carry Over</label><input type="number" className="sf-ctrl" value={carryOverTebang} onChange={e=>setCarryOverTebang(Number(e.target.value))} /></div>
            </div>
            <label className="wa-label">Rencana Tebang (batang)</label>
            <input type="text" className="sf-ctrl" value={rencanaTegang} onChange={e=>setRencanaTegang(e.target.value)} placeholder="0" />
            <label className="wa-label" style={{marginTop:8}}>Detail Tebang (1 per baris)</label>
            <textarea className="sf-ctrl wa-textarea" rows={3} value={detailTebang} onChange={e=>setDetailTebang(e.target.value)} placeholder={"Pohon Bambu Penyulang X\nPohon Jati Penyulang Y"} />
          </div>

          <div className="wa-section-card">
            <div className="wa-card-title">📌 LM 3: Tindaklanjut Temuan</div>
            <div className="wa-row2">
              <div><label className="wa-label">Target Titik</label><input type="number" className="sf-ctrl" value={targetTindak} onChange={e=>setTargetTindak(Number(e.target.value))} /></div>
              <div><label className="wa-label">Kumulatif Belum</label><input type="number" className="sf-ctrl" value={kumulatifBelum} onChange={e=>setKumulatifBelum(Number(e.target.value))} /></div>
            </div>
            <label className="wa-label">Rencana Tindaklanjut (titik)</label>
            <input type="number" className="sf-ctrl" value={rencanaTindak} onChange={e=>setRencanaTindak(Number(e.target.value))} />
            <label className="wa-label" style={{marginTop:8}}>Penyulang</label>
            <input type="text" className="sf-ctrl" value={penyulangTindak} onChange={e=>setPenyulangTindak(e.target.value)} placeholder="Nama penyulang" />
            <label className="wa-label" style={{marginTop:8}}>Lokasi</label>
            <input type="text" className="sf-ctrl" value={lokasiTindak} onChange={e=>setLokasiTindak(e.target.value)} placeholder="Lokasi temuan" />
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="wa-preview-col">
          <div className="wa-preview-header">
            <div>
              <div className="wa-preview-title">📱 Preview Pesan WA</div>
              <div className="wa-preview-sub">Siap dikirim ke grup management</div>
            </div>
            <button className={`wa-copy-btn ${copied ? 'wa-copy-copied' : ''}`} onClick={handleCopy}>
              {copied ? '✅ Tersalin!' : '📋 Copy Teks'}
            </button>
          </div>
          <div className="wa-preview-body">
            <pre className="wa-preview-text">{waText}</pre>
          </div>
        </div>

      </div>
    </div>
  )
}
