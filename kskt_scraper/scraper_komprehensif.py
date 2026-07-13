"""
KSKT GO JABAR - Scraper Komprehensif FINAL
Semua data diambil dengan benar berdasarkan investigasi.
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import os, re, json, time

OUTPUT_DIR = "output_final"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PENYULANG_LIST = ['All','PGPR','JDL','MWTI','PSL','UCKR','HCKL','WPRB',
                  'YLNG','GCBA','SLCU','LBSR','BTJR','PCS','PCP','PCJ','PTB']
TAHUN_LIST = ['2024', '2025', '2026']
BULAN_LIST = [str(b) for b in range(1, 13)]

# ── LOGIN ──────────────────────────────────────────────────────
session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
r = session.post('https://ksktgojabar.xyz/home/index',
                 data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
                 allow_redirects=True)
print(f"[+] Login -> {r.url}")


def get_soup(url, params=None):
    resp = session.get(url, params=params, timeout=20)
    return BeautifulSoup(resp.text, 'html.parser'), len(resp.text)


def parse_table_by_id(soup, table_id):
    """Ambil tabel berdasarkan ID, return DataFrame"""
    tbl = soup.find('table', id=table_id)
    if not tbl:
        # coba cari tabel pertama di content-wrapper
        cw = soup.find('div', class_='content-wrapper')
        if cw:
            tbl = cw.find('table')
    if not tbl:
        return None

    headers = []
    thead = tbl.find('thead')
    if thead:
        headers = [th.get_text(strip=True) for th in thead.find_all(['th', 'td'])]

    rows = []
    tbody = tbl.find('tbody')
    target = tbody if tbody else tbl
    for tr in target.find_all('tr'):
        cells = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
        if cells and any(c for c in cells):
            rows.append(cells)

    if not rows:
        return None

    try:
        if headers and len(headers) == len(rows[0]):
            df = pd.DataFrame(rows, columns=headers)
        else:
            df = pd.DataFrame(rows)
        # Hapus kolom 'Action' jika ada
        if 'Action' in df.columns:
            df = df.drop(columns=['Action'])
        return df
    except Exception as e:
        print(f"  [!] Parse error: {e}")
        return None


def parse_data_tiang(soup):
    """Parse data tiang yang punya 2500 TD - struktur khusus"""
    cw = soup.find('div', class_='content-wrapper')
    if not cw:
        return None

    # Cari semua table
    tables = cw.find_all('table')
    print(f"  Data tiang tables: {len(tables)}")
    
    all_dfs = []
    for tbl in tables:
        headers = []
        thead = tbl.find('thead')
        if thead:
            headers = [th.get_text(strip=True) for th in thead.find_all(['th', 'td'])]
        
        rows = []
        tbody = tbl.find('tbody')
        target = tbody if tbody else tbl
        for tr in target.find_all('tr'):
            cells = [td.get_text(separator=' ', strip=True) for td in tr.find_all(['td', 'th'])]
            if cells and any(c.strip() for c in cells):
                rows.append(cells)

        if rows:
            try:
                if headers and len(headers) == len(rows[0]):
                    df = pd.DataFrame(rows, columns=headers)
                else:
                    df = pd.DataFrame(rows)
                if 'Action' in df.columns:
                    df = df.drop(columns=['Action'])
                all_dfs.append(df)
                print(f"    Parsed table: {df.shape}")
            except Exception as e:
                print(f"  [!] Error: {e}")
    
    if all_dfs:
        return pd.concat(all_dfs, ignore_index=True)
    return None


all_data = {}  # key -> DataFrame

# ══════════════════════════════════════════════════════════════
# 1. DATA ASET
# ══════════════════════════════════════════════════════════════
print("\n[1/8] DATA TIANG")
soup, sz = get_soup('https://ksktgojabar.xyz/koordinator/datatiang/index')
print(f"  Size: {sz}, TDs: {len(soup.find_all('td'))}")
df = parse_data_tiang(soup)
if df is not None and len(df) > 0:
    all_data['DATA_TIANG'] = df
    print(f"  -> {len(df)} baris x {len(df.columns)} kolom")
    print(f"     Kolom: {list(df.columns[:8])}")
    print(f"     Contoh: {df.iloc[0].tolist()[:5]}")

print("\n[2/8] DATA GARDU")
soup, sz = get_soup('https://ksktgojabar.xyz/koordinator/datagardu/index')
print(f"  Size: {sz}")
df = parse_data_tiang(soup)
if df is not None and len(df) > 0:
    all_data['DATA_GARDU'] = df
    print(f"  -> {len(df)} baris x {len(df.columns)} kolom")

print("\n[3/8] DATA POHON")
soup, sz = get_soup('https://ksktgojabar.xyz/koordinator/datapohon/index')
print(f"  Size: {sz}")
df = parse_data_tiang(soup)
if df is not None and len(df) > 0:
    all_data['DATA_POHON'] = df
    print(f"  -> {len(df)} baris x {len(df.columns)} kolom")

# ══════════════════════════════════════════════════════════════
# 2. ASSESSMENT
# ══════════════════════════════════════════════════════════════
print("\n[4/8] ASSESSMENT")

# Assessment Peralatan
print("  -> Peralatan")
soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/assesment/peralatan')
df = parse_table_by_id(soup, 'example1')
if df is not None:
    all_data['ASSESMENT_PERALATAN'] = df
    print(f"     {len(df)} baris x {len(df.columns)} kolom")

# Assessment Gardu
print("  -> Gardu")
soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/assesment/gardu')
df = parse_table_by_id(soup, 'example1')
if df is not None:
    all_data['ASSESMENT_GARDU'] = df
    print(f"     {len(df)} baris x {len(df.columns)} kolom")

# Assessment ROW
print("  -> ROW")
soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/assesment/row')
df = parse_table_by_id(soup, 'example1')
if df is not None:
    all_data['ASSESMENT_ROW'] = df
    print(f"     {len(df)} baris x {len(df.columns)} kolom")

# Kondisi Peralatan
print("  -> Kondisi Peralatan")
soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/assesment/kondisiperalatan')
df = parse_table_by_id(soup, 'example1')
if df is not None:
    all_data['KONDISI_PERALATAN'] = df
    print(f"     {len(df)} baris x {len(df.columns)} kolom")

# Kondisi Gardu
print("  -> Kondisi Gardu")
soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/assesment/kondisigardu')
df = parse_table_by_id(soup, 'example1')
if df is not None:
    all_data['KONDISI_GARDU'] = df
    print(f"     {len(df)} baris x {len(df.columns)} kolom")

# ══════════════════════════════════════════════════════════════
# 3. REALISASI per penyulang dan tahun
# ══════════════════════════════════════════════════════════════
print("\n[5/8] REALISASI (per penyulang)")

realisasi_types = {
    'REALISASI_ROW':       'https://ksktgojabar.xyz/koordinator/realisasi/row',
    'REALISASI_GARDU':     'https://ksktgojabar.xyz/koordinator/realisasi/gardu',
    'REALISASI_PERALATAN': 'https://ksktgojabar.xyz/koordinator/realisasi/peralatan',
    'REALISASI_THERMO':    'https://ksktgojabar.xyz/koordinator/realisasi/thermovision',
    'REALISASI_ULTRASOUND':'https://ksktgojabar.xyz/koordinator/realisasi/ultrasound',
}

for key, url in realisasi_types.items():
    all_rows = []
    for thn in TAHUN_LIST:
        for bln in BULAN_LIST:
            soup, sz = get_soup(url, {'thn': thn, 'bln': bln})
            df = parse_table_by_id(soup, 'example1')
            if df is not None and len(df) > 0:
                df['Tahun'] = thn
                df['Bulan'] = bln
                all_rows.append(df)
            time.sleep(0.1)

    if all_rows:
        combined = pd.concat(all_rows, ignore_index=True).drop_duplicates()
        all_data[key] = combined
        print(f"  {key}: {len(combined)} baris")
    else:
        print(f"  {key}: tidak ada data")

# ══════════════════════════════════════════════════════════════
# 4. PEKERJAAN
# ══════════════════════════════════════════════════════════════
print("\n[6/8] PEKERJAAN")

pekerjaan_types = {
    'PEKERJAAN_ROW':       'https://ksktgojabar.xyz/koordinator/pekerjaan/row',
    'PEKERJAAN_PERALATAN': 'https://ksktgojabar.xyz/koordinator/pekerjaan/peralatan',
}

for key, url in pekerjaan_types.items():
    all_rows = []
    for bln in BULAN_LIST:
        soup, _ = get_soup(url, {'bln': bln})
        df = parse_table_by_id(soup, 'example1')
        if df is not None and len(df) > 0:
            df['Bulan'] = bln
            all_rows.append(df)
        time.sleep(0.1)

    if all_rows:
        combined = pd.concat(all_rows, ignore_index=True).drop_duplicates()
        all_data[key] = combined
        print(f"  {key}: {len(combined)} baris")
    else:
        print(f"  {key}: tidak ada data")

# ══════════════════════════════════════════════════════════════
# 5. LAPORAN ASSESSMENT
# ══════════════════════════════════════════════════════════════
print("\n[7/8] LAPORAN ASSESSMENT")

# Rekap umum
soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/lapassesment')
df = parse_table_by_id(soup, None)
if df is not None and len(df) > 0:
    all_data['REKAP_ASSESMENT'] = df
    print(f"  REKAP_ASSESMENT: {len(df)} baris")

# Per jenis
lap_types = {
    'LAP_PERALATAN': 'https://ksktgojabar.xyz/koordinator/lapassesment/peralatan',
    'LAP_GARDU':     'https://ksktgojabar.xyz/koordinator/lapassesment/gardu',
    'LAP_ROW':       'https://ksktgojabar.xyz/koordinator/lapassesment/row',
    'LAP_THERMOTM':  'https://ksktgojabar.xyz/koordinator/lapassesment/thermotm',
    'LAP_ULTRASOUND':'https://ksktgojabar.xyz/koordinator/lapassesment/ultrasound',
    'LAP_UKUR':      'https://ksktgojabar.xyz/koordinator/lapassesment/ukur',
    'LAP_VISUAL':    'https://ksktgojabar.xyz/koordinator/lapassesment/visual',
    'LAP_THERMOGD':  'https://ksktgojabar.xyz/koordinator/lapassesment/thermogd',
}

for key, url in lap_types.items():
    all_rows = []
    for thn in TAHUN_LIST:
        soup, _ = get_soup(url, {'thn': thn})
        df = parse_table_by_id(soup, 'example1')
        if df is not None and len(df) > 0:
            df['Tahun'] = thn
            all_rows.append(df)
        time.sleep(0.1)

    if all_rows:
        combined = pd.concat(all_rows, ignore_index=True).drop_duplicates()
        all_data[key] = combined
        print(f"  {key}: {len(combined)} baris")
    else:
        print(f"  {key}: tidak ada data")

# ══════════════════════════════════════════════════════════════
# 6. SETTING & MASTER DATA
# ══════════════════════════════════════════════════════════════
print("\n[8/8] MASTER DATA")

soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/setting/pekerjaan')
df = parse_table_by_id(soup, None)
if df is not None and len(df) > 0:
    all_data['MASTER_PEKERJAAN'] = df
    print(f"  MASTER_PEKERJAAN: {len(df)} baris")

soup, _ = get_soup('https://ksktgojabar.xyz/koordinator/setting/material')
df = parse_table_by_id(soup, None)
if df is not None and len(df) > 0:
    all_data['MASTER_MATERIAL'] = df
    print(f"  MASTER_MATERIAL: {len(df)} baris")

# ══════════════════════════════════════════════════════════════
# SIMPAN KE EXCEL
# ══════════════════════════════════════════════════════════════
print(f"\n{'='*60}")
print("MENYIMPAN KE EXCEL...")

excel_path = os.path.join(OUTPUT_DIR, 'DATA_KSKT_JABAR_FINAL.xlsx')
with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
    # Sheet RINGKASAN
    summary = []
    for k, df in all_data.items():
        summary.append({'Sheet': k, 'Jumlah Baris': len(df), 'Jumlah Kolom': len(df.columns),
                        'Kolom': ', '.join(str(c) for c in df.columns[:8])})
    pd.DataFrame(summary).to_excel(writer, sheet_name='RINGKASAN', index=False)

    # Sheet data
    for key, df in all_data.items():
        sn = key[:31]
        df.to_excel(writer, sheet_name=sn, index=False)

print(f"\n[OK] Excel disimpan: {excel_path}")
print(f"[OK] Total sheet: {len(all_data) + 1} (termasuk RINGKASAN)")
print(f"\n{'='*60}")
print("RINGKASAN DATA BERHASIL DIKUMPULKAN:")
for k, df in all_data.items():
    print(f"  {k:35s}: {len(df):>5} baris x {len(df.columns):>3} kolom")
print(f"{'='*60}")

# Simpan juga JSON ringkasan
summary_json = {k: {'rows': len(df), 'cols': len(df.columns), 
                     'columns': list(df.columns)} for k, df in all_data.items()}
with open(os.path.join(OUTPUT_DIR, 'summary.json'), 'w', encoding='utf-8') as f:
    json.dump(summary_json, f, ensure_ascii=False, indent=2)

print("\nSELESAI!")
