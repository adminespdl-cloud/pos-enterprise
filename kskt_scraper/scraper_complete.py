"""
KSKT GO JABAR - Scraper FINAL dengan fix parsing tbody tanpa <tr>
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import os, json, time

OUTPUT_DIR = "output_final"
os.makedirs(OUTPUT_DIR, exist_ok=True)

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
session.post('https://ksktgojabar.xyz/home/index',
             data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
             allow_redirects=True)
print("[+] Login OK")


def parse_table_flat(soup, remove_cols=None):
    """
    Parse tabel dimana <td> langsung ada di <tbody> tanpa <tr> wrapper.
    Juga handle tabel normal yang punya <tr>.
    """
    remove_cols = remove_cols or ['Action', 'Aksi']
    
    tbl = soup.find('table')
    if not tbl:
        cw = soup.find('div', class_='content-wrapper')
        if cw:
            tbl = cw.find('table')
    if not tbl:
        return None

    # Ambil headers dari thead
    headers = []
    thead = tbl.find('thead')
    if thead:
        headers = [th.get_text(strip=True) for th in thead.find_all(['th', 'td'])]

    num_cols = len(headers)
    if num_cols == 0:
        return None

    # Ambil semua TD dari tbody (mungkin tidak ada TR)
    tbody = tbl.find('tbody')
    if not tbody:
        return None

    # Coba cara normal dulu (ada TR)
    trs = tbody.find_all('tr', recursive=False)
    if trs:
        rows = []
        for tr in trs:
            cells = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
            if cells and any(c for c in cells):
                rows.append(cells)
    else:
        # Flat TDs tanpa TR - group by num_cols
        all_tds = tbody.find_all('td')
        flat_values = [td.get_text(strip=True) for td in all_tds]
        rows = []
        for i in range(0, len(flat_values), num_cols):
            chunk = flat_values[i:i + num_cols]
            if len(chunk) == num_cols and any(c for c in chunk):
                rows.append(chunk)

    if not rows:
        return None

    try:
        if headers and len(headers) == len(rows[0]):
            df = pd.DataFrame(rows, columns=headers)
        else:
            df = pd.DataFrame(rows)
        # Hapus kolom action
        for col in remove_cols:
            if col in df.columns:
                df = df.drop(columns=[col])
        return df
    except Exception as e:
        print(f"  Parse error: {e}")
        return None


def scrape(url, params=None, label=""):
    try:
        resp = session.get(url, params=params, timeout=20)
        soup = BeautifulSoup(resp.text, 'html.parser')
        df = parse_table_flat(soup)
        if df is not None and len(df) > 0:
            print(f"  [OK] {label}: {len(df)} baris x {len(df.columns)} kolom | cols: {list(df.columns[:6])}")
        else:
            print(f"  [--] {label}: tidak ada data")
        return df
    except Exception as e:
        print(f"  [!!] {label}: error - {e}")
        return None


# ══════════════════════════════════════════════════════
all_data = {}

print("\n[1] DATA ASET")
for name, url in [
    ('DATA_TIANG', 'https://ksktgojabar.xyz/koordinator/datatiang/index'),
    ('DATA_GARDU', 'https://ksktgojabar.xyz/koordinator/datagardu/index'),
    ('DATA_POHON', 'https://ksktgojabar.xyz/koordinator/datapohon/index'),
]:
    df = scrape(url, label=name)
    if df is not None and len(df) > 0:
        all_data[name] = df

print("\n[2] ASSESSMENT")
for name, url in [
    ('ASSESMENT_PERALATAN', 'https://ksktgojabar.xyz/koordinator/assesment/peralatan'),
    ('ASSESMENT_GARDU',     'https://ksktgojabar.xyz/koordinator/assesment/gardu'),
    ('ASSESMENT_ROW',       'https://ksktgojabar.xyz/koordinator/assesment/row'),
    ('KONDISI_PERALATAN',   'https://ksktgojabar.xyz/koordinator/assesment/kondisiperalatan'),
    ('KONDISI_GARDU',       'https://ksktgojabar.xyz/koordinator/assesment/kondisigardu'),
    ('TM_TEGANGAN',         'https://ksktgojabar.xyz/koordinator/tm/tegangan'),
    ('TM_THERMO',           'https://ksktgojabar.xyz/koordinator/tm/thermovision'),
    ('TM_ULTRASOUND',       'https://ksktgojabar.xyz/koordinator/tm/ultrasound'),
    ('GARDU_UKUR',          'https://ksktgojabar.xyz/koordinator/gardu/ukur'),
    ('GARDU_VISUAL',        'https://ksktgojabar.xyz/koordinator/gardu/visual'),
]:
    df = scrape(url, label=name)
    if df is not None and len(df) > 0:
        all_data[name] = df
    time.sleep(0.2)

print("\n[3] LAPORAN REKAP")
for name, url in [
    ('REKAP_ASSESMENT',  'https://ksktgojabar.xyz/koordinator/lapassesment'),
    ('LAP_PERALATAN',    'https://ksktgojabar.xyz/koordinator/lapassesment/peralatan'),
    ('LAP_GARDU',        'https://ksktgojabar.xyz/koordinator/lapassesment/gardu'),
    ('LAP_ROW',          'https://ksktgojabar.xyz/koordinator/lapassesment/row'),
    ('LAP_THERMOTM',     'https://ksktgojabar.xyz/koordinator/lapassesment/thermotm'),
    ('LAP_ULTRASOUND',   'https://ksktgojabar.xyz/koordinator/lapassesment/ultrasound'),
    ('LAP_UKUR_GARDU',   'https://ksktgojabar.xyz/koordinator/lapassesment/ukur'),
    ('LAP_VISUAL_GARDU', 'https://ksktgojabar.xyz/koordinator/lapassesment/visual'),
    ('LAP_THERMO_GD',    'https://ksktgojabar.xyz/koordinator/lapassesment/thermogd'),
    ('LAP_TEGANGAN',     'https://ksktgojabar.xyz/koordinator/lapassesment/tegangan'),
    ('LAPMAT_PERALATAN', 'https://ksktgojabar.xyz/koordinator/lapmat/peralatan'),
    ('LAPMAT_GARDU',     'https://ksktgojabar.xyz/koordinator/lapmat/gardu'),
    ('LAPMAT_REKAP',     'https://ksktgojabar.xyz/koordinator/lapmat/rekap'),
]:
    df = scrape(url, label=name)
    if df is not None and len(df) > 0:
        all_data[name] = df
    time.sleep(0.2)

print("\n[4] JADWAL & LIST JADWAL (per tahun)")
jadwal_urls = {
    'JADWAL_ROW':       'https://ksktgojabar.xyz/koordinator/jadwal/row',
    'JADWAL_PERALATAN': 'https://ksktgojabar.xyz/koordinator/jadwal/peralatan',
    'JADWAL_GARDU':     'https://ksktgojabar.xyz/koordinator/jadwal/gardu',
    'LISTJADWAL_ROW':   'https://ksktgojabar.xyz/koordinator/listjadwal/row',
    'LISTJADWAL_GARDU': 'https://ksktgojabar.xyz/koordinator/listjadwal/gardu',
    'LISTJADWAL_PERAL': 'https://ksktgojabar.xyz/koordinator/listjadwal/peralatan',
    'LISTJADWAL_THERMO_GD': 'https://ksktgojabar.xyz/koordinator/listjadwal/thermovisiongd',
}
for name, url in jadwal_urls.items():
    frames = []
    for thn in ['2024', '2025', '2026']:
        df = scrape(url, params={'thn': thn, 'bln': '7'}, label=f"{name}/{thn}")
        if df is not None and len(df) > 0:
            df['Tahun'] = thn
            frames.append(df)
        time.sleep(0.15)
    if frames:
        all_data[name] = pd.concat(frames, ignore_index=True).drop_duplicates()

print("\n[5] REALISASI (per tahun-bulan)")
real_urls = {
    'REALISASI_ROW':       'https://ksktgojabar.xyz/koordinator/realisasi/row',
    'REALISASI_GARDU':     'https://ksktgojabar.xyz/koordinator/realisasi/gardu',
    'REALISASI_PERALATAN': 'https://ksktgojabar.xyz/koordinator/realisasi/peralatan',
    'REALISASI_THERMO':    'https://ksktgojabar.xyz/koordinator/realisasi/thermovision',
    'REALISASI_MANDOR':    'https://ksktgojabar.xyz/koordinator/realisasi/mandorline',
}
for name, url in real_urls.items():
    frames = []
    for thn in ['2025', '2026']:
        for bln in ['1','2','3','4','5','6','7','8','9','10','11','12']:
            df = scrape(url, params={'thn': thn, 'bln': bln}, label=f"{name}/{thn}/{bln}")
            if df is not None and len(df) > 0:
                df['Tahun'] = thn
                df['Bulan'] = bln
                frames.append(df)
            time.sleep(0.1)
    if frames:
        combined = pd.concat(frames, ignore_index=True).drop_duplicates()
        all_data[name] = combined
        print(f"  TOTAL {name}: {len(combined)} baris")

print("\n[6] MASTER DATA")
for name, url in [
    ('MASTER_PEKERJAAN', 'https://ksktgojabar.xyz/koordinator/setting/pekerjaan'),
    ('MASTER_MATERIAL',  'https://ksktgojabar.xyz/koordinator/setting/material'),
]:
    df = scrape(url, label=name)
    if df is not None and len(df) > 0:
        all_data[name] = df

# ══════════════════════════════════════════════════════
# SIMPAN KE EXCEL
print(f"\n{'='*60}")
excel_path = os.path.join(OUTPUT_DIR, 'DATA_KSKT_JABAR_COMPLETE.xlsx')
with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
    summary_rows = []
    for k, df in all_data.items():
        summary_rows.append({
            'No': len(summary_rows)+1,
            'Nama Sheet': k,
            'Jumlah Baris': len(df),
            'Jumlah Kolom': len(df.columns),
            'Kolom': ', '.join(str(c) for c in df.columns)
        })
    pd.DataFrame(summary_rows).to_excel(writer, sheet_name='RINGKASAN', index=False)

    for key, df in all_data.items():
        df.to_excel(writer, sheet_name=key[:31], index=False)

print(f"[OK] Disimpan: {excel_path}")
print(f"[OK] Total sheets: {len(all_data)+1}")
print(f"\nRINGKASAN FINAL:")
print(f"{'='*60}")
for k, df in all_data.items():
    print(f"  {k:35s}: {len(df):>6} baris x {len(df.columns):>3} kolom")
print(f"{'='*60}")

# Simpan summary JSON
with open(os.path.join(OUTPUT_DIR, 'summary_final.json'), 'w', encoding='utf-8') as f:
    json.dump({k: {'rows': len(v), 'cols': len(v.columns), 'columns': list(v.columns)}
               for k, v in all_data.items()}, f, ensure_ascii=False, indent=2)

print("SELESAI!")
