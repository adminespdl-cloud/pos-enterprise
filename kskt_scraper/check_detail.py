"""
Investigasi halaman detail tiang untuk cari foto
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
session.post('https://ksktgojabar.xyz/home/index',
             data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
             allow_redirects=True)
print("[+] Login OK")

# Baca Excel untuk dapat ID tiang
xl = pd.ExcelFile('output_final/DATA_KSKT_JABAR_COMPLETE.xlsx')
tiang_df = xl.parse('DATA_TIANG')
gardu_df = xl.parse('DATA_GARDU')

print(f"Tiang rows: {len(tiang_df)}")
print(f"Kolom tiang: {list(tiang_df.columns)}")

# Coba beberapa URL view yang kita tahu dari scraping sebelumnya
view_urls = [
    'https://ksktgojabar.xyz/koordinator/datatiang/view/291545',
    'https://ksktgojabar.xyz/koordinator/datatiang/view/291551',
    'https://ksktgojabar.xyz/koordinator/datagardu/view/1',
]

for url in view_urls:
    print(f"\n=== {url} ===")
    resp = session.get(url, timeout=15)
    soup = BeautifulSoup(resp.text, 'html.parser')
    print(f"Status: {resp.status_code}, Size: {len(resp.text)}")
    print(f"Title: {soup.title.string if soup.title else 'N/A'}")
    
    # Cari semua gambar
    imgs = soup.find_all('img')
    print(f"Images ditemukan: {len(imgs)}")
    for img in imgs:
        src = img.get('src', '')
        alt = img.get('alt', '')
        if src and 'logo' not in src.lower() and 'icon' not in src.lower():
            print(f"  IMG: {src} | alt={alt}")
    
    # Cari link download / file
    for a in soup.find_all('a', href=True):
        href = a['href']
        if any(ext in href.lower() for ext in ['.jpg','.jpeg','.png','.pdf','.zip']):
            print(f"  FILE LINK: {href}")
    
    # Cari konten utama
    cw = soup.find('div', class_='content-wrapper')
    if cw:
        print(f"  Content preview: {cw.get_text(strip=True)[:200]}")
    
    # Simpan HTML
    fname = url.split('/')[-1]
    with open(f'output_final/detail_{fname}.html', 'w', encoding='utf-8') as f:
        f.write(resp.text)
    print(f"  HTML disimpan: detail_{fname}.html")
