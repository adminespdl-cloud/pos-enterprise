const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\Fathia\\.gemini\\antigravity\\brain\\2e3df282-3303-4dbb-bd04-052f554540b8\\.system_generated\\steps\\65\\content.md', 'utf-8');

const lines = content.split('\n');
let dataPekerjaan = [];
let currentKategori = null;
let currentUraian = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  // skip headers
  if (i < 12) continue; // the data starts around line 13
  
  // Custom split to handle commas inside quotes (though it seems there are none in the first 5 columns)
  // Let's just use split(',')
  const cols = line.split(',');
  if (cols.length < 5) continue;
  
  let no = cols[0].trim();
  let uraian = cols[1].trim();
  let satuan = cols[3].trim();
  let hargaStr = cols[4].trim();
  
  if (['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'].includes(no)) {
    // New Kategori
    currentKategori = {
      id: `kat_${dataPekerjaan.length + 1}`,
      kategori: uraian,
      items: []
    };
    dataPekerjaan.push(currentKategori);
    continue;
  }
  
  if (hargaStr === '' || hargaStr === '-' || isNaN(parseFloat(hargaStr.replace(/\./g, '')))) {
    continue;
  }
  
  let hargaSatuan = parseFloat(hargaStr.replace(/\./g, ''));
  
  if (no !== '') {
    currentUraian = uraian;
  } else if (uraian === '') {
    // sometimes uraian is empty, and the detail is in satuan like "2 Isolator / Tiang"
    // we just use the currentUraian
  } else {
    currentUraian = uraian;
  }
  
  let namaItem = currentUraian;
  if (no === '' && satuan !== '') {
    namaItem = `${currentUraian} - ${satuan}`;
  }
  
  if (currentKategori && hargaSatuan > 0) {
    currentKategori.items.push({
      id: `item_${currentKategori.id}_${currentKategori.items.length + 1}`,
      nama: namaItem,
      satuan: satuan,
      hargaSatuan: hargaSatuan
    });
  }
}

// remove empty categories
dataPekerjaan = dataPekerjaan.filter(cat => cat.items.length > 0);

const moduleStr = `export const dataPekerjaan = ${JSON.stringify(dataPekerjaan, null, 2)};\n`;
fs.writeFileSync('C:\\Users\\Fathia\\.gemini\\antigravity\\scratch\\rab-otomatis-webapp\\src\\data\\pekerjaan.js', moduleStr);
console.log('Done generating data');
