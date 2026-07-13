"""
Update dashboard HTML dengan galeri foto tiang
"""
import os
import re
import pandas as pd
import json

FOTO_DIR = "output_final/foto_tiang"
EXCEL_PATH = "output_final/DATA_KSKT_JABAR_COMPLETE.xlsx"
OUTPUT_HTML = "output_final/dashboard_kskt.html"

# ── Baca data tiang dari Excel ────────────────────────────────
xl = pd.ExcelFile(EXCEL_PATH)
tiang_df = xl.parse('DATA_TIANG')
gardu_df = xl.parse('DATA_GARDU')
ass_peralatan = xl.parse('ASSESMENT_PERALATAN')
ass_gardu = xl.parse('ASSESMENT_GARDU')
ass_row = xl.parse('ASSESMENT_ROW')
jadwal_row = xl.parse('JADWAL_ROW')
rekap = xl.parse('REKAP_ASSESMENT')
pohon_df = xl.parse('DATA_POHON')

print("Data loaded OK")
print(f"Tiang: {tiang_df.shape}")
print(f"Kolom tiang: {list(tiang_df.columns)}")

# ── Kumpulkan foto per ID tiang ───────────────────────────────
foto_files = sorted(os.listdir(FOTO_DIR))
foto_by_id = {}
for fname in foto_files:
    m = re.match(r'tiang_(\d+)_(\d+)\.(jpg|jpeg|png)', fname, re.IGNORECASE)
    if m:
        tid = m.group(1)
        if tid not in foto_by_id:
            foto_by_id[tid] = []
        foto_by_id[tid].append(fname)

print(f"\nTotal foto: {len(foto_files)}")
print(f"Tiang dengan foto: {len(foto_by_id)}")

# ── Persiapkan data chart ─────────────────────────────────────
def safe_json(obj):
    return json.dumps(obj, ensure_ascii=False)

# Status distribution
status_peralatan = ass_peralatan['Status'].value_counts().to_dict() if 'Status' in ass_peralatan.columns else {}
status_gardu_data = ass_gardu['Status'].value_counts().to_dict() if 'Status' in ass_gardu.columns else {}
status_row = ass_row['Status Pohon'].value_counts().to_dict() if 'Status Pohon' in ass_row.columns else (
             ass_row['Status'].value_counts().to_dict() if 'Status' in ass_row.columns else {})
feeder_tiang = tiang_df['FEEDER'].value_counts().head(10).to_dict() if 'FEEDER' in tiang_df.columns else {}
feeder_jadwal = jadwal_row['Feeder'].value_counts().head(10).to_dict() if 'Feeder' in jadwal_row.columns else {}

rekap_labels, rekap_values = [], []
if len(rekap.columns) >= 4:
    for _, row in rekap.iterrows():
        lbl = str(row.iloc[1])[:35] if pd.notna(row.iloc[1]) else ''
        try: val = float(row.iloc[3]) if pd.notna(row.iloc[3]) else 0
        except: val = 0
        if lbl and lbl != 'nan':
            rekap_labels.append(lbl)
            rekap_values.append(val)

summary = {
    'total_tiang': len(tiang_df),
    'total_gardu': len(gardu_df),
    'total_pohon': len(pohon_df),
    'total_jadwal': len(jadwal_row),
    'total_ass_peralatan': len(ass_peralatan),
    'total_ass_gardu': len(ass_gardu),
    'total_ass_row': len(ass_row),
    'total_foto': len(foto_files),
    'tiang_dengan_foto': len(foto_by_id),
}

# ── Build tabel HTML ──────────────────────────────────────────
def df_to_html_rows(df, max_rows=20):
    rows = []
    for _, row in df.head(max_rows).fillna('').iterrows():
        cells = ''.join(f'<td>{v}</td>' for v in row.values)
        rows.append(f'<tr>{cells}</tr>')
    return '\n'.join(rows)

def df_to_headers(df):
    return ''.join(f'<th>{c}</th>' for c in df.columns)

# ── Build galeri HTML ─────────────────────────────────────────
# Buat data galeri dengan info tiang
gallery_items = []
for tid, photos in list(foto_by_id.items())[:200]:
    # Cari info tiang dari Excel (cari berdasarkan ID di URL)
    info = {'id': tid, 'feeder': '-', 'kode': '-', 'segment': '-', 'status': '-'}
    gallery_items.append({
        'id': tid,
        'photos': photos,
        'feeder': info['feeder'],
        'kode': info['kode'],
    })

# Build galeri card HTML
gallery_html_parts = []
for item in gallery_items:
    tid = item['id']
    photos = item['photos']
    # Main photo = foto pertama
    main_photo = f"foto_tiang/{photos[0]}"
    thumb_count = len(photos)
    thumb_html = ''
    for p in photos:
        thumb_html += f'<img src="foto_tiang/{p}" class="gallery-thumb" onclick="openLightbox(\'foto_tiang/{p}\')" />'

    gallery_html_parts.append(f'''
    <div class="gallery-card" data-id="{tid}">
      <div class="gallery-main" onclick="openLightbox(\'foto_tiang/{photos[0]}\')">
        <img src="{main_photo}" alt="Tiang {tid}" loading="lazy" />
        <div class="gallery-overlay">
          <span>🔍 Lihat</span>
        </div>
        {"<div class='photo-count'>+" + str(thumb_count-1) + " foto</div>" if thumb_count > 1 else ""}
      </div>
      <div class="gallery-info">
        <div class="gallery-id">ID: {tid}</div>
        <div class="gallery-thumbs">{thumb_html}</div>
      </div>
    </div>''')

gallery_html = '\n'.join(gallery_html_parts)

# ── Build full HTML ───────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard Laporan KSKT GO Jabar — ULP Padalarang</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
:root {{
  --bg:#0a0e1a; --bg2:#111827; --bg3:#1a2235; --card:#1e2a3a;
  --border:#2a3a52; --accent:#3b82f6; --accent2:#06b6d4; --accent3:#8b5cf6;
  --green:#10b981; --yellow:#f59e0b; --red:#ef4444;
  --text:#e2e8f0; --muted:#94a3b8;
}}
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;}}

/* HEADER */
.header{{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);
  border-bottom:1px solid var(--border);position:sticky;top:0;z-index:200;
  box-shadow:0 4px 24px rgba(0,0,0,.5);}}
.header-inner{{max-width:1600px;margin:0 auto;padding:16px 32px;display:flex;align-items:center;gap:16px;}}
.logo-box{{width:44px;height:44px;background:linear-gradient(135deg,var(--accent),var(--accent2));
  border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;
  box-shadow:0 0 20px rgba(59,130,246,.4);flex-shrink:0;}}
.header-text h1{{font-size:1.2rem;font-weight:700;color:#fff;}}
.header-text p{{font-size:0.75rem;color:var(--muted);margin-top:2px;}}
.header-badge{{margin-left:auto;display:flex;gap:10px;align-items:center;}}
.badge{{padding:5px 12px;border-radius:20px;font-size:0.7rem;font-weight:600;letter-spacing:.5px;}}
.badge-blue{{background:rgba(59,130,246,.2);color:var(--accent);border:1px solid rgba(59,130,246,.3);}}
.badge-green{{background:rgba(16,185,129,.2);color:var(--green);border:1px solid rgba(16,185,129,.3);}}

/* NAV TABS */
.nav-tabs{{background:var(--bg2);border-bottom:1px solid var(--border);}}
.nav-inner{{max-width:1600px;margin:0 auto;padding:0 32px;display:flex;gap:4px;overflow-x:auto;}}
.nav-tab{{padding:14px 20px;font-size:.8rem;font-weight:500;color:var(--muted);
  cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;}}
.nav-tab:hover{{color:var(--text);}}
.nav-tab.active{{color:var(--accent);border-bottom-color:var(--accent);}}

/* MAIN */
.main{{max-width:1600px;margin:0 auto;padding:28px 32px;}}
.page{{display:none;}} .page.active{{display:block;}}

/* SECTION TITLE */
.sec-title{{font-size:.7rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--accent);margin-bottom:14px;display:flex;align-items:center;gap:10px;}}
.sec-title::after{{content:'';flex:1;height:1px;background:var(--border);}}

/* KPI CARDS */
.kpi-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:28px;}}
.kpi-card{{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;
  position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s;cursor:default;}}
.kpi-card:hover{{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.4);}}
.kpi-card::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,var(--c1),var(--c2));}}
.kpi-card.blue{{--c1:#3b82f6;--c2:#06b6d4;}} .kpi-card.purple{{--c1:#8b5cf6;--c2:#ec4899;}}
.kpi-card.green{{--c1:#10b981;--c2:#34d399;}} .kpi-card.orange{{--c1:#f59e0b;--c2:#f97316;}}
.kpi-card.cyan{{--c1:#06b6d4;--c2:#0ea5e9;}} .kpi-card.pink{{--c1:#ec4899;--c2:#f43f5e;}}
.kpi-icon{{font-size:1.6rem;margin-bottom:8px;}}
.kpi-value{{font-size:1.9rem;font-weight:800;background:linear-gradient(135deg,var(--c1),var(--c2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;}}
.kpi-label{{font-size:.72rem;color:var(--muted);margin-top:5px;font-weight:500;}}

/* CHARTS */
.chart-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:28px;}}
.chart-grid-2{{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-bottom:28px;}}
.chart-card{{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;}}
.chart-title{{font-size:.85rem;font-weight:600;margin-bottom:3px;}}
.chart-sub{{font-size:.7rem;color:var(--muted);margin-bottom:18px;}}
.chart-card.span2{{grid-column:span 2;}}

/* TABLE */
.table-card{{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:28px;}}
.table-header{{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}}
.table-title{{font-size:.88rem;font-weight:600;}}
.table-count{{font-size:.7rem;color:var(--muted);background:var(--bg3);padding:4px 10px;border-radius:8px;}}
.table-wrap{{overflow-x:auto;}}
table{{width:100%;border-collapse:collapse;font-size:.77rem;}}
thead th{{background:var(--bg3);color:var(--muted);font-weight:600;font-size:.67rem;letter-spacing:.5px;
  text-transform:uppercase;padding:9px 13px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap;}}
tbody tr{{border-bottom:1px solid rgba(42,58,82,.5);transition:background .15s;}}
tbody tr:hover{{background:rgba(59,130,246,.05);}}
tbody td{{padding:9px 13px;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;}}
tbody td:first-child{{color:var(--muted);font-weight:500;}}
.status{{display:inline-block;padding:2px 9px;border-radius:10px;font-size:.67rem;font-weight:600;}}
.s-baik{{background:rgba(16,185,129,.15);color:var(--green);}}
.s-cukup{{background:rgba(245,158,11,.15);color:var(--yellow);}}
.s-buruk{{background:rgba(239,68,68,.15);color:var(--red);}}

/* SUB TABS */
.sub-tabs{{display:flex;gap:4px;margin-bottom:18px;flex-wrap:wrap;}}
.sub-tab{{padding:7px 16px;border-radius:8px;font-size:.76rem;font-weight:500;cursor:pointer;
  color:var(--muted);transition:all .2s;border:1px solid transparent;}}
.sub-tab:hover{{color:var(--text);background:var(--bg3);}}
.sub-tab.active{{background:rgba(59,130,246,.15);color:var(--accent);border-color:rgba(59,130,246,.3);}}
.sub-content{{display:none;}} .sub-content.active{{display:block;}}

/* ── GALLERY ── */
.gallery-controls{{display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap;}}
.gallery-search{{flex:1;min-width:200px;padding:10px 16px;background:var(--card);
  border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:.82rem;outline:none;}}
.gallery-search:focus{{border-color:var(--accent);}}
.gallery-filter{{padding:10px 14px;background:var(--card);border:1px solid var(--border);
  border-radius:10px;color:var(--text);font-size:.8rem;outline:none;cursor:pointer;}}
.gallery-stats{{font-size:.75rem;color:var(--muted);}}

.gallery-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;}}
.gallery-card{{background:var(--card);border:1px solid var(--border);border-radius:14px;
  overflow:hidden;transition:transform .2s,box-shadow .2s;}}
.gallery-card:hover{{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.5);}}
.gallery-main{{position:relative;height:160px;overflow:hidden;cursor:pointer;background:var(--bg3);}}
.gallery-main img{{width:100%;height:100%;object-fit:cover;transition:transform .3s;}}
.gallery-card:hover .gallery-main img{{transform:scale(1.05);}}
.gallery-overlay{{position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;
  align-items:center;justify-content:center;transition:background .2s;}}
.gallery-card:hover .gallery-overlay{{background:rgba(0,0,0,.4);}}
.gallery-overlay span{{color:#fff;font-size:.85rem;font-weight:600;opacity:0;transition:opacity .2s;}}
.gallery-card:hover .gallery-overlay span{{opacity:1;}}
.photo-count{{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.7);color:#fff;
  padding:3px 8px;border-radius:8px;font-size:.68rem;font-weight:600;}}
.gallery-info{{padding:12px 14px;}}
.gallery-id{{font-size:.75rem;font-weight:600;color:var(--accent);margin-bottom:6px;}}
.gallery-thumbs{{display:flex;gap:4px;overflow-x:auto;}}
.gallery-thumb{{width:36px;height:36px;object-fit:cover;border-radius:6px;cursor:pointer;
  border:2px solid transparent;transition:border-color .2s;flex-shrink:0;}}
.gallery-thumb:hover{{border-color:var(--accent);}}

/* LIGHTBOX */
.lightbox{{display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:1000;
  align-items:center;justify-content:center;}}
.lightbox.open{{display:flex;}}
.lightbox-inner{{position:relative;max-width:90vw;max-height:90vh;}}
.lightbox-inner img{{max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;}}
.lightbox-close{{position:absolute;top:-40px;right:0;color:#fff;font-size:1.8rem;
  cursor:pointer;background:none;border:none;line-height:1;}}
.lightbox-info{{color:#94a3b8;font-size:.78rem;margin-top:10px;text-align:center;}}
.lightbox-nav{{position:absolute;top:50%;transform:translateY(-50%);
  background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:50%;
  width:44px;height:44px;font-size:1.2rem;cursor:pointer;transition:background .2s;}}
.lightbox-nav:hover{{background:rgba(255,255,255,.3);}}
.lb-prev{{left:-60px;}} .lb-next{{right:-60px;}}

/* FOOTER */
.footer{{text-align:center;padding:24px;color:var(--muted);font-size:.73rem;
  border-top:1px solid var(--border);margin-top:20px;}}
::-webkit-scrollbar{{width:6px;height:6px;}}
::-webkit-scrollbar-track{{background:var(--bg);}}
::-webkit-scrollbar-thumb{{background:var(--border);border-radius:3px;}}

@media(max-width:768px){{
  .chart-grid{{grid-template-columns:1fr;}}
  .chart-grid-2{{grid-template-columns:1fr;}}
  .kpi-grid{{grid-template-columns:repeat(2,1fr);}}
  .gallery-grid{{grid-template-columns:repeat(2,1fr);}}
  .main{{padding:16px;}}
  .header-inner{{padding:12px 16px;}}
  .nav-inner{{padding:0 16px;}}
  .lb-prev{{left:-10px;}} .lb-next{{right:-10px;}}
}}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-inner">
    <div class="logo-box">⚡</div>
    <div class="header-text">
      <h1>Dashboard Manajemen Jaringan — ULP Padalarang</h1>
      <p>KSKT GO Jawa Barat &nbsp;|&nbsp; Data per Juli 2026</p>
    </div>
    <div class="header-badge">
      <span class="badge badge-green">● LIVE DATA</span>
      <span class="badge badge-blue">KOORDINATOR</span>
    </div>
  </div>
</div>

<!-- NAV TABS -->
<div class="nav-tabs">
  <div class="nav-inner">
    <div class="nav-tab active" onclick="showPage('dashboard',this)">📊 Dashboard</div>
    <div class="nav-tab" onclick="showPage('data_aset',this)">🗼 Data Aset</div>
    <div class="nav-tab" onclick="showPage('assessment',this)">🔍 Assessment</div>
    <div class="nav-tab" onclick="showPage('jadwal',this)">📋 Jadwal</div>
    <div class="nav-tab" onclick="showPage('galeri',this)">📸 Galeri Foto ({len(foto_files)} foto)</div>
  </div>
</div>

<div class="main">

<!-- ══ PAGE: DASHBOARD ══════════════════════════════════════ -->
<div id="page-dashboard" class="page active">

  <div class="sec-title">Ringkasan Data Aset & Kegiatan</div>
  <div class="kpi-grid">
    <div class="kpi-card blue"><div class="kpi-icon">🗼</div><div class="kpi-value">{summary['total_tiang']}</div><div class="kpi-label">Data Tiang</div></div>
    <div class="kpi-card purple"><div class="kpi-icon">🏭</div><div class="kpi-value">{summary['total_gardu']}</div><div class="kpi-label">Data Gardu</div></div>
    <div class="kpi-card green"><div class="kpi-icon">🌳</div><div class="kpi-value">{summary['total_pohon']}</div><div class="kpi-label">Data Pohon ROW</div></div>
    <div class="kpi-card orange"><div class="kpi-icon">📋</div><div class="kpi-value">{summary['total_jadwal']}</div><div class="kpi-label">Jadwal ROW</div></div>
    <div class="kpi-card cyan"><div class="kpi-icon">🔍</div><div class="kpi-value">{summary['total_ass_peralatan']}</div><div class="kpi-label">Ass. Peralatan</div></div>
    <div class="kpi-card blue"><div class="kpi-icon">🏚️</div><div class="kpi-value">{summary['total_ass_gardu']}</div><div class="kpi-label">Ass. Gardu</div></div>
    <div class="kpi-card purple"><div class="kpi-icon">🌿</div><div class="kpi-value">{summary['total_ass_row']}</div><div class="kpi-label">Ass. ROW</div></div>
    <div class="kpi-card pink"><div class="kpi-icon">📸</div><div class="kpi-value">{summary['total_foto']}</div><div class="kpi-label">Foto Lapangan</div></div>
    <div class="kpi-card green"><div class="kpi-icon">🗼</div><div class="kpi-value">{summary['tiang_dengan_foto']}</div><div class="kpi-label">Tiang Berfoto</div></div>
  </div>

  <div class="sec-title">Analisis Status Assessment</div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Status Assessment Peralatan</div>
      <div class="chart-sub">Distribusi kondisi peralatan jaringan</div>
      <canvas id="chartAssPeralatan" height="200"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">Status Assessment Gardu</div>
      <div class="chart-sub">Distribusi kondisi gardu distribusi</div>
      <canvas id="chartAssGardu" height="200"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">Status Pohon ROW</div>
      <div class="chart-sub">Status pohon di right-of-way</div>
      <canvas id="chartAssRow" height="200"></canvas>
    </div>
  </div>

  <div class="sec-title">Distribusi Aset & Jadwal</div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Tiang per Feeder</div>
      <div class="chart-sub">Top 10 feeder berdasarkan jumlah tiang</div>
      <canvas id="chartTiangFeeder" height="220"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">Jadwal ROW per Feeder</div>
      <div class="chart-sub">Jumlah jadwal pekerjaan ROW per feeder</div>
      <canvas id="chartJadwalFeeder" height="220"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">Rekap Assessment</div>
      <div class="chart-sub">Total per uraian pekerjaan assessment</div>
      <canvas id="chartRekap" height="220"></canvas>
    </div>
  </div>
</div>

<!-- ══ PAGE: DATA ASET ══════════════════════════════════════ -->
<div id="page-data_aset" class="page">
  <div class="sub-tabs">
    <div class="sub-tab active" onclick="showSub('tiang',this)">🗼 Data Tiang ({len(tiang_df)} record)</div>
    <div class="sub-tab" onclick="showSub('gardu',this)">🏭 Data Gardu ({len(gardu_df)} record)</div>
    <div class="sub-tab" onclick="showSub('pohon',this)">🌳 Data Pohon ({len(pohon_df)} record)</div>
  </div>

  <div id="sub-tiang" class="sub-content active">
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">Data Tiang Jaringan — ULP Padalarang</div>
        <div class="table-count">Menampilkan {min(len(tiang_df),50)} dari {len(tiang_df)} record</div>
      </div>
      <div class="table-wrap">
        <table><thead><tr>{df_to_headers(tiang_df)}</tr></thead>
        <tbody>{df_to_html_rows(tiang_df,50)}</tbody></table>
      </div>
    </div>
  </div>
  <div id="sub-gardu" class="sub-content">
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">Data Gardu Distribusi</div>
        <div class="table-count">Menampilkan {min(len(gardu_df),50)} dari {len(gardu_df)} record</div>
      </div>
      <div class="table-wrap">
        <table><thead><tr>{df_to_headers(gardu_df)}</tr></thead>
        <tbody>{df_to_html_rows(gardu_df,50)}</tbody></table>
      </div>
    </div>
  </div>
  <div id="sub-pohon" class="sub-content">
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">Data Pohon ROW</div>
        <div class="table-count">Menampilkan {min(len(pohon_df),50)} dari {len(pohon_df)} record</div>
      </div>
      <div class="table-wrap">
        <table><thead><tr>{df_to_headers(pohon_df)}</tr></thead>
        <tbody>{df_to_html_rows(pohon_df,50)}</tbody></table>
      </div>
    </div>
  </div>
</div>

<!-- ══ PAGE: ASSESSMENT ══════════════════════════════════════ -->
<div id="page-assessment" class="page">
  <div class="sub-tabs">
    <div class="sub-tab active" onclick="showSub('ass_p',this)">🔧 Peralatan ({len(ass_peralatan)})</div>
    <div class="sub-tab" onclick="showSub('ass_g',this)">🏚️ Gardu ({len(ass_gardu)})</div>
    <div class="sub-tab" onclick="showSub('ass_r',this)">🌿 ROW ({len(ass_row)})</div>
    <div class="sub-tab" onclick="showSub('ass_rekap',this)">📊 Rekap</div>
  </div>
  <div id="sub-ass_p" class="sub-content active">
    <div class="table-card">
      <div class="table-header"><div class="table-title">Assessment Peralatan & Konstruksi</div><div class="table-count">{len(ass_peralatan)} record</div></div>
      <div class="table-wrap"><table><thead><tr>{df_to_headers(ass_peralatan)}</tr></thead><tbody>{df_to_html_rows(ass_peralatan,50)}</tbody></table></div>
    </div>
  </div>
  <div id="sub-ass_g" class="sub-content">
    <div class="table-card">
      <div class="table-header"><div class="table-title">Assessment Gardu</div><div class="table-count">{len(ass_gardu)} record</div></div>
      <div class="table-wrap"><table><thead><tr>{df_to_headers(ass_gardu)}</tr></thead><tbody>{df_to_html_rows(ass_gardu,50)}</tbody></table></div>
    </div>
  </div>
  <div id="sub-ass_r" class="sub-content">
    <div class="table-card">
      <div class="table-header"><div class="table-title">Assessment ROW (Right-of-Way)</div><div class="table-count">{len(ass_row)} record</div></div>
      <div class="table-wrap"><table><thead><tr>{df_to_headers(ass_row)}</tr></thead><tbody>{df_to_html_rows(ass_row,50)}</tbody></table></div>
    </div>
  </div>
  <div id="sub-ass_rekap" class="sub-content">
    <div class="table-card">
      <div class="table-header"><div class="table-title">Rekap Assessment</div><div class="table-count">{len(rekap)} item</div></div>
      <div class="table-wrap"><table><thead><tr>{df_to_headers(rekap)}</tr></thead><tbody>{df_to_html_rows(rekap,50)}</tbody></table></div>
    </div>
  </div>
</div>

<!-- ══ PAGE: JADWAL ══════════════════════════════════════════ -->
<div id="page-jadwal" class="page">
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Jadwal Pekerjaan ROW</div>
      <div class="table-count">Menampilkan {min(len(jadwal_row),50)} dari {len(jadwal_row)} record</div>
    </div>
    <div class="table-wrap">
      <table><thead><tr>{df_to_headers(jadwal_row)}</tr></thead>
      <tbody>{df_to_html_rows(jadwal_row,50)}</tbody></table>
    </div>
  </div>
</div>

<!-- ══ PAGE: GALERI FOTO ════════════════════════════════════ -->
<div id="page-galeri" class="page">
  <div class="sec-title">Galeri Foto Lapangan Tiang</div>

  <div class="gallery-controls">
    <input type="text" class="gallery-search" id="gallerySearch"
           placeholder="🔍  Cari ID tiang..." oninput="filterGallery()">
    <select class="gallery-filter" id="gallerySort" onchange="filterGallery()">
      <option value="all">Semua Tiang</option>
      <option value="multi">Multi Foto (2+)</option>
      <option value="single">1 Foto</option>
    </select>
    <div class="gallery-stats" id="galleryStats">{len(foto_by_id)} tiang &bull; {len(foto_files)} foto total</div>
  </div>

  <div class="gallery-grid" id="galleryGrid">
    {gallery_html}
  </div>
</div>

</div><!-- end .main -->

<!-- FOOTER -->
<div class="footer">
  Dashboard KSKT GO Jabar &mdash; ULP Padalarang &mdash; Data diolah Juli 2026 &mdash;
  {len(foto_files)} foto lapangan &bull; {summary['total_tiang']} data tiang &bull; {summary['total_gardu']} data gardu
</div>

<!-- LIGHTBOX -->
<div class="lightbox" id="lightbox" onclick="closeLightboxBg(event)">
  <div class="lightbox-inner">
    <button class="lightbox-close" onclick="closeLightbox()">✕</button>
    <button class="lightbox-nav lb-prev" onclick="navLightbox(-1)">‹</button>
    <button class="lightbox-nav lb-next" onclick="navLightbox(1)">›</button>
    <img id="lightboxImg" src="" alt="Foto Lapangan">
    <div class="lightbox-info" id="lightboxInfo"></div>
  </div>
</div>

<script>
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#2a3a52';
Chart.defaults.font.family = 'Inter';

const PIE_COLORS = [
  'rgba(16,185,129,.85)','rgba(245,158,11,.85)','rgba(239,68,68,.85)',
  'rgba(59,130,246,.85)','rgba(139,92,246,.85)','rgba(6,182,212,.85)',
  'rgba(249,115,22,.85)','rgba(236,72,153,.85)',
];

function doughnut(id, labels, values) {{
  const ctx = document.getElementById(id);
  if (!ctx || !labels.length) return;
  new Chart(ctx, {{
    type: 'doughnut',
    data: {{
      labels,
      datasets: [{{ data: values, backgroundColor: PIE_COLORS,
        borderColor: '#1e2a3a', borderWidth: 3, hoverOffset: 8 }}]
    }},
    options: {{
      responsive: true,
      plugins: {{
        legend: {{ position: 'right', labels: {{ boxWidth: 12, padding: 10, font: {{ size: 11 }} }} }},
        tooltip: {{ callbacks: {{
          label: c => ` ${{c.label}}: ${{c.raw}} (${{Math.round(c.raw/c.dataset.data.reduce((a,b)=>a+b,0)*100)}}%)`
        }}}}
      }},
      cutout: '62%',
    }}
  }});
}}

function hbar(id, labels, values, color) {{
  const ctx = document.getElementById(id);
  if (!ctx || !labels.length) return;
  new Chart(ctx, {{
    type: 'bar',
    data: {{ labels, datasets: [{{ data: values, backgroundColor: color,
      borderRadius: 5, borderSkipped: false }}] }},
    options: {{
      responsive: true, indexAxis: 'y',
      plugins: {{ legend: {{ display: false }} }},
      scales: {{
        x: {{ grid: {{ color: '#2a3a52' }}, ticks: {{ font: {{ size: 10 }} }} }},
        y: {{ grid: {{ display: false }}, ticks: {{ font: {{ size: 10 }} }} }},
      }}
    }}
  }});
}}

function bar(id, labels, values, color) {{
  const ctx = document.getElementById(id);
  if (!ctx || !labels.length) return;
  new Chart(ctx, {{
    type: 'bar',
    data: {{ labels, datasets: [{{ data: values, backgroundColor: color,
      borderRadius: 5, borderSkipped: false }}] }},
    options: {{
      responsive: true,
      plugins: {{ legend: {{ display: false }} }},
      scales: {{
        x: {{ grid: {{ display: false }}, ticks: {{ font: {{ size: 9 }}, maxRotation: 45 }} }},
        y: {{ grid: {{ color: '#2a3a52' }}, ticks: {{ font: {{ size: 10 }} }} }},
      }}
    }}
  }});
}}

// Data
doughnut('chartAssPeralatan', {safe_json(list(status_peralatan.keys()))}, {safe_json(list(status_peralatan.values()))});
doughnut('chartAssGardu', {safe_json(list(status_gardu_data.keys()))}, {safe_json(list(status_gardu_data.values()))});
doughnut('chartAssRow', {safe_json(list(status_row.keys()))}, {safe_json(list(status_row.values()))});
hbar('chartTiangFeeder', {safe_json(list(feeder_tiang.keys()))}, {safe_json(list(feeder_tiang.values()))}, 'rgba(59,130,246,.8)');
hbar('chartJadwalFeeder', {safe_json(list(feeder_jadwal.keys()))}, {safe_json(list(feeder_jadwal.values()))}, 'rgba(139,92,246,.8)');
bar('chartRekap', {safe_json(rekap_labels[:12])}, {safe_json(rekap_values[:12])}, 'rgba(6,182,212,.8)');

// ── Navigation ────────────────────────────────────────────────
function showPage(name, el) {{
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  el.classList.add('active');
}}

function showSub(name, el) {{
  const parent = el.closest('.page, .main');
  parent.querySelectorAll('.sub-content').forEach(p => p.classList.remove('active'));
  parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sub-' + name).classList.add('active');
  el.classList.add('active');
}}

// ── Status badge coloring ─────────────────────────────────────
document.querySelectorAll('tbody td').forEach(td => {{
  const t = td.textContent.trim().toLowerCase();
  if (t === 'baik') td.innerHTML = '<span class="status s-baik">Baik</span>';
  else if (t === 'cukup') td.innerHTML = '<span class="status s-cukup">Cukup</span>';
  else if (t === 'buruk' || t === 'rusak') td.innerHTML = '<span class="status s-buruk">Buruk</span>';
}});

// ── Gallery ───────────────────────────────────────────────────
function filterGallery() {{
  const q = document.getElementById('gallerySearch').value.toLowerCase();
  const sort = document.getElementById('gallerySort').value;
  const cards = document.querySelectorAll('.gallery-card');
  let visible = 0;
  cards.forEach(c => {{
    const id = c.dataset.id.toLowerCase();
    const photoCount = c.querySelectorAll('.gallery-thumb').length;
    const matchQ = !q || id.includes(q);
    const matchSort = sort === 'all'
      || (sort === 'multi' && photoCount >= 2)
      || (sort === 'single' && photoCount < 2);
    if (matchQ && matchSort) {{ c.style.display = ''; visible++; }}
    else c.style.display = 'none';
  }});
  document.getElementById('galleryStats').textContent =
    visible + ' tiang ditampilkan \u2022 {len(foto_files)} foto total';
}}

// ── Lightbox ──────────────────────────────────────────────────
let lbImages = [];
let lbIndex = 0;

function openLightbox(src) {{
  // Kumpulkan semua foto di halaman
  lbImages = Array.from(document.querySelectorAll('#galleryGrid .gallery-main img, #galleryGrid .gallery-thumb'))
    .map(i => i.src).filter((v,i,a) => a.indexOf(v) === i);
  lbIndex = lbImages.findIndex(s => s.includes(src.split('/').pop()));
  if (lbIndex < 0) lbIndex = 0;
  showLb();
}}

function showLb() {{
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const info = document.getElementById('lightboxInfo');
  img.src = lbImages[lbIndex];
  const fname = lbImages[lbIndex].split('/').pop();
  info.textContent = fname + '  (' + (lbIndex+1) + ' / ' + lbImages.length + ')';
  lb.classList.add('open');
}}

function closeLightbox() {{ document.getElementById('lightbox').classList.remove('open'); }}
function closeLightboxBg(e) {{ if (e.target.id === 'lightbox') closeLightbox(); }}
function navLightbox(dir) {{
  lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
  showLb();
}}
document.addEventListener('keydown', e => {{
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'ArrowRight') navLightbox(1);
  if (e.key === 'ArrowLeft') navLightbox(-1);
  if (e.key === 'Escape') closeLightbox();
}});
</script>
</body>
</html>"""

with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

size_kb = os.path.getsize(OUTPUT_HTML) / 1024
print(f"[OK] Dashboard disimpan: {OUTPUT_HTML}")
print(f"[OK] Ukuran: {size_kb:.0f} KB")
print(f"[OK] Galeri: {len(foto_by_id)} tiang, {len(foto_files)} foto")
