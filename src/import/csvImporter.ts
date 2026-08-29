import Papa from 'papaparse';
import type { StudentImportRaw } from '../models/student';

/**
 * Parses a CSV file and extracts its rows into raw object representations.
 */
export function parseCSV(file: File): Promise<StudentImportRaw[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<StudentImportRaw>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          // Reject on critical parsing failure (like not being able to read the file)
          // Minor line errors are ignored or could be handled separately.
          console.error("CSV Parsing errors:", results.errors);
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
