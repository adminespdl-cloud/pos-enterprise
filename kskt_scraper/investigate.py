"""
Investigasi halaman data_tiang (161KB) dan halaman realisasi yang kosong
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import os

OUTPUT_DIR = "output_final"

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
session.post('https://ksktgojabar.xyz/home/index',
             data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
             allow_redirects=True)
print("[+] Login OK")

# ── 1. Cek data_tiang ────────────────────────────────────────
print("\n=== DATA TIANG (161KB) ===")
resp = session.get('https://ksktgojabar.xyz/koordinator/datatiang/index')
soup = BeautifulSoup(resp.text, 'html.parser')
content = soup.find('div', class_='content-wrapper')

# Cari semua elemen yang mungkin berisi data
print(f"Total HTML size: {len(resp.text)}")
print(f"Tables: {len(soup.find_all('table'))}")
print(f"TR tags: {len(soup.find_all('tr'))}")
print(f"TD tags: {len(soup.find_all('td'))}")

# Cari iframe atau div khusus
for div in soup.find_all('div', id=True):
    did = div.get('id')
    cls = ' '.join(div.get('class', []))
    txt = div.get_text(strip=True)[:80]
    if txt and did not in ['wrapper', 'sidebar-collapse']:
        print(f"  div#{did}[{cls}]: {txt}")

# Cek apakah ada data dalam format lain (list, select, etc.)
print("\nAll scripts with data:")
for s in soup.find_all('script'):
    t = s.get_text()
    if 'tiang' in t.lower() or 'data' in t.lower() or 'var ' in t:
        print(t[:500])
        print("---")

# ── 2. Cek realisasi dengan POST ─────────────────────────────
print("\n=== REALISASI ROW (coba berbagai parameter) ===")
test_params = [
    {'thn': '2026'},
    {'thn': '2025'},
    {'thn': '2026', 'bln': '7'},
    {'thn': '2025', 'bln': '7'},
]
for p in test_params:
    r = session.get('https://ksktgojabar.xyz/koordinator/realisasi/row', params=p, timeout=15)
    soup2 = BeautifulSoup(r.text, 'html.parser')
    tables = soup2.find_all('table')
    content2 = soup2.find('div', class_='content-wrapper')
    txt = content2.get_text(strip=True)[:200] if content2 else ''
    print(f"  Params {p}: tables={len(tables)}, size={len(r.text)}")
    print(f"  Content preview: {txt[:150]}")

# ── 3. Cek pekerjaan row ─────────────────────────────────────
print("\n=== PEKERJAAN ROW ===")
r3 = session.get('https://ksktgojabar.xyz/koordinator/pekerjaan/row', timeout=15)
soup3 = BeautifulSoup(r3.text, 'html.parser')
c3 = soup3.find('div', class_='content-wrapper')
print(f"Size: {len(r3.text)}, Tables: {len(soup3.find_all('table'))}")
if c3:
    print(f"Content: {c3.get_text(strip=True)[:300]}")

# ── 4. Check assesment_peralatan lebih detail ────────────────
print("\n=== ASSESMENT PERALATAN (cek pagination) ===")
r4 = session.get('https://ksktgojabar.xyz/koordinator/assesment/peralatan', timeout=15)
soup4 = BeautifulSoup(r4.text, 'html.parser')
for tbl in soup4.find_all('table'):
    rows = tbl.find_all('tr')
    print(f"Table id={tbl.get('id','')}: {len(rows)} rows")
    # Print first 3 rows
    for row in rows[:3]:
        cells = [td.get_text(strip=True)[:30] for td in row.find_all(['td','th'])]
        if any(cells):
            print(f"  {cells}")

# Cek apakah ada total records di teks
content4 = soup4.find('div', class_='content-wrapper')
if content4:
    txt4 = content4.get_text(strip=True)
    # Cari angka total
    total_match = re.findall(r'(?:total|showing|of|dari)\s*(\d+)', txt4, re.IGNORECASE)
    print(f"Total records hint: {total_match}")

# ── 5. Coba listjadwal dengan parameter ──────────────────────
print("\n=== LISTJADWAL THERMOVISION GD (coba param) ===")
for p in [{'pyl': 'All', 'thn': '2026', 'bln': '7', 'sts': ''},
          {'pyl': 'All', 'thn': '2025', 'bln': '7', 'sts': ''}]:
    r5 = session.get('https://ksktgojabar.xyz/koordinator/listjadwal/thermovisiongd', params=p, timeout=15)
    soup5 = BeautifulSoup(r5.text, 'html.parser')
    tables5 = soup5.find_all('table')
    print(f"  {p}: tables={len(tables5)}, size={len(r5.text)}")
    for tbl in tables5:
        rows = tbl.find_all('tr')
        print(f"    Table: {len(rows)} rows")
        for row in rows[:2]:
            cells = [td.get_text(strip=True)[:25] for td in row.find_all(['td','th'])]
            if any(cells):
                print(f"      {cells}")

# ── 6. Cek gangguan dengan parameter ─────────────────────────
print("\n=== GANGGUAN (coba param tahun) ===")
for thn in ['2024', '2025', '2026']:
    for bln in ['7', '']:
        p = {'thn': thn, 'bln': bln}
        r6 = session.get('https://ksktgojabar.xyz/koordinator/gangguan/', params=p, timeout=15)
        soup6 = BeautifulSoup(r6.text, 'html.parser')
        tables6 = soup6.find_all('table')
        c6 = soup6.find('div', class_='content-wrapper')
        txt6 = c6.get_text(strip=True)[:100] if c6 else ''
        print(f"  thn={thn} bln={bln}: tables={len(tables6)}, preview={txt6[:80]}")
