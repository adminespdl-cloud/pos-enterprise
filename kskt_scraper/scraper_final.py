"""
KSKT GO JABAR - Final Scraper
Strategi: Data di-render server-side dalam HTML.
Kita parse tabel dari HTML yang sudah ada.
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import os
import re

OUTPUT_DIR = "output_final"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── LOGIN ──────────────────────────────────────────────────────
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
})
r = session.post('https://ksktgojabar.xyz/home/index',
                 data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
                 allow_redirects=True)
print(f"[+] Login -> {r.url}")


def get_page(url):
    resp = session.get(url, timeout=20)
    return resp


def parse_tables(html, label):
    """Parse semua tabel HTML ke dataframe"""
    soup = BeautifulSoup(html, 'html.parser')
    results = []

    # Cari tabel dengan id/class yang umum dipakai di AdminLTE
    tables = soup.find_all('table')
    if not tables:
        # Coba cari data dalam list / div
        content = soup.find('div', class_='content-wrapper')
        if content:
            text = content.get_text(separator='\n', strip=True)
            if len(text) > 100:
                results.append({'type': 'text', 'label': label, 'content': text[:2000]})
        return results

    for i, tbl in enumerate(tables):
        tbl_id = tbl.get('id', f'table_{i}')
        # Ambil header
        headers = []
        header_row = tbl.find('thead')
        if header_row:
            headers = [th.get_text(strip=True) for th in header_row.find_all(['th', 'td'])]

        # Ambil rows
        rows_data = []
        tbody = tbl.find('tbody')
        target = tbody if tbody else tbl
        for row in target.find_all('tr'):
            cells = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
            if cells and any(c for c in cells):
                rows_data.append(cells)

        if rows_data:
            if headers and len(headers) == len(rows_data[0]):
                df = pd.DataFrame(rows_data, columns=headers)
            else:
                df = pd.DataFrame(rows_data)
            results.append({'type': 'table', 'label': f"{label}_{tbl_id}", 'df': df,
                            'rows': len(df), 'cols': len(df.columns)})

    return results


def scrape_page_with_filters(name, url, params_list=None):
    """Scrape halaman, optionally dengan berbagai filter/param"""
    all_results = []
    urls_to_try = [(url, {})]

    if params_list:
        for p in params_list:
            urls_to_try.append((url, p))

    for target_url, params in urls_to_try:
        try:
            if params:
                resp = session.get(target_url, params=params, timeout=20)
            else:
                resp = session.get(target_url, timeout=20)

            param_label = '_'.join(f"{k}{v}" for k, v in params.items()) if params else 'default'
            label = f"{name}_{param_label}"

            soup = BeautifulSoup(resp.text, 'html.parser')
            content_wrap = soup.find('div', class_='content-wrapper')
            content_html = str(content_wrap) if content_wrap else resp.text

            results = parse_tables(content_html, label)
            all_results.extend(results)

            # Simpan HTML
            safe = re.sub(r'[^\w]', '_', label)
            with open(os.path.join(OUTPUT_DIR, f"{safe}.html"), 'w', encoding='utf-8') as f:
                f.write(resp.text)

        except Exception as e:
            print(f"  [!] Error {url}: {e}")

    return all_results


# ── HALAMAN & FILTER ───────────────────────────────────────────
PAGES = [
    # DATA BESAR (ukuran HTML besar = banyak data)
    ('data_tiang',          'https://ksktgojabar.xyz/koordinator/datatiang/index',    None),
    ('data_gardu',          'https://ksktgojabar.xyz/koordinator/datagardu/index',     None),
    ('data_pohon',          'https://ksktgojabar.xyz/koordinator/datapohon/index',     None),

    # GANGGUAN
    ('gangguan',            'https://ksktgojabar.xyz/koordinator/gangguan/',           None),

    # REALISASI - coba dengan tahun
    ('realisasi_row',       'https://ksktgojabar.xyz/koordinator/realisasi/row',
     [{'thn': '2024'}, {'thn': '2025'}, {'thn': '2026'}]),
    ('realisasi_gardu',     'https://ksktgojabar.xyz/koordinator/realisasi/gardu',
     [{'thn': '2024'}, {'thn': '2025'}, {'thn': '2026'}]),
    ('realisasi_peralatan', 'https://ksktgojabar.xyz/koordinator/realisasi/peralatan',
     [{'thn': '2024'}, {'thn': '2025'}, {'thn': '2026'}]),

    # LAPORAN ASSESSMENT
    ('lapassesment',        'https://ksktgojabar.xyz/koordinator/lapassesment',        None),
    ('lapassesment_row',    'https://ksktgojabar.xyz/koordinator/lapassesment/row',
     [{'thn': '2025'}, {'thn': '2026'}]),
    ('lapassesment_gardu',  'https://ksktgojabar.xyz/koordinator/lapassesment/gardu',
     [{'thn': '2025'}, {'thn': '2026'}]),
    ('lapassesment_peralatan', 'https://ksktgojabar.xyz/koordinator/lapassesment/peralatan',
     [{'thn': '2025'}, {'thn': '2026'}]),

    # LAPORAN MATERIAL
    ('lapmat_peralatan',    'https://ksktgojabar.xyz/koordinator/lapmat/peralatan',    None),
    ('lapmat_gardu',        'https://ksktgojabar.xyz/koordinator/lapmat/gardu',        None),
    ('lapmat_rekap',        'https://ksktgojabar.xyz/koordinator/lapmat/rekap',        None),

    # JADWAL & LIST JADWAL
    ('listjadwal_row',      'https://ksktgojabar.xyz/koordinator/listjadwal/row',      None),
    ('listjadwal_gardu',    'https://ksktgojabar.xyz/koordinator/listjadwal/gardu',    None),
    ('listjadwal_peralatan','https://ksktgojabar.xyz/koordinator/listjadwal/peralatan',None),
    ('listjadwal_thermo_gd','https://ksktgojabar.xyz/koordinator/listjadwal/thermovisiongd', None),

    # ASSESSMENT
    ('assesment_peralatan', 'https://ksktgojabar.xyz/koordinator/assesment/peralatan', None),
    ('assesment_gardu',     'https://ksktgojabar.xyz/koordinator/assesment/gardu',     None),
    ('assesment_row',       'https://ksktgojabar.xyz/koordinator/assesment/row',       None),

    # PEKERJAAN
    ('pekerjaan_row',       'https://ksktgojabar.xyz/koordinator/pekerjaan/row',       None),
    ('pekerjaan_peralatan', 'https://ksktgojabar.xyz/koordinator/pekerjaan/peralatan', None),
    ('pekerjaan_gardu',     'https://ksktgojadar.xyz/koordinator/pekerjaan/gardu',     None),

    # SETTING
    ('setting_pekerjaan',   'https://ksktgojabar.xyz/koordinator/setting/pekerjaan',  None),
    ('setting_material',    'https://ksktgojabar.xyz/koordinator/setting/material',   None),

    # HARJAR/HARDU BULANAN
    ('bulanan_harjar',      'https://ksktgojabar.xyz/koordinator/bulanan/harjar',
     [{'thn': '2025', 'bln': '7'}, {'thn': '2026', 'bln': '7'}]),
    ('bulanan_hardu',       'https://ksktgojabar.xyz/koordinator/bulanan/hardu',
     [{'thn': '2025', 'bln': '7'}, {'thn': '2026', 'bln': '7'}]),

    # DASHBOARD
    ('dashboard',           'https://ksktgojabar.xyz/koordinator/home',               None),
]

# ── SCRAPING ───────────────────────────────────────────────────
all_tables = {}
summary_rows = []
total = len(PAGES)

print(f"\n{'='*60}")
print(f"Mulai scraping {total} halaman...")
print(f"{'='*60}")

for i, (name, url, params) in enumerate(PAGES, 1):
    print(f"\n[{i}/{total}] {name}")
    results = scrape_page_with_filters(name, url, params)

    table_count = 0
    for r in results:
        if r['type'] == 'table':
            table_count += 1
            key = r['label']
            all_tables[key] = r['df']
            print(f"  [+] Tabel '{key}': {r['rows']} baris x {r['cols']} kolom")
            print(f"       Kolom: {list(r['df'].columns[:8])}")
        elif r['type'] == 'text':
            print(f"  [i] Konten teks: {r['content'][:120]}")

    summary_rows.append({
        'Halaman': name,
        'URL': url,
        'Jumlah Tabel': table_count,
        'Ada Data': 'Ya' if table_count > 0 else 'Tidak',
    })

# ── SIMPAN EXCEL ───────────────────────────────────────────────
print(f"\n{'='*60}")
excel_path = os.path.join(OUTPUT_DIR, 'DATA_KSKT_JABAR.xlsx')
with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
    # Ringkasan
    pd.DataFrame(summary_rows).to_excel(writer, sheet_name='RINGKASAN', index=False)

    # Semua tabel data
    for sheet_name, df in all_tables.items():
        sn = sheet_name[:31]
        df.to_excel(writer, sheet_name=sn, index=False)

print(f"[+] Excel disimpan: {excel_path}")
print(f"[+] Total sheet: {len(all_tables) + 1}")
print(f"\n=== RINGKASAN AKHIR ===")
for row in summary_rows:
    status = 'DATA' if row['Ada Data'] == 'Ya' else '----'
    print(f"  [{status}] {row['Halaman']}: {row['Jumlah Tabel']} tabel")

print("\nSELESAI!")
