import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import os
import re

OUTPUT_DIR = "output_v2"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ──────────────────────────────────────────────
# LOGIN
# ──────────────────────────────────────────────
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
})
resp = session.post('https://ksktgojabar.xyz/home/index',
                    data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
                    allow_redirects=True)
print(f"[+] Login -> {resp.url}")
print(f"[+] Cookies: {dict(session.cookies)}")

# ──────────────────────────────────────────────
# Cek halaman gangguan secara detail
# ──────────────────────────────────────────────
resp2 = session.get('https://ksktgojabar.xyz/koordinator/gangguan/', timeout=15)
soup = BeautifulSoup(resp2.text, 'html.parser')

print(f"\nTitle: {soup.title.string if soup.title else 'N/A'}")
print(f"Tables: {len(soup.find_all('table'))}")

# Cari semua table
for i, tbl in enumerate(soup.find_all('table')):
    print(f"\nTable {i}: id={tbl.get('id','')}, class={tbl.get('class','')}")
    rows = tbl.find_all('tr')
    for row in rows[:5]:
        cells = [td.get_text(strip=True)[:30] for td in row.find_all(['td','th'])]
        print(f"  {cells}")

# Cari semua div konten
print("\n=== BODY CONTENT SECTIONS ===")
content_area = soup.find('div', class_='content-wrapper')
if content_area:
    print("Found content-wrapper!")
    print(content_area.get_text(strip=True)[:500])
else:
    print("No content-wrapper found")
    # Cari div utama
    for div in soup.find_all('div')[:20]:
        cls = ' '.join(div.get('class', []))
        did = div.get('id', '')
        txt = div.get_text(strip=True)[:100]
        if txt:
            print(f"  div#{did}.{cls}: {txt}")

# Cek apakah semua halaman benar-benar sama (redirect ke dashboard)
print("\n=== CEK URL REDIRECT ===")
test_pages = {
    'gangguan': 'https://ksktgojabar.xyz/koordinator/gangguan/',
    'data_tiang': 'https://ksktgojabar.xyz/koordinator/datatiang/index',
    'realisasi_row': 'https://ksktgojabar.xyz/koordinator/realisasi/row',
    'dashboard': 'https://ksktgojabar.xyz/koordinator/home',
}
contents = {}
for name, url in test_pages.items():
    r = session.get(url, timeout=15)
    contents[name] = len(r.text)
    print(f"  {name}: status={r.status_code}, size={len(r.text)}, final_url={r.url}")

# Cek apakah kontennya identik
sizes = list(contents.values())
print(f"\nApakah semua halaman sama ukurannya? {len(set(sizes)) == 1}")
print(f"Ukuran masing-masing: {contents}")

# ──────────────────────────────────────────────
# Coba endpoint notif (yang ditemukan di AJAX)
# ──────────────────────────────────────────────
print("\n=== TEST API ENDPOINTS ===")

endpoints = [
    'https://ksktgojabar.xyz/notif/rencana.php?ulp=ULP.53585',
    'https://ksktgojabar.xyz/koordinator/home/totalallterimaperencanaan?ulp=ULP.53585',
    'https://ksktgojabar.xyz/koordinator/gangguan/getdata',
    'https://ksktgojabar.xyz/koordinator/gangguan/data',
    'https://ksktgojabar.xyz/koordinator/datatiang/getdata',
    'https://ksktgojabar.xyz/koordinator/datatiang/data',
]

for ep in endpoints:
    try:
        r = session.get(ep, timeout=10)
        print(f"\n  {ep}")
        print(f"  Status: {r.status_code}, Size: {len(r.text)}")
        print(f"  Content-Type: {r.headers.get('Content-Type','')}")
        print(f"  Preview: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")
