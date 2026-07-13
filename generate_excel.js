const ExcelJS = require('exceljs');

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  // Load the template
  await workbook.xlsx.readFile('khs_template.xlsx');
  
  // The first sheet is usually the active one
  const worksheet = workbook.worksheets[0];
  
  // Data Mapping based on Realisasi
  // Format: [RowNumber, DateColumn(1-31), Volume, isDoubtful]
  const updates = [
    [154, 8, 1, false],   // 8/5: Pengecatan
    [79, 11, 1, false],   // 11/5: Travers V/T
    [79, 12, 1, false],   // 12/5: Travers V/T
    [62, 13, 1, false],   // 13/5: Travers Aspan
    [144, 15, 1, false],  // 15/5: SUTR melorot
    [142, 15, 1, false],  // 15/5: Tiang miring
    [125, 18, 1, true],   // 18/5: Perbaikan Recloser (Doubtful mapping)
    [143, 18, 1, true],   // 18/5: Tegangan Drop (Doubtful)
    [144, 19, 1, false],  // 19/5: Kabel merorot
    [143, 19, 1, true],   // 19/5: Tegangan Drop
    [146, 20, 1, false],  // 20/5: Pasang Tiang TR
    [162, 20, 12, false], // 20/5: Bending wire
    [162, 20, 24, false], // 20/5: Bending wire
    [143, 21, 1, true],   // 21/5: Apreting gawang (Doubtful)
    [143, 22, 1, true],   // 22/5: Pecah beban (Doubtful)
    [122, 24, 1, false],  // 24/5: PHBTR
    [79, 25, 1, false],   // 25/5: Travers V
    [143, 26, 1, true],   // 26/5: Pecah beban tegangan drop
    [143, 26, 1, true],   // 26/5: Tegangan drop
    [143, 29, 1, true],   // 29/5: Tegangan drop
    [133, 29, 1, false],  // 29/5: Gangguan Trafo UGB
    [143, 30, 1, true]    // 30/5: Bongkar kabel TIC 70 (Doubtful)
  ];

  // Helper to get column letter for dates 1-31
  // Col F = 1, G = 2, H = 3 ...
  // ASCII 'F' is 70, but it goes past Z into AA, AB etc.
  // Col 1 is 6 (1-based index) -> F
  const getDateCol = (day) => {
    return day + 5; // Day 1 is Col 6 (F)
  };

  updates.forEach(update => {
    const [rowIdx, day, vol, isDoubtful] = update;
    const colIdx = getDateCol(day);
    
    const cell = worksheet.getRow(rowIdx).getCell(colIdx);
    cell.value = (cell.value || 0) + vol;
    
    if (isDoubtful) {
      // Highlight row background yellow if doubtful
      const row = worksheet.getRow(rowIdx);
      row.eachCell({ includeEmpty: true }, (c) => {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow
        };
      });
      // Add a note in a comment or the cell
      const descCell = row.getCell(2);
      descCell.note = 'Pencocokan AI: Item ini ragu/fuzzy berdasarkan teks laporan lapangan.';
    }
  });

  // Calculate Totals for modified rows
  const modifiedRows = [...new Set(updates.map(u => u[0]))];
  
  modifiedRows.forEach(rowIdx => {
    const row = worksheet.getRow(rowIdx);
    let totalQty = 0;
    
    // Sum dates 1-31 (Col 6 to 36)
    for (let c = 6; c <= 36; c++) {
      const val = row.getCell(c).value;
      if (typeof val === 'number') {
        totalQty += val;
      }
    }
    
    // Total column is AK (Col 37)
    const totalCell = row.getCell(37);
    totalCell.value = totalQty;
    
    // Price column is E (Col 5)
    let priceCell = row.getCell(5).value;
    let price = 0;
    if (typeof priceCell === 'number') {
      price = priceCell;
    } else if (typeof priceCell === 'string') {
      price = parseFloat(priceCell.replace(/[^0-9,-]+/g, '').replace(',', '.'));
    }
    
    // Total Rupiah column is AL (Col 38)
    const totalRpCell = row.getCell(38);
    totalRpCell.value = totalQty * price;
    totalRpCell.numFmt = '"Rp"#,##0.00';
  });

  await workbook.xlsx.writeFile('Laporan_Realisasi_KHS_Mei_2026.xlsx');
  console.log('Excel generated successfully.');
}

generateExcel().catch(console.error);
