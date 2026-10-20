import Papa from 'papaparse';
import type { StudentImportRaw } from '../models/student';
import { sanitizeCellInput } from '../utils/securitySanitizer';

/**
 * Parses a CSV file and extracts its rows into raw string object representations.
 * Preserves leading zeros and filters blank rows.
 */
export function parseCSV(file: File): Promise<StudentImportRaw[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<StudentImportRaw>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false, // Strictly preserve strings, never convert register numbers to numbers
      transformHeader: (header) => sanitizeCellInput(header),
      transform: (value) => sanitizeCellInput(value),
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV Parsing warnings:', results.errors);
        }

        const validRows = results.data.filter((row) =>
          Object.values(row).some((val) => String(val).trim() !== '')
        );

        resolve(validRows);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
