import * as XLSX from 'xlsx';
import type { StudentImportRaw } from '../models/student';
import { sanitizeCellInput } from '../utils/securitySanitizer';

/**
 * Returns the list of worksheet names from an uploaded Excel file.
 */
export function getExcelSheetNames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file data');
        // bookVBA: false ensures macro scripts are never parsed or loaded
        const workbook = XLSX.read(data, { type: 'array', bookVBA: false, cellFormula: false });
        resolve(workbook.SheetNames);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses an Excel file (.xlsx, .xls) and extracts rows from the specified worksheet (or first sheet).
 * Uses raw: false to ensure numbers with leading zeros (e.g. "0042") are preserved as strings.
 * Disallows VBA macro evaluation and sanitizes formula injection vulnerabilities.
 */
export function parseExcel(file: File, sheetName?: string): Promise<StudentImportRaw[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Failed to read file data');
        }

        // Hardening against macro execution and formula payload evaluation
        const workbook = XLSX.read(data, {
          type: 'array',
          bookVBA: false,
          cellFormula: false,
        });

        if (workbook.SheetNames.length === 0) {
          throw new Error('No worksheets found in the Excel file');
        }

        const targetSheetName = sheetName && workbook.SheetNames.includes(sheetName)
          ? sheetName
          : workbook.SheetNames[0];

        const worksheet = workbook.Sheets[targetSheetName];

        // raw: false formats values as strings to strictly preserve leading zeros and formatting
        const rawData = XLSX.utils.sheet_to_json<StudentImportRaw>(worksheet, {
          defval: '',
          raw: false,
        });

        // Clean up headers and sanitize values against spreadsheet formula injection
        const cleanedData = rawData
          .map((row) => {
            const cleanRow: StudentImportRaw = {};
            for (const [key, val] of Object.entries(row)) {
              cleanRow[sanitizeCellInput(key)] = sanitizeCellInput(val);
            }
            return cleanRow;
          })
          .filter((row) => {
            // Filter out completely blank rows
            return Object.values(row).some((val) => String(val).trim() !== '');
          });

        resolve(cleanedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}
