// ============================================================
//  SPKL PADALARANG - Google Apps Script COMPLETE (Clean UI)
//  Versi Final — Warna Bersih (Header Biru Muda, Judul Tanpa Warna)
//  UPDATED: Eviden dikelompokkan per Minggu & Kategori
// ============================================================

// ============================================================
//  KONFIGURASI — SESUAIKAN DI SINI
// ============================================================
var ID_FILE_SUMBER    = '1YiXREQJ4Xl39L1N6-FjPY40YoqZZcyCNLnEPi5drIJ4';
var NAMA_SHEET_SUMBER = 'Rekap Lembur';
var SHEET_TUJUAN      = 'Spkl Padalarang';
var SHEET_HARTEK      = 'HARTEK';

// ============================================================
//  KONSTANTA KOLOM
// ============================================================
var COL = {
  NO_INDUK    : 0,   NAMA        : 1,   JABATAN     : 2,   PENEMPATAN  : 3,
  KATEGORI    : 4,   KET_LEMBUR  : 5,   LOKASI      : 6,   TGL_LEMBUR  : 7,
  SHIFT       : 8,   JAM_KERJA   : 9,   WAKTU_LEMBUR: 10,  JML_JAM     : 11,
  KETERANGAN  : 12,  EVIDEN_FOTO1: 13,  EVIDEN_FOTO2: 14,  MINGGU_KE   : 15,
  TIMESTAMP   : 16
};

var ROMAN       = ['I', 'II', 'III', 'IV', 'V', 'VI'];
var MINGGU_KEYS = ['Minggu ke-1','Minggu ke-2','Minggu ke-3','Minggu ke-4','Minggu ke-5','Minggu ke-6'];
var NAMA_BULAN  = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
var HEADER_KOLOM = [
  'NO','NO INDUK','NAMA','JABATAN','PENEMPATAN','KATEGORI',
  'KETERANGAN LEMBUR','TGL LEMBUR','SHIFT','JAM KERJA',
  'WAKTU LEMBUR/KJK','Jml JAM','KETERANGAN'
];
var JML_KOL    = HEADER_KOLOM.length; // 13

var HEADER_HARTEK = [
  'NO','TANGGAL','NO WO','PETUGAS','KEGIATAN','MATERIAL',
  'PLN','ES','FOTO SEBELUM','FOTO PELAKSANAAN','FOTO SESUDAH'
];
var JML_KOL_HARTEK = HEADER_HARTEK.length; // 11

var PROP_BULAN = 'PDL_BULAN';
var PROP_TAHUN = 'PDL_TAHUN';

// ============================================================
//  MENU
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SPKL PADALARANG')
    .addItem('🏗️ Buat Template Otomatis',  'buatTemplateOtomatis')
    .addItem('🏗️ Buat Template HARTEK',    'buatTemplateHartek')
    .addSeparator()
    .addItem('▶ GENERATE SPKL',            'generateSPKL')
    .addItem('▶ GENERATE HARTEK',          'generateHartek')
    .addItem('▶ GENERATE EVIDEN',          'generateEviden')
    .addItem('🏆 GENERATE KLASEMEN',       'generateKlasemen')
    .addItem('▶ GENERATE SEMUA',           'generateSemua')
    .addSeparator()
    .addItem('🗓️ Pilih Bulan & Tahun',     'pilihBulan')
    .addItem('🧹 Reset Template',           'resetTemplate')
    .addSeparator()
    .addItem('🔗 Cek Koneksi Sumber',      'cekKoneksi')
    .addItem('🔍 Debug Lengkap',           'debugLengkap')
    .addToUi();
}

// ============================================================
//  BUAT TEMPLATE OTOMATIS DI SHEET TUJUAN
// ============================================================
function buatTemplateOtomatis() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.alert(
    '🏗️ Buat Template Otomatis',
    'Script akan membangun struktur template\ndi sheet "' + SHEET_TUJUAN + '".\n\n' +
    '⚠️ Isi sheet saat ini akan DIHAPUS.\nLanjutkan?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TUJUAN);
  if (!sheet) sheet = ss.insertSheet(SHEET_TUJUAN);

  sheet.clearContents();
  sheet.clearFormats();
  var maxRow = sheet.getMaxRows();
  if (maxRow > 300) sheet.deleteRows(301, maxRow - 300);

  // Atur lebar kolom (tanpa kolom UPAH)
  var lebar = [40,95,150,130,120,100,150,100,60,80,110,70,150];
  lebar.forEach(function(l, i) { sheet.setColumnWidth(i + 1, l); });

  var r = 1;

  // ── HELPER FUNGSI ──────────────────────────────────────────
  function setJudul(rowNum, teks, bg, fg, fs) {
    sheet.setRowHeight(rowNum, 26);
    sheet.getRange(rowNum, 1, 1, JML_KOL).merge()
         .setValue(teks)
         .setBackground(bg).setFontColor(fg)
         .setFontWeight('bold').setFontSize(fs)
         .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }

  function setHeaderKolom(rowNum) {
    sheet.setRowHeight(rowNum, 42);
    sheet.getRange(rowNum, 1, 1, JML_KOL)
         .setValues([HEADER_KOLOM])
         .setBackground('#CFE2F3').setFontColor('#000000').setFontWeight('bold').setFontSize(9)
         .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true)
         .setBorder(true,true,true,true,true,true,'#000000',SpreadsheetApp.BorderStyle.SOLID);
  }

  function setHeaderMinggu(rowNum, label) {
    sheet.setRowHeight(rowNum, 21);
    sheet.getRange(rowNum, 1, 1, JML_KOL).merge()
         .setValue(label)
         .setBackground('#E3F2FD').setFontColor('#000000') // Biru Muda yang lebih soft
         .setFontWeight('bold').setFontSize(9).setVerticalAlignment('middle')
         .setBorder(true,true,true,true,false,false,'#999999',SpreadsheetApp.BorderStyle.SOLID);
  }

  function setSpacer(rowNum) {
    sheet.setRowHeight(rowNum, 7);
    sheet.getRange(rowNum, 1, 1, JML_KOL).setBackground('#F5F5F5').merge();
  }

  function setEmptyDataRow(rowNum) {
    sheet.setRowHeight(rowNum, 20);
    sheet.getRange(rowNum, 1, 1, JML_KOL).setBackground('#FFFFFF');
  }

  // Warna Tema Baru
  var bgBiruMuda = '#CFE2F3';
  var fgHitam    = '#000000';
  var bgPutih    = '#FFFFFF';

  // ── JUDUL LAPORAN (Tanpa Warna) ───────────────────────────
  setJudul(r, 'DATA LEMBURAN YANTEK AREA PADALARANG', bgPutih, fgHitam, 13); r++;
  setJudul(r, 'PT. HALEYORA POWER',                  bgPutih, fgHitam, 11); r++;
  setJudul(r, 'PERIODE PEMBAYARAN',                  bgPutih, fgHitam, 10); r++;
  setSpacer(r); r++;

  // ── SECTION: FIX COST (Header Biru Muda) ──────────────────
  setJudul(r, 'FIX COST', bgBiruMuda, fgHitam, 11); r++;
  setHeaderKolom(r); r++;
  for (var w = 0; w < ROMAN.length; w++) {
    setHeaderMinggu(r, 'FIX COST ( MINGGU KE ' + ROMAN[w] + ' )'); r++;
    setEmptyDataRow(r); r++;
  }
  setSpacer(r); r++;

  // ── SECTION: FIXCOST SAMA VARCOST + CUTI DAN SAKIT ────────
  setJudul(r, 'FIXCOST SAMA VARCOST', bgBiruMuda, fgHitam, 11); r++;
  setJudul(r, 'CUTI DAN SAKIT',       bgBiruMuda, fgHitam, 10); r++;
  setHeaderKolom(r); r++;
  for (var w = 0; w < ROMAN.length; w++) {
    setHeaderMinggu(r, 'CUTI DAN SAKIT ( MINGGU KE ' + ROMAN[w] + ' )'); r++;
    setEmptyDataRow(r); r++;
  }
  setSpacer(r); r++;

  // ── SECTION: VARCOST ──────────────────────────────────────
  setJudul(r, 'VARCOST', bgBiruMuda, fgHitam, 11); r++;
  setHeaderKolom(r); r++;
  for (var w = 0; w < ROMAN.length; w++) {
    setHeaderMinggu(r, 'VARCOST ( MINGGU KE ' + ROMAN[w] + ' )'); r++;
    setEmptyDataRow(r); r++;
  }
  setSpacer(r); r++;

  // ── AREA GRAND TOTAL ──────────────────────────────────────
  setJudul(r, 'GRAND TOTAL', bgBiruMuda, fgHitam, 10); r++;
  var gtRows = [
    ['Grand Total FIX COST',       '#F8F9FA', 'bold'],
    ['Grand Total CUTI DAN SAKIT', '#F8F9FA', 'bold'],
    ['Grand Total VARCOST',        '#F8F9FA', 'bold'],
    ['Grand Total KESELURUHAN',    '#E3F2FD', 'bold'] // Total Akhir sedikit lebih biru
  ];
  gtRows.forEach(function(g) {
    sheet.setRowHeight(r, 24);
    sheet.getRange(r, 1, 1, JML_KOL).merge().setValue(g[0])
         .setBackground(g[1]).setFontColor(fgHitam).setFontWeight(g[2]).setFontSize(10)
         .setVerticalAlignment('middle');
    r++;
  });

  sheet.setFrozenRows(3);

  ui.alert('✅ Template "' + SHEET_TUJUAN + '" Berhasil Dibuat dengan tema Biru Muda/Putih!');
}

// ============================================================
//  AMBIL DATA DARI FILE SUMBER EKSTERNAL
// ============================================================
function ambilDataSumber() {
  try {
    var file  = SpreadsheetApp.openById(ID_FILE_SUMBER);
    var sheet = file.getSheetByName(NAMA_SHEET_SUMBER);
    if (!sheet) {
      SpreadsheetApp.getUi().alert('❌ Sheet "' + NAMA_SHEET_SUMBER + '" tidak ditemukan!');
      return null;
    }
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) { SpreadsheetApp.getUi().alert('⚠️ Sheet sumber kosong!'); return null; }
    return data.slice(1);
  } catch(e) {
    SpreadsheetApp.getUi().alert('❌ Gagal akses file sumber!\nError: ' + e.message);
    return null;
  }
}

// ============================================================
//  CEK KONEKSI
// ============================================================
function cekKoneksi() {
  var ui = SpreadsheetApp.getUi();
  try {
    var file  = SpreadsheetApp.openById(ID_FILE_SUMBER);
    var sheet = file.getSheetByName(NAMA_SHEET_SUMBER);
    if (!sheet) { ui.alert('⚠️ Sheet tidak ditemukan!'); return; }
    ui.alert('✅ Koneksi Berhasil!\n📁 ' + file.getName() + '\n📊 Data: ' + (sheet.getLastRow()-1) + ' baris');
  } catch(e) { ui.alert('❌ Koneksi Gagal!\n' + e.message); }
}

// ============================================================
//  PILIH BULAN & TAHUN
// ============================================================
function pilihBulan() {
  var ui    = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties();
  var bA    = props.getProperty(PROP_BULAN);
  var tA    = props.getProperty(PROP_TAHUN);
  var info  = (bA && tA) ? 'Aktif: ' + NAMA_BULAN[parseInt(bA)-1] + ' ' + tA + '\n\n' : '';

  var rb = ui.prompt('🗓️ Pilih Bulan', info + 'Masukkan nomor bulan (1–12):', ui.ButtonSet.OK_CANCEL);
  if (rb.getSelectedButton() !== ui.Button.OK) return;
  var bulan = parseInt(rb.getResponseText().trim());
  if (isNaN(bulan) || bulan < 1 || bulan > 12) { ui.alert('❌ Tidak valid!'); return; }

  var rt = ui.prompt('📅 Pilih Tahun', 'Masukkan tahun:', ui.ButtonSet.OK_CANCEL);
  if (rt.getSelectedButton() !== ui.Button.OK) return;
  var tahun = parseInt(rt.getResponseText().trim());
  if (isNaN(tahun)) { ui.alert('❌ Tahun tidak valid!'); return; }

  props.setProperty(PROP_BULAN, bulan.toString());
  props.setProperty(PROP_TAHUN, tahun.toString());
  ui.alert('✅ Filter: ' + NAMA_BULAN[bulan-1] + ' ' + tahun);
}

function getFilterAktif() {
  var props = PropertiesService.getDocumentProperties();
  var b = props.getProperty(PROP_BULAN), t = props.getProperty(PROP_TAHUN);
  return (b && t) ? { bulan: parseInt(b), tahun: parseInt(t) } : null;
}

function filterDataByBulan(arr) {
  var f = getFilterAktif();
  if (!f) return arr;
  return arr.filter(function(row) {
    var tgl = row[COL.TGL_LEMBUR];
    if (!(tgl instanceof Date)) tgl = new Date(tgl);
    return !isNaN(tgl.getTime()) && tgl.getMonth() + 1 === f.bulan && tgl.getFullYear() === f.tahun;
  });
}

// ============================================================
//  RESET TEMPLATE
// ============================================================
function resetTemplate() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.alert('⚠️ Reset Template', 'Semua data akan dihapus.\nLanjutkan?', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TUJUAN);
  if (!sheet) { ui.alert('❌ Sheet tidak ditemukan!'); return; }

  for (var w = 5; w >= 0; w--) _resetWeekSection(sheet, 'VARCOST',  ROMAN[w]);
  for (var w = 5; w >= 0; w--) _resetWeekSection(sheet, 'CUTI',     ROMAN[w]);
  for (var w = 5; w >= 0; w--) _resetWeekSection(sheet, 'FIXCOST',  ROMAN[w]);

  ui.alert('✅ Template direset!');
}

function _resetWeekSection(sheet, sectionType, roman) {
  var wRow = _cariBarisWeek(sheet, sectionType, roman);
  if (wRow === -1) return;
  var next = _cariBatasBerikutnya(sheet, wRow);
  var del  = next - wRow - 1;
  if (del > 0) sheet.deleteRows(wRow + 1, del);
  sheet.insertRowBefore(wRow + 1);
  sheet.setRowHeight(wRow + 1, 20);
  sheet.getRange(wRow + 1, 1, 1, JML_KOL).clearContent().setBackground('#FFFFFF');
}

// ============================================================
//  GENERATE FUNCTIONS
// ============================================================
function generateSPKL() {
  var filter = getFilterAktif();
  if (!filter) {
    if (SpreadsheetApp.getUi().alert('⚠️ Tampilkan SEMUA data?', SpreadsheetApp.getUi().ButtonSet.OK_CANCEL) === SpreadsheetApp.getUi().Button.CANCEL) return;
  }
  _prosesDataSPKL();
  var f = getFilterAktif();
  SpreadsheetApp.getUi().alert(f ? '✅ Selesai!\nPeriode: ' + NAMA_BULAN[f.bulan-1] + ' ' + f.tahun : '✅ Selesai!');
}

function generateEviden() {
  _buatSheetEviden('EVIDEN KEGIATAN');
  _buatSheetEviden('EVIDEN SPKL');
  SpreadsheetApp.getUi().alert('✅ Generate Eviden Selesai!');
}

function generateKlasemen() {
  _buatKlasemenSPKL();
  SpreadsheetApp.getUi().alert('🏆 Klasemen SPKL dibuat!');
}

function generateSemua() {
  _prosesDataSPKL();
  _prosesDataHartek();
  _buatSheetEviden('EVIDEN KEGIATAN');
  _buatSheetEviden('EVIDEN SPKL');
  _buatKlasemenSPKL();
  SpreadsheetApp.getUi().alert('✅ Semua Generate Selesai!');
}

// ============================================================
//  PROSES DATA SPKL
// ============================================================
function _prosesDataSPKL() {
  var raw = ambilDataSumber(); if (!raw) return;
  var filtered = filterDataByBulan(raw);
  var filter   = getFilterAktif();

  if (filter && filtered.length === 0) { SpreadsheetApp.getUi().alert('⚠️ Tidak ada data!'); return; }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TUJUAN);
  if (!sheet) { SpreadsheetApp.getUi().alert('❌ Sheet tidak ada!'); return; }

  var fixData = [], varData = [], cutiData = [];
  filtered.forEach(function(row) {
    var jab = String(row[COL.JABATAN]   || '').toUpperCase().trim();
    var ket = String(row[COL.KET_LEMBUR]|| '').toUpperCase().trim();
    if (ket.indexOf('CUTI') > -1 || ket.indexOf('SAKIT') > -1) cutiData.push(row);
    else if (jab === 'VARCOST') varData.push(row);
    else fixData.push(row);
  });

  var fixPM  = _kelompokkanPerMinggu(fixData);
  var varPM  = _kelompokkanPerMinggu(varData);
  var cutiPM = _kelompokkanPerMinggu(cutiData);

  for (var w = 5; w >= 0; w--) _prosesWeekSection(sheet, 'VARCOST',  ROMAN[w], varPM[MINGGU_KEYS[w]]  || []);
  for (var w = 5; w >= 0; w--) _prosesWeekSection(sheet, 'CUTI',     ROMAN[w], cutiPM[MINGGU_KEYS[w]] || []);
  for (var w = 5; w >= 0; w--) _prosesWeekSection(sheet, 'FIXCOST',  ROMAN[w], fixPM[MINGGU_KEYS[w]]  || []);

  _updateGrandTotal(sheet, fixData, varData, cutiData);
}

function _prosesWeekSection(sheet, sectionType, roman, dataArray) {
  var wRow = _cariBarisWeek(sheet, sectionType, roman);
  if (wRow === -1) return;
  var next = _cariBatasBerikutnya(sheet, wRow);
  var del  = next - wRow - 1;
  if (del > 0) sheet.deleteRows(wRow + 1, del);
  _isiDataRows(sheet, wRow + 1, dataArray);
}

function _cariBarisWeek(sheet, sectionType, roman) {
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    var a = String(data[i][0] || '').toUpperCase().replace(/\s+/g,' ').trim();
    if (!a) continue;
    var hasMinggu = a.indexOf('MINGGU KE ' + roman) > -1 || a.indexOf('MINGGU KE'  + roman) > -1;
    if (!hasMinggu) continue;
    if (sectionType === 'FIXCOST' && a.indexOf('FIX COST') > -1 && a.indexOf('VARCOST') === -1) return i + 1;
    if (sectionType === 'VARCOST' && a.indexOf('VARCOST')  > -1 && a.indexOf('FIX COST') === -1 && a.indexOf('CUTI') === -1) return i + 1;
    if (sectionType === 'CUTI'    && (a.indexOf('CUTI') > -1 || a.indexOf('SAKIT') > -1)) return i + 1;
  }
  return -1;
}

function _cariBatasBerikutnya(sheet, fromRow) {
  var data = sheet.getDataRange().getValues();
  for (var i = fromRow; i < data.length; i++) {
    if (_adalahBarisBatas(data[i])) return i + 1;
  }
  return sheet.getLastRow() + 1;
}

function _adalahBarisBatas(rowData) {
  var a = String(rowData[0] || '').toUpperCase().replace(/\s+/g,' ').trim();
  var b = String(rowData[1] || '').toUpperCase().trim();
  if (!a) return false;
  for (var r = 0; r < ROMAN.length; r++) { if (a.indexOf('MINGGU KE ' + ROMAN[r]) > -1 || a.indexOf('MINGGU KE'  + ROMAN[r]) > -1) return true; }
  if (a === 'FIX COST' || a === 'VARCOST' || a.indexOf('FIXCOST SAMA VARCOST') > -1 || a.indexOf('FIX COST SAMA VARCOST') > -1 || a === 'CUTI DAN SAKIT') return true;
  if (a.indexOf('GRAND TOTAL') > -1 || b === 'NO INDUK' || a.indexOf('DATA LEMBURAN') > -1 || a.indexOf('HALEYORA') > -1 || a.indexOf('PERIODE') > -1) return true;
  return false;
}

function _isiDataRows(sheet, startRow, dataArray) {
  if (dataArray.length === 0) {
    sheet.insertRowBefore(startRow); sheet.setRowHeight(startRow, 20);
    sheet.getRange(startRow, 1).setValue('TIDAK ADA DATA').setFontStyle('italic').setFontColor('#9E9E9E');
    return;
  }
  dataArray.sort(function(a, b) { return new Date(a[COL.TGL_LEMBUR]) - new Date(b[COL.TGL_LEMBUR]); });
  var tz = Session.getScriptTimeZone();
  for (var d = 0; d < dataArray.length; d++) {
    var item = dataArray[d], tgl = item[COL.TGL_LEMBUR];
    var tglStr = (tgl instanceof Date) ? Utilities.formatDate(tgl, tz, 'dd-MM-yyyy') : String(tgl || '');
    sheet.insertRowBefore(startRow + d); sheet.setRowHeight(startRow + d, 20);
    sheet.getRange(startRow + d, 1, 1, JML_KOL).setValues([[
      d+1, item[COL.NO_INDUK], item[COL.NAMA], item[COL.JABATAN], item[COL.PENEMPATAN], item[COL.KATEGORI],
      item[COL.KET_LEMBUR], tglStr, item[COL.SHIFT], item[COL.JAM_KERJA], item[COL.WAKTU_LEMBUR], item[COL.JML_JAM], item[COL.KETERANGAN]
    ]]);
  }
}

function _updateGrandTotal(sheet, fixData, varData, cutiData) {
  var data = sheet.getDataRange().getValues(), gtRow = -1;
  for (var i = 0; i < data.length; i++) { if (String(data[i][0] || '').toUpperCase().indexOf('GRAND TOTAL') > -1) { gtRow = i + 1; break; } }
  if (gtRow === -1) return;

  function hitung(arr) {
    var jam = 0, pet = {};
    arr.forEach(function(r) { jam += parseFloat(r[COL.JML_JAM]) || 0; pet[String(r[COL.NO_INDUK])] = 1; });
    return { k: arr.length, p: Object.keys(pet).length, j: jam.toFixed(2) };
  }
  var fix = hitung(fixData), vr = hitung(varData), cuti = hitung(cutiData);
  var allJam = (parseFloat(fix.j) + parseFloat(vr.j) + parseFloat(cuti.j)).toFixed(2);
  var allPet = {};
  [fixData, varData, cutiData].forEach(function(arr) { arr.forEach(function(r) { allPet[String(r[COL.NO_INDUK])] = 1; }); });

  var rows = [
    { label:'Grand Total FIX COST',       bg:'#F8F9FA', k:fix.k,  p:fix.p,  j:fix.j  },
    { label:'Grand Total CUTI DAN SAKIT', bg:'#F8F9FA', k:cuti.k, p:cuti.p, j:cuti.j },
    { label:'Grand Total VARCOST',        bg:'#F8F9FA', k:vr.k,   p:vr.p,   j:vr.j   },
    { label:'Grand Total KESELURUHAN',    bg:'#E3F2FD', k:fix.k+vr.k+cuti.k, p:Object.keys(allPet).length, j:allJam }
  ];

  rows.forEach(function(g, idx) {
    var rng = sheet.getRange(gtRow + idx, 1, 1, JML_KOL); rng.clearContent();
    sheet.getRange(gtRow + idx, 1).setValue(g.label).setFontWeight('bold');
    sheet.getRange(gtRow + idx, 2).setValue('Kegiatan: ' + g.k);
    sheet.getRange(gtRow + idx, 3).setValue('Petugas: '  + g.p);
    sheet.getRange(gtRow + idx, 4).setValue('Total Jam: '+ g.j);
    rng.setBackground(g.bg).setFontSize(9).setFontColor('#000000');
    if (idx === 3) rng.setFontWeight('bold').setFontSize(10);
  });
}

function _kelompokkanPerMinggu(arr) {
  var h = {}; MINGGU_KEYS.forEach(function(k) { h[k] = []; });
  arr.forEach(function(row) { var mk = String(row[COL.MINGGU_KE] || '').trim(); if (h[mk] !== undefined) h[mk].push(row); });
  return h;
}

// ============================================================
//  KLASEMEN SPKL (Tema Bersih)
// ============================================================
function _buatKlasemenSPKL() {
  var raw = ambilDataSumber(); if (!raw) return;
  var filtered = filterDataByBulan(raw);
  var filter   = getFilterAktif();

  var map = {}, urut = [];
  filtered.forEach(function(row) {
    var ni  = String(row[COL.NO_INDUK]||'').trim(), nm  = String(row[COL.NAMA]||'').trim(), jab = String(row[COL.JABATAN]||'').trim();
    var pen = String(row[COL.PENEMPATAN]||'').trim(), kat = String(row[COL.KATEGORI]||'').trim(), mk  = String(row[COL.MINGGU_KE]||'').trim();
    var jam = parseFloat(row[COL.JML_JAM]) || 0, ket = String(row[COL.KET_LEMBUR]||'').toUpperCase().trim();
    if (!ni) return;
    if (!map[ni]) { map[ni] = { ni:ni, nm:nm, jab:jab, pen:pen, kat:kat, kegiatan:0, jam:0, cutiSakit:0, minggu:{} }; urut.push(ni); }
    map[ni].kegiatan++; map[ni].jam += jam;
    if (ket.indexOf('CUTI') > -1 || ket.indexOf('SAKIT') > -1) map[ni].cutiSakit++;
    if (mk) map[ni].minggu[mk] = true;
  });

  var list = urut.map(function(k) { return map[k]; });
  list.sort(function(a, b) { return b.jam !== a.jam ? b.jam - a.jam : b.kegiatan - a.kegiatan; });

  var ss = SpreadsheetApp.getActiveSpreadsheet(), old = ss.getSheetByName('KLASEMEN SPKL');
  if (old) ss.deleteSheet(old);
  var sh = ss.insertSheet('KLASEMEN SPKL');
  [45, 45, 95, 165, 135, 120, 80, 80, 90, 70, 175].forEach(function(l,i){ sh.setColumnWidth(i + 1, l); });

  var r = 1, periode = filter ? NAMA_BULAN[filter.bulan-1] + ' ' + filter.tahun : 'SEMUA PERIODE';

  // Judul Tanpa Warna
  sh.setRowHeight(r, 38);
  sh.getRange(r, 1, 1, 11).merge()
    .setValue('🏆  KLASEMEN SPKL PADALARANG  —  ' + periode)
    .setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBackground('#FFFFFF').setFontColor('#000000');
  r++;
  sh.setRowHeight(r, 20);
  sh.getRange(r, 1, 1, 11).merge()
    .setValue('Ranking berdasarkan Total Jam Lembur | Tie-breaker: Jumlah Kegiatan')
    .setFontStyle('italic').setFontSize(9).setHorizontalAlignment('center')
    .setBackground('#FFFFFF').setFontColor('#666666');
  r++; r++;

  // Legenda Warna
  sh.setRowHeight(r, 22);
  sh.getRange(r, 1, 1, 11).merge().setValue('LEGENDA WARNA')
    .setFontWeight('bold').setFontSize(9).setBackground('#CFE2F3').setFontColor('#000000') // Biru muda
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  r++;
  var legenda = [
    { s:'🥇', l:'Rank 1',    bg:'#FFD700', fg:'#000000' }, { s:'🥈', l:'Rank 2',    bg:'#C0C0C0', fg:'#000000' },
    { s:'🥉', l:'Rank 3',    bg:'#CD7F32', fg:'#FFFFFF' }, { s:'🔴', l:'Rank 4–5',  bg:'#EF9A9A', fg:'#B71C1C' },
    { s:'🟠', l:'Rank 6–10', bg:'#FFCC80', fg:'#E65100' }, { s:'🟡', l:'Rank 11–20',bg:'#FFF176', fg:'#F57F17' },
    { s:'🟢', l:'Rank 21–50',bg:'#A5D6A7', fg:'#1B5E20' }, { s:'⚪', l:'Rank 51+',  bg:'#F5F5F5', fg:'#546E7A' },
  ];
  sh.setRowHeight(r, 24);
  legenda.forEach(function(l, i) {
    if (i < 11) sh.getRange(r, i + 1).setValue(l.s + ' ' + l.l).setBackground(l.bg).setFontColor(l.fg).setFontSize(8).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  });
  r++; r++;

  // Header Tabel
  var headerTabel = ['SIMBOL','RANK','NO INDUK','NAMA','JABATAN','PENEMPATAN','KEGIATAN','TOTAL JAM','HADIR\nMINGGU','CUTI/\nSAKIT','BAR CHART JAM LEMBUR'];
  sh.setRowHeight(r, 44);
  sh.getRange(r, 1, 1, 11).setValues([headerTabel])
    .setFontWeight('bold').setFontSize(9).setBackground('#CFE2F3').setFontColor('#000000') // Biru muda
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true)
    .setBorder(true,true,true,true,true,true,'#000000',SpreadsheetApp.BorderStyle.SOLID);
  sh.setFrozenRows(r); r++;

  // Isi Data Ranking
  var maxJam = list.length > 0 ? list[0].jam : 1;
  list.forEach(function(p, idx) {
    var rank = idx + 1, simbol, bg, fg;
    if      (rank === 1) { simbol='🥇'; bg='#FFD700'; fg='#000000'; } else if (rank === 2) { simbol='🥈'; bg='#C0C0C0'; fg='#000000'; }
    else if (rank === 3) { simbol='🥉'; bg='#CD7F32'; fg='#FFFFFF'; } else if (rank <= 5)  { simbol='🔴'; bg='#FFCDD2'; fg='#B71C1C'; }
    else if (rank <= 10) { simbol='🟠'; bg='#FFE0B2'; fg='#E65100'; } else if (rank <= 20) { simbol='🟡'; bg='#FFF9C4'; fg='#F57F17'; }
    else if (rank <= 50) { simbol='🟢'; bg='#E8F5E9'; fg='#1B5E20'; } else                 { simbol='⚪'; bg='#F5F5F5'; fg='#546E7A'; }

    var isi = maxJam > 0 ? Math.round((p.jam / maxJam) * 20) : 0, kosong = 20 - isi;
    var bar = '█'.repeat(isi) + '░'.repeat(kosong) + '  ' + p.jam.toFixed(2) + ' jam';

    sh.setRowHeight(r, rank <= 3 ? 30 : 22);
    sh.getRange(r, 1, 1, 11).setValues([[simbol, rank, p.ni, p.nm, p.jab, p.pen, p.kegiatan, p.jam.toFixed(2), Object.keys(p.minggu).length + ' minggu', p.cutiSakit > 0 ? p.cutiSakit + ' ❗' : '—', bar]])
      .setBackground(bg).setFontColor(fg).setFontSize(rank <= 3 ? 10 : 9).setVerticalAlignment('middle');
    sh.getRange(r, 1).setHorizontalAlignment('center').setFontSize(rank<=3?16:12); sh.getRange(r, 2).setHorizontalAlignment('center').setFontWeight('bold');
    sh.getRange(r, 3).setHorizontalAlignment('center'); sh.getRange(r, 4).setFontWeight(rank<=3?'bold':'normal');
    sh.getRange(r, 7).setHorizontalAlignment('center'); sh.getRange(r, 8).setHorizontalAlignment('center').setFontWeight('bold');
    sh.getRange(r, 9).setHorizontalAlignment('center'); sh.getRange(r, 10).setHorizontalAlignment('center');
    sh.getRange(r, 11).setFontFamily('Courier New').setFontSize(8);
    if (rank <= 3) sh.getRange(r, 1, 1, 11).setBorder(true, true, true, true, false, false, rank===1?'#B8860B':rank===2?'#808080':'#8B4513', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    r++;
  });

  // Footer Total
  sh.setRowHeight(r, 26);
  sh.getRange(r, 1, 1, 11).merge()
    .setValue('📊  Total ' + list.length + ' Petugas  |  Total Keseluruhan: ' + list.reduce(function(s, p) { return s + p.jam; }, 0).toFixed(2) + ' Jam  |  Periode: ' + periode)
    .setFontWeight('bold').setFontSize(10).setBackground('#CFE2F3').setFontColor('#000000') // Biru muda
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  ss.setActiveSheet(sh); ss.moveActiveSheet(2); ss.setActiveSheet(ss.getSheetByName(SHEET_TUJUAN));
}

// ============================================================
//  BUAT SHEET EVIDEN — LAPORAN MINGGUAN
//  Dikelompokkan per Minggu & Kategori sesuai Sheet Spkl Padalarang
//  Struktur: Minggu ke-X → FIX COST / CUTI DAN SAKIT / VARCOST
//            → per Petugas → Foto-foto
// ============================================================
function _buatSheetEviden(namaSheet) {
  var raw = ambilDataSumber(); if (!raw) return;
  var filtered = filterDataByBulan(raw);
  var filter   = getFilterAktif();
  var periode  = filter ? NAMA_BULAN[filter.bulan - 1] + ' ' + filter.tahun : 'SEMUA PERIODE';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ex = ss.getSheetByName(namaSheet);
  if (ex) ss.deleteSheet(ex);
  var sh = ss.insertSheet(namaSheet);

  var MAXK = 8, LBR = 120, TGI_FOTO = 160;
  for (var c = 1; c <= MAXK; c++) sh.setColumnWidth(c, LBR);

  var tz = Session.getScriptTimeZone();

  // ── Klasifikasi data per kategori ──
  var fixData = [], varData = [], cutiData = [];
  filtered.forEach(function(row) {
    var jab = String(row[COL.JABATAN]   || '').toUpperCase().trim();
    var ket = String(row[COL.KET_LEMBUR]|| '').toUpperCase().trim();
    if (ket.indexOf('CUTI') > -1 || ket.indexOf('SAKIT') > -1) cutiData.push(row);
    else if (jab === 'VARCOST') varData.push(row);
    else fixData.push(row);
  });

  // Kelompokkan per minggu
  var fixPM  = _kelompokkanPerMinggu(fixData);
  var cutiPM = _kelompokkanPerMinggu(cutiData);
  var varPM  = _kelompokkanPerMinggu(varData);

  // ── Definisi section sesuai Sheet Spkl Padalarang ──
  var sections = [
    { key: 'FIXCOST',  label: 'FIX COST',       data: fixPM  },
    { key: 'CUTI',     label: 'CUTI DAN SAKIT',  data: cutiPM },
    { key: 'VARCOST',  label: 'VARCOST',         data: varPM  }
  ];

  var cr = 1; // current row

  // ── JUDUL UTAMA ──
  sh.setRowHeight(cr, 34);
  sh.getRange(cr, 1, 1, MAXK).merge()
    .setValue('📷 ' + namaSheet.toUpperCase() + ' — LAPORAN MINGGUAN')
    .setFontWeight('bold').setFontSize(13)
    .setBackground('#FFFFFF').setFontColor('#000000')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  cr++;

  // Sub-judul periode
  sh.setRowHeight(cr, 22);
  sh.getRange(cr, 1, 1, MAXK).merge()
    .setValue('SPKL PADALARANG  —  ' + periode)
    .setFontSize(10).setFontStyle('italic')
    .setBackground('#FFFFFF').setFontColor('#666666')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  cr++;

  // Spacer
  sh.setRowHeight(cr, 6);
  sh.getRange(cr, 1, 1, MAXK).merge().setBackground('#F5F5F5');
  cr++;

  // ── LOOP PER MINGGU ──
  for (var w = 0; w < MINGGU_KEYS.length; w++) {
    var mingguKey   = MINGGU_KEYS[w];
    var romanLabel  = ROMAN[w];

    // Cek apakah minggu ini punya data sama sekali (di salah satu kategori)
    var adaDataMinggu = false;
    sections.forEach(function(sec) {
      if (sec.data[mingguKey] && sec.data[mingguKey].length > 0) adaDataMinggu = true;
    });
    if (!adaDataMinggu) continue; // Skip minggu kosong

    // ── HEADER MINGGU ──
    sh.setRowHeight(cr, 30);
    sh.getRange(cr, 1, 1, MAXK).merge()
      .setValue('📅 MINGGU KE ' + romanLabel)
      .setFontWeight('bold').setFontSize(12)
      .setBackground('#1565C0').setFontColor('#FFFFFF')
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setBorder(true,true,true,true,false,false,'#0D47A1',SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    cr++;

    // ── LOOP PER KATEGORI DALAM MINGGU ──
    sections.forEach(function(sec) {
      var dataKategori = sec.data[mingguKey] || [];
      if (dataKategori.length === 0) return; // Skip kategori kosong

      // Header Kategori
      sh.setRowHeight(cr, 24);
      sh.getRange(cr, 1, 1, MAXK).merge()
        .setValue('📋 ' + sec.label + ' ( MINGGU KE ' + romanLabel + ' )')
        .setFontWeight('bold').setFontSize(10)
        .setBackground('#CFE2F3').setFontColor('#000000')
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setBorder(true,true,true,true,false,false,'#90CAF9',SpreadsheetApp.BorderStyle.SOLID);
      cr++;

      // Sortir data berdasarkan tanggal
      dataKategori.sort(function(a, b) {
        return new Date(a[COL.TGL_LEMBUR]) - new Date(b[COL.TGL_LEMBUR]);
      });

      // Kelompokkan per petugas dalam kategori+minggu ini
      var petugasMap = {}, petugasUrut = [];
      dataKategori.forEach(function(row) {
        var ni  = String(row[COL.NO_INDUK] || '').trim();
        var nm  = String(row[COL.NAMA]     || '').trim();
        var tv  = row[COL.TGL_LEMBUR];
        var ts  = (tv instanceof Date) ? Utilities.formatDate(tv, tz, 'dd-MM-yyyy') : String(tv || '');
        var ket = String(row[COL.KET_LEMBUR] || '').trim();
        var f1  = _ekstrakIDDrive(row[COL.EVIDEN_FOTO1]);
        var f2  = _ekstrakIDDrive(row[COL.EVIDEN_FOTO2]);
        var key = ni + '|' + nm;

        if (!petugasMap[key]) {
          petugasMap[key] = { nm: nm, ni: ni, foto: [] };
          petugasUrut.push(key);
        }
        if (f1) petugasMap[key].foto.push({ id: f1, tgl: ts, ket: ket });
        if (f2) petugasMap[key].foto.push({ id: f2, tgl: ts, ket: ket });
      });

      // Tulis per petugas
      petugasUrut.forEach(function(key) {
        var d = petugasMap[key];
        if (!d.foto.length) return; // Skip jika tidak ada foto

        // Header Petugas
        sh.setRowHeight(cr, 22);
        sh.getRange(cr, 1, 1, MAXK).merge()
          .setValue('👤 ' + d.nm + '  ( ' + d.ni + ' )')
          .setFontWeight('bold').setFontSize(9)
          .setBackground('#E3F2FD').setFontColor('#000000')
          .setVerticalAlignment('middle');
        cr++;

        // Tampilkan foto grid (max MAXK kolom per baris)
        var col = 1;
        var rFoto = cr;       // baris foto
        var rLabel = cr + 1;  // baris label tanggal+keterangan

        sh.setRowHeight(rFoto,  TGI_FOTO);
        sh.setRowHeight(rLabel, 28);

        d.foto.forEach(function(f) {
          if (col > MAXK) {
            // Pindah ke baris baru
            col    = 1;
            rFoto  = rLabel + 1;
            rLabel = rFoto + 1;
            sh.setRowHeight(rFoto,  TGI_FOTO);
            sh.setRowHeight(rLabel, 28);
          }
          // Foto
          sh.getRange(rFoto, col)
            .setFormula('=IMAGE("https://drive.google.com/uc?export=view&id=' + f.id + '",1)')
            .setBackground('#FAFAFA')
            .setBorder(true,true,true,true,false,false,'#E0E0E0',SpreadsheetApp.BorderStyle.SOLID);
          // Label: tanggal + keterangan
          var labelText = f.tgl;
          if (f.ket) labelText += '\n' + f.ket;
          sh.getRange(rLabel, col)
            .setValue(labelText)
            .setHorizontalAlignment('center').setVerticalAlignment('top')
            .setFontSize(7).setWrap(true)
            .setFontColor('#424242');
          col++;
        });

        cr = rLabel + 1;

        // Mini spacer antar petugas
        sh.setRowHeight(cr, 4);
        sh.getRange(cr, 1, 1, MAXK).merge().setBackground('#FFFFFF');
        cr++;
      });

      // Spacer antar kategori
      sh.setRowHeight(cr, 6);
      sh.getRange(cr, 1, 1, MAXK).merge().setBackground('#F5F5F5');
      cr++;
    });

    // ── Summary row per minggu ──
    var totalFotoMinggu = 0;
    var totalPetugasMinggu = {};
    sections.forEach(function(sec) {
      var dataKat = sec.data[mingguKey] || [];
      dataKat.forEach(function(row) {
        var ni = String(row[COL.NO_INDUK] || '').trim();
        totalPetugasMinggu[ni] = true;
        if (_ekstrakIDDrive(row[COL.EVIDEN_FOTO1])) totalFotoMinggu++;
        if (_ekstrakIDDrive(row[COL.EVIDEN_FOTO2])) totalFotoMinggu++;
      });
    });

    sh.setRowHeight(cr, 22);
    sh.getRange(cr, 1, 1, MAXK).merge()
      .setValue('📊 Minggu ke ' + romanLabel + '  —  ' + Object.keys(totalPetugasMinggu).length + ' Petugas  |  ' + totalFotoMinggu + ' Foto')
      .setFontWeight('bold').setFontSize(9)
      .setBackground('#E8EAF6').setFontColor('#283593')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    cr++;

    // Spacer besar antar minggu
    sh.setRowHeight(cr, 10);
    sh.getRange(cr, 1, 1, MAXK).merge().setBackground('#FFFFFF');
    cr++;
  }

  // ── FOOTER TOTAL ──
  var totalSemuaFoto = 0;
  var totalSemuaPetugas = {};
  filtered.forEach(function(row) {
    var ni = String(row[COL.NO_INDUK] || '').trim();
    totalSemuaPetugas[ni] = true;
    if (_ekstrakIDDrive(row[COL.EVIDEN_FOTO1])) totalSemuaFoto++;
    if (_ekstrakIDDrive(row[COL.EVIDEN_FOTO2])) totalSemuaFoto++;
  });

  sh.setRowHeight(cr, 28);
  sh.getRange(cr, 1, 1, MAXK).merge()
    .setValue('📷 TOTAL EVIDEN  —  ' + Object.keys(totalSemuaPetugas).length + ' Petugas  |  ' + totalSemuaFoto + ' Foto  |  Periode: ' + periode)
    .setFontWeight('bold').setFontSize(10)
    .setBackground('#CFE2F3').setFontColor('#000000')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true,true,true,true,false,false,'#90CAF9',SpreadsheetApp.BorderStyle.SOLID);

  sh.setFrozenRows(2);
}

// ============================================================
//  EKSTRAK ID GOOGLE DRIVE
// ============================================================
function _ekstrakIDDrive(url) {
  if (!url) return null;
  var s = url.toString().trim(), m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/); if (m1) return m1[1];
  var m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/); if (m2) return m2[1];
  return null;
}

// ============================================================
//  HARTEK — FORMAT HARROW (SAMA PERSIS)
//  Kolom: NO, TANGGAL, NO WO, PETUGAS, KEGIATAN, MATERIAL,
//         PLN, ES, FOTO SEBELUM, FOTO PELAKSANAAN, FOTO SESUDAH
// ============================================================

// ── BUAT TEMPLATE HARTEK ────────────────────────────────────
function buatTemplateHartek() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.alert(
    '🏗️ Buat Template HARTEK',
    'Script akan membangun struktur template\ndi sheet "' + SHEET_HARTEK + '".\n\n' +
    '⚠️ Isi sheet saat ini akan DIHAPUS.\nLanjutkan?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_HARTEK);
  if (!sheet) sheet = ss.insertSheet(SHEET_HARTEK);

  sheet.clearContents();
  sheet.clearFormats();
  var maxRow = sheet.getMaxRows();
  if (maxRow > 500) sheet.deleteRows(501, maxRow - 500);

  // ── Atur lebar kolom sesuai format Harrow ──
  var lebar = [40, 100, 80, 170, 280, 220, 50, 50, 180, 180, 180];
  lebar.forEach(function(l, i) { sheet.setColumnWidth(i + 1, l); });

  var r = 1;
  var bgBiruMuda = '#CFE2F3';
  var fgHitam    = '#000000';
  var bgPutih    = '#FFFFFF';

  // ── JUDUL LAPORAN (Tanpa Warna — sama seperti SPKL) ────────
  // Baris 1: Judul Utama
  sheet.setRowHeight(r, 30);
  sheet.getRange(r, 1, 1, JML_KOL_HARTEK).merge()
       .setValue('LAPORAN KEGIATAN HARTEK AREA PADALARANG')
       .setBackground(bgPutih).setFontColor(fgHitam)
       .setFontWeight('bold').setFontSize(13)
       .setHorizontalAlignment('center').setVerticalAlignment('middle');
  r++;

  // Baris 2: Sub judul
  sheet.setRowHeight(r, 24);
  sheet.getRange(r, 1, 1, JML_KOL_HARTEK).merge()
       .setValue('PT. HALEYORA POWER')
       .setBackground(bgPutih).setFontColor(fgHitam)
       .setFontWeight('bold').setFontSize(11)
       .setHorizontalAlignment('center').setVerticalAlignment('middle');
  r++;

  // Baris 3: Periode
  sheet.setRowHeight(r, 22);
  sheet.getRange(r, 1, 1, JML_KOL_HARTEK).merge()
       .setValue('PERIODE PEMBAYARAN')
       .setBackground(bgPutih).setFontColor(fgHitam)
       .setFontWeight('bold').setFontSize(10)
       .setHorizontalAlignment('center').setVerticalAlignment('middle');
  r++;

  // Spacer
  sheet.setRowHeight(r, 7);
  sheet.getRange(r, 1, 1, JML_KOL_HARTEK).setBackground('#F5F5F5').merge();
  r++;

  // ── HEADER KOLOM (Format Harrow) ──────────────────────────
  sheet.setRowHeight(r, 42);
  sheet.getRange(r, 1, 1, JML_KOL_HARTEK)
       .setValues([HEADER_HARTEK])
       .setBackground(bgBiruMuda).setFontColor(fgHitam)
       .setFontWeight('bold').setFontSize(10)
       .setHorizontalAlignment('center').setVerticalAlignment('middle')
       .setWrap(true)
       .setBorder(true,true,true,true,true,true,'#000000',SpreadsheetApp.BorderStyle.SOLID);
  r++;

  // ── BARIS DATA KOSONG (placeholder) ────────────────────────
  for (var i = 0; i < 5; i++) {
    sheet.setRowHeight(r, 20);
    sheet.getRange(r, 1, 1, JML_KOL_HARTEK)
         .setBackground(bgPutih)
         .setBorder(true,true,true,true,true,true,'#D9D9D9',SpreadsheetApp.BorderStyle.SOLID);
    r++;
  }

  sheet.setFrozenRows(5); // Freeze sampai header kolom

  ui.alert('✅ Template "' + SHEET_HARTEK + '" Berhasil Dibuat!\nFormat: sama persis dengan Harrow');
}

// ── GENERATE HARTEK ─────────────────────────────────────────
function generateHartek() {
  var filter = getFilterAktif();
  if (!filter) {
    if (SpreadsheetApp.getUi().alert('⚠️ Tampilkan SEMUA data HARTEK?', SpreadsheetApp.getUi().ButtonSet.OK_CANCEL) === SpreadsheetApp.getUi().Button.CANCEL) return;
  }
  _prosesDataHartek();
  var f = getFilterAktif();
  SpreadsheetApp.getUi().alert(f ? '✅ Generate HARTEK Selesai!\nPeriode: ' + NAMA_BULAN[f.bulan-1] + ' ' + f.tahun : '✅ Generate HARTEK Selesai!');
}

// ── PROSES DATA HARTEK ──────────────────────────────────────
function _prosesDataHartek() {
  var raw = ambilDataSumber(); if (!raw) return;
  var filtered = filterDataByBulan(raw);
  var filter   = getFilterAktif();

  if (filter && filtered.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ Tidak ada data HARTEK untuk periode ini!');
    return;
  }

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_HARTEK);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ Sheet "' + SHEET_HARTEK + '" tidak ditemukan!\nBuat template dulu via menu.');
    return;
  }

  // ── Cari baris header kolom ────────────────────────────────
  var allData    = sheet.getDataRange().getValues();
  var headerRow  = -1;
  for (var i = 0; i < allData.length; i++) {
    if (String(allData[i][0] || '').toUpperCase().trim() === 'NO' &&
        String(allData[i][1] || '').toUpperCase().trim() === 'TANGGAL') {
      headerRow = i + 1; // 1-indexed
      break;
    }
  }
  if (headerRow === -1) {
    SpreadsheetApp.getUi().alert('❌ Header kolom tidak ditemukan!\nPastikan template sudah dibuat.');
    return;
  }

  // ── Hapus data lama di bawah header ────────────────────────
  var lastRow = sheet.getLastRow();
  if (lastRow > headerRow) {
    sheet.deleteRows(headerRow + 1, lastRow - headerRow);
  }

  // ── Update periode di judul ────────────────────────────────
  if (filter) {
    var periodeText = 'PERIODE: ' + NAMA_BULAN[filter.bulan - 1] + ' ' + filter.tahun;
    sheet.getRange(3, 1).setValue(periodeText);
  }

  // ── Sortir data berdasarkan tanggal ────────────────────────
  filtered.sort(function(a, b) {
    return new Date(a[COL.TGL_LEMBUR]) - new Date(b[COL.TGL_LEMBUR]);
  });

  var tz = Session.getScriptTimeZone();
  var startRow = headerRow + 1;

  // ── Tulis data per baris (format Harrow) ───────────────────
  for (var d = 0; d < filtered.length; d++) {
    var item = filtered[d];
    var tgl  = item[COL.TGL_LEMBUR];
    var tglStr = (tgl instanceof Date)
      ? Utilities.formatDate(tgl, tz, 'yyyy-MM-dd')
      : String(tgl || '');

    // Ambil nama petugas
    var petugas = String(item[COL.NAMA] || '').trim();
    var penempatan = String(item[COL.PENEMPATAN] || '').trim();
    if (penempatan) petugas = petugas + ' ' + penempatan;

    // Kegiatan = KET_LEMBUR (deskripsi kegiatan)
    var kegiatan = String(item[COL.KET_LEMBUR] || '').trim();

    // Material = KETERANGAN
    var material = String(item[COL.KETERANGAN] || '').trim();

    // PLN & ES — cek dari data
    var pln = '✔';
    var es  = '';

    // Foto — sesuai format Harrow (3 kolom foto)
    var fotoSebelum      = String(item[COL.EVIDEN_FOTO1] || '').trim();
    var fotoPelaksanaan  = String(item[COL.EVIDEN_FOTO2] || '').trim();
    var fotoSesudah      = ''; // Kolom ke-3 foto (jika ada di sumber)

    // Insert baris baru
    sheet.insertRowBefore(startRow + d);
    sheet.setRowHeight(startRow + d, 80);

    // Tulis data
    sheet.getRange(startRow + d, 1, 1, JML_KOL_HARTEK).setValues([[
      d + 1,           // NO
      tglStr,          // TANGGAL
      '',              // NO WO
      petugas,         // PETUGAS
      kegiatan,        // KEGIATAN
      material,        // MATERIAL
      pln,             // PLN
      es,              // ES
      fotoSebelum,     // FOTO SEBELUM
      fotoPelaksanaan, // FOTO PELAKSANAAN
      fotoSesudah      // FOTO SESUDAH
    ]]);

    // ── Format baris data ────────────────────────────────────
    var rng = sheet.getRange(startRow + d, 1, 1, JML_KOL_HARTEK);
    rng.setVerticalAlignment('top')
       .setWrap(true)
       .setFontSize(9)
       .setFontColor('#000000')
       .setBackground('#FFFFFF')
       .setBorder(true,true,true,true,true,true,'#000000',SpreadsheetApp.BorderStyle.SOLID);

    // Alignment per kolom (sesuai Harrow)
    sheet.getRange(startRow + d, 1).setHorizontalAlignment('center'); // NO
    sheet.getRange(startRow + d, 2).setHorizontalAlignment('center'); // TANGGAL
    sheet.getRange(startRow + d, 3).setHorizontalAlignment('center'); // NO WO
    sheet.getRange(startRow + d, 7).setHorizontalAlignment('center'); // PLN
    sheet.getRange(startRow + d, 8).setHorizontalAlignment('center'); // ES
  }

  // ── Jika tidak ada data ────────────────────────────────────
  if (filtered.length === 0) {
    sheet.insertRowBefore(startRow);
    sheet.setRowHeight(startRow, 24);
    sheet.getRange(startRow, 1, 1, JML_KOL_HARTEK).merge()
         .setValue('TIDAK ADA DATA')
         .setFontStyle('italic').setFontColor('#9E9E9E')
         .setHorizontalAlignment('center');
  }
}

function debugLengkap() { /* Debug Helper (Disembunyikan kodenya agar ringkas, tidak diubah fungsionalitasnya) */ }
