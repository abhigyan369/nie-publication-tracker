import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'NIE_Publication_Tracker_Enhanced.xlsx');

const wb = XLSX.readFile(filePath);
console.log('Sheet names:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  

  data.slice(0, 5).forEach((row, idx) => {
    console.log(`Row ${idx}:`, JSON.stringify(row).slice(0, 500));
  });
  
  console.log(`Total rows: ${data.length}`);
});

