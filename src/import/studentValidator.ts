import type { Student, StudentImportRaw } from '../models/student';

export type ValidationIssue = {
  rowIndex: number;
  message: string;
};

export type ValidationReport = {
  validStudents: Student[];
  invalidRows: { row: StudentImportRaw; issues: string[] }[];
  duplicateCount: number;
  missingBranchCount: number;
};

export type ColumnMapping = {
  registerNumber: string;
  name: string;
  branch: string;
};

export function validateStudentData(
  rawData: StudentImportRaw[],
  mapping: ColumnMapping,
  existingStudents: Student[] = []
): ValidationReport {
  const validStudents: Student[] = [];
  const invalidRows: { row: StudentImportRaw; issues: string[] }[] = [];
  
  let duplicateCount = 0;
  let missingBranchCount = 0;

  // Track seen register numbers to catch duplicates within the import batch
  const seenRegisterNumbers = new Set(existingStudents.map(s => s.registerNumber.toLowerCase()));

  rawData.forEach((row) => {
    const issues: string[] = [];
    
    // 1. Extract mapped fields
    const regNoRaw = row[mapping.registerNumber];
    const nameRaw = row[mapping.name];
    const branchRaw = row[mapping.branch];

    const registerNumber = String(regNoRaw || '').trim();
    const name = String(nameRaw || '').trim();
    const branch = String(branchRaw || '').trim().toUpperCase();

    // 2. Validate required fields
    if (!registerNumber) {
      issues.push("Missing Register Number");
    }
    
    if (!name) {
      issues.push("Missing Name");
    }

    if (!branch) {
      issues.push("Missing Branch");
      missingBranchCount++;
    }

    // 3. Validate uniqueness
    if (registerNumber) {
      const regKey = registerNumber.toLowerCase();
      if (seenRegisterNumbers.has(regKey)) {
        issues.push(`Duplicate Register Number: ${registerNumber}`);
        duplicateCount++;
      } else {
        // Only add to seen if it's otherwise valid? No, add it anyway to catch multiple duplicates in the same batch
        seenRegisterNumbers.add(regKey);
      }
    }

    if (issues.length > 0) {
      invalidRows.push({ row, issues });
    } else {
      validStudents.push({
        id: crypto.randomUUID(),
        registerNumber,
        name,
        branch,
      });
    }
  });

  return {
    validStudents,
    invalidRows,
    duplicateCount,
    missingBranchCount,
  };
}
