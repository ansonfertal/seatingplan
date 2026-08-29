import * as XLSX from 'xlsx';
import type { StudentImportRaw } from '../models/student';

/**
 * Parses an Excel file (.xlsx, .xls) and extracts rows from the first worksheet.
 */
export function parseExcel(file: File): Promise<StudentImportRaw[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Failed to read file data");
        }

        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error("No worksheets found in the Excel file");
        }

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON array of objects
        // defval: '' ensures empty cells become empty strings instead of undefined
        const rawData = XLSX.utils.sheet_to_json<StudentImportRaw>(worksheet, { 
          defval: '',
          raw: false // format values as strings
        });
        
        // Clean up headers and values (trim whitespace)
        const cleanedData = rawData.map(row => {
          const cleanRow: StudentImportRaw = {};
          for (const [key, val] of Object.entries(row)) {
            cleanRow[key.trim()] = typeof val === 'string' ? val.trim() : val;
          }
          return cleanRow;
        });

        resolve(cleanedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    // Read the file as an ArrayBuffer, which is required by SheetJS
    reader.readAsArrayBuffer(file);
  });
}
