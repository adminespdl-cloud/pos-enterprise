"""
Fix parsing data_tiang - investigasi struktur HTML yang sebenarnya
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import os

OUTPUT_DIR = "output_final"

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
session.post('https://ksktgojabar.xyz/home/index',
             data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
             allow_redirects=True)

resp = session.get('https://ksktgojabar.xyz/koordinator/datatiang/index')
soup = BeautifulSoup(resp.text, 'html.parser')
cw = soup.find('div', class_='content-wrapper')

# Cek struktur tabel sebenarnya
for tbl in soup.find_all('table'):
    print(f"Table id={tbl.get('id','')} class={tbl.get('class','')}")
    # Cek semua TR
    trs = tbl.find_all('tr')
    print(f"  TR count: {len(trs)}")
    # Cek apakah tbody ada
    tbody = tbl.find('tbody')
    if tbody:
        tbody_trs = tbody.find_all('tr')
        print(f"  TBODY TR count: {len(tbody_trs)}")
        # Cek contoh baris pertama
        for i, tr in enumerate(tbody_trs[:3]):
            tds = tr.find_all(['td','th'])
            print(f"  Row {i}: {len(tds)} cells -> {[td.get_text(strip=True)[:20] for td in tds[:5]]}")
    
    # Cek thead
    thead = tbl.find('thead')
    if thead:
        headers = [th.get_text(strip=True) for th in thead.find_all(['th','td'])]
        print(f"  Headers ({len(headers)}): {headers[:10]}")

# Kalau tidak ada tbody TR, cari data di card/div
print("\n=== CEK DIV CARDS ===")
# Cari pola yang mungkin digunakan untuk menampilkan data tiang
cards = cw.find_all('div', class_=lambda c: c and any(x in str(c) for x in ['card', 'item', 'tiang', 'panel', 'col-']))
print(f"Cards found: {len(cards)}")
for card in cards[:3]:
    print(f"  div.{card.get('class','')}: {card.get_text(strip=True)[:100]}")

# Cek apakah data ada dalam format berbeda (rows in divs)
print("\n=== SAMPLE HTML (content-wrapper section) ===")
if cw:
    # Ambil bagian isi setelah header
    content_html = str(cw)
    # Cari bagian tabel
    tbl_start = content_html.find('<table')
    if tbl_start >= 0:
        print("Table HTML preview (500 chars):")
        print(content_html[tbl_start:tbl_start+500])
        print("...")
        # Cari tbody
        tbody_start = content_html.find('<tbody')
        if tbody_start >= 0:
            print("\nTBODY preview (500 chars):")
            print(content_html[tbody_start:tbody_start+1000])

# Coba parse dengan pd.read_html langsung
print("\n=== TRY pd.read_html ===")
try:
    dfs = pd.read_html(resp.text)
    print(f"pd.read_html found {len(dfs)} tables")
    for i, df in enumerate(dfs):
        print(f"  Table {i}: {df.shape} - cols: {list(df.columns[:5])}")
        print(f"  Sample: {df.head(2).to_dict('records')[:1]}")
except Exception as e:
    print(f"Error: {e}")
