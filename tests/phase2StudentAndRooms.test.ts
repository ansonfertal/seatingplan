import { describe, expect, it } from 'vitest';
import {
  validateStudentData,
  generateErrorReportCSV,
} from '../src/import/studentValidator';
import {
  calculateTheoreticalCapacity,
  calculateEffectiveCapacity,
  validateRoomCapacity,
  type Room,
} from '../src/models/classroom';

describe('Phase 2 — Student Import & Room Configuration', () => {
  describe('TASK-2.1 & TASK-2.3: Candidate Data Normalization & Leading Zeros Preservation', () => {
    it('preserves leading zeros in register numbers verbatim as strings', () => {
      const rawRows = [
        { 'Reg No': '0042', Name: 'Alice Smith', Branch: 'CS', Semester: 'S5', Subject: 'CS301' },
        { 'Reg No': '00007', Name: 'James Bond', Branch: 'EC', Semester: 'S5', Subject: 'EC301' },
      ];

      const report = validateStudentData(rawRows, {
        registerNumber: 'Reg No',
        name: 'Name',
        branch: 'Branch',
        semester: 'Semester',
        subjectCode: 'Subject',
      });

      expect(report.validStudents).toHaveLength(2);
      expect(report.validStudents[0].registerNumber).toBe('0042');
      expect(report.validStudents[1].registerNumber).toBe('00007');
      expect(typeof report.validStudents[0].registerNumber).toBe('string');
    });

    it('trims whitespace and preserves candidate name and branch display', () => {
      const rawRows = [
        { 'Reg No': '  CS101  ', Name: '  John Doe  ', Branch: '  cs  ', Semester: '  s5 ', Subject: ' cs301 ' },
      ];

      const report = validateStudentData(rawRows, {
        registerNumber: 'Reg No',
        name: 'Name',
        branch: 'Branch',
        semester: 'Semester',
        subjectCode: 'Subject',
      });

      expect(report.validStudents).toHaveLength(1);
      const student = report.validStudents[0];
      expect(student.registerNumber).toBe('CS101');
      expect(student.name).toBe('John Doe');
      expect(student.branch).toBe('cs');
      expect(student.semester).toBe('s5');
      expect(student.subjectCode).toBe('cs301');
    });
  });

  describe('TASK-2.3: Duplicate Policies & Mandatory Column Checks', () => {
    const rawBatchWithDuplicates = [
      { 'Reg No': 'CS100', Name: 'Alice Original', Branch: 'CS', Semester: 'S5', Subject: 'CS301' },
      { 'Reg No': 'CS100', Name: 'Alice Duplicate', Branch: 'CS', Semester: 'S5', Subject: 'CS301' },
      { 'Reg No': 'EC200', Name: 'Bob Regular', Branch: 'EC', Semester: 'S5', Subject: 'EC301' },
    ];

    it('rejects duplicate register numbers under "reject" policy', () => {
      const report = validateStudentData(
        rawBatchWithDuplicates,
        {
          registerNumber: 'Reg No',
          name: 'Name',
          branch: 'Branch',
          semester: 'Semester',
          subjectCode: 'Subject',
        },
        [],
        'reject'
      );

      expect(report.duplicateCount).toBe(1);
      expect(report.invalidRows).toHaveLength(1);
      expect(report.invalidRows[0].issues).toContain('Duplicate Register Number: CS100');
      expect(report.validStudents).toHaveLength(2);
    });

    it('keeps first occurrence and skips duplicates under "keepFirst" policy', () => {
      const report = validateStudentData(
        rawBatchWithDuplicates,
        {
          registerNumber: 'Reg No',
          name: 'Name',
          branch: 'Branch',
          semester: 'Semester',
          subjectCode: 'Subject',
        },
        [],
        'keepFirst'
      );

      expect(report.duplicateCount).toBe(1);
      expect(report.invalidRows).toHaveLength(0);
      expect(report.validStudents).toHaveLength(2);
      expect(report.validStudents[0].name).toBe('Alice Original');
    });

    it('overwrites previous record under "overwrite" policy', () => {
      const report = validateStudentData(
        rawBatchWithDuplicates,
        {
          registerNumber: 'Reg No',
          name: 'Name',
          branch: 'Branch',
          semester: 'Semester',
          subjectCode: 'Subject',
        },
        [],
        'overwrite'
      );

      expect(report.duplicateCount).toBe(1);
      expect(report.validStudents).toHaveLength(2);
      const student = report.validStudents.find((s) => s.registerNumber === 'CS100');
      expect(student?.name).toBe('Alice Duplicate');
    });

    it('flags missing mandatory columns (Name, Branch, Semester, Subject)', () => {
      const flawedRows = [
        { 'Reg No': '', Name: 'No Reg', Branch: 'CS', Semester: 'S5', Subject: 'CS301' },
        { 'Reg No': 'CS102', Name: '', Branch: 'CS', Semester: 'S5', Subject: 'CS301' },
        { 'Reg No': 'CS103', Name: 'No Branch', Branch: '', Semester: 'S5', Subject: 'CS301' },
        { 'Reg No': 'CS104', Name: 'No Semester', Branch: 'CS', Semester: '', Subject: 'CS301' },
        { 'Reg No': 'CS105', Name: 'No Subject', Branch: 'CS', Semester: 'S5', Subject: '' },
      ];

      const report = validateStudentData(flawedRows, {
        registerNumber: 'Reg No',
        name: 'Name',
        branch: 'Branch',
        semester: 'Semester',
        subjectCode: 'Subject',
      });

      expect(report.invalidRows).toHaveLength(5);
      expect(report.invalidRows[0].issues).toContain('Missing Register Number');
      expect(report.invalidRows[1].issues).toContain('Missing Candidate Name');
      expect(report.invalidRows[2].issues).toContain('Missing Branch');
      expect(report.invalidRows[3].issues).toContain('Missing Semester');
      expect(report.invalidRows[4].issues).toContain('Missing Subject Code');
    });

    it('generates a valid CSV error report containing row numbers and issues', () => {
      const flawedRows = [
        { 'Reg No': 'CS102', Name: '', Branch: 'CS', Semester: 'S5', Subject: 'CS301' },
      ];

      const report = validateStudentData(flawedRows, {
        registerNumber: 'Reg No',
        name: 'Name',
        branch: 'Branch',
        semester: 'Semester',
        subjectCode: 'Subject',
      });

      const csv = generateErrorReportCSV(report.invalidRows);
      expect(csv).toContain('Row Number,Register Number,Name,Branch,Semester,Subject Code,Issues');
      expect(csv).toContain('1,"CS102"');
      expect(csv).toContain('Missing Candidate Name');
    });
  });

  describe('TASK-2.5 & TASK-2.6: Room Configuration & Bench Grid 1–3 Occupancy', () => {
    it('supports 1, 2, and 3 students per bench', () => {
      const singleBenchRoom: Room = {
        id: 'r1',
        name: 'Single Room',
        rows: 5,
        columns: 4,
        studentsPerBench: 1,
        disabledSeats: [],
      };
      expect(calculateTheoreticalCapacity(5, 4, 1)).toBe(20);
      expect(calculateEffectiveCapacity(singleBenchRoom)).toBe(20);

      const doubleBenchRoom: Room = {
        id: 'r2',
        name: 'Pair Room',
        rows: 5,
        columns: 4,
        studentsPerBench: 2,
        disabledSeats: [],
      };
      expect(calculateTheoreticalCapacity(5, 4, 2)).toBe(40);
      expect(calculateEffectiveCapacity(doubleBenchRoom)).toBe(40);

      const tripleBenchRoom: Room = {
        id: 'r3',
        name: 'Triple Room',
        rows: 5,
        columns: 4,
        studentsPerBench: 3,
        disabledSeats: [],
      };
      expect(calculateTheoreticalCapacity(5, 4, 3)).toBe(60);
      expect(calculateEffectiveCapacity(tripleBenchRoom)).toBe(60);
    });

    it('deducts blocked benches and disabled seats from effective capacity', () => {
      const room: Room = {
        id: 'r-blocked',
        name: 'Exam Hall B',
        rows: 6,
        columns: 5,
        studentsPerBench: 2, // Theoretical = 60
        disabledSeats: [
          { row: 1, column: 1, seatIndex: 0 },
          { row: 1, column: 2, seatIndex: 1 },
        ], // 2 individual disabled seats
        blockedBenches: [{ row: 6, column: 5 }], // 1 blocked bench * 2 = 2 seats
      };

      // 60 - 2 - 2 = 56
      expect(calculateEffectiveCapacity(room)).toBe(56);
    });

    it('enforces that configured max capacity cannot exceed physical effective capacity', () => {
      const validConfig: Room = {
        id: 'r-valid',
        name: 'Room 201',
        rows: 5,
        columns: 5,
        studentsPerBench: 2, // Physical = 50
        disabledSeats: [],
        maxCapacity: 45, // 45 <= 50: allowed
      };
      expect(validateRoomCapacity(validConfig).isValid).toBe(true);

      const invalidConfig: Room = {
        id: 'r-invalid',
        name: 'Room 202',
        rows: 5,
        columns: 5,
        studentsPerBench: 2, // Physical = 50
        disabledSeats: [{ row: 1, column: 1, seatIndex: 0 }], // Effective = 49
        maxCapacity: 55, // 55 > 49: prohibited!
      };
      const check = validateRoomCapacity(invalidConfig);
      expect(check.isValid).toBe(false);
      expect(check.error).toContain('cannot exceed effective physical capacity');
    });

    it('allows increasing rows beyond 5 and columns beyond 5 without any artificial 30-student limit', () => {
      // 10 rows x 8 cols x 2 students/bench = 160 seats
      const largeRoom: Room = {
        id: 'r-large',
        name: 'Main Auditorium',
        rows: 10,
        columns: 8,
        studentsPerBench: 2,
        disabledSeats: [],
      };
      expect(calculateTheoreticalCapacity(10, 8, 2)).toBe(160);
      expect(calculateEffectiveCapacity(largeRoom)).toBe(160);
      expect(validateRoomCapacity(largeRoom).isValid).toBe(true);

      // Even larger auditorium: 25 rows x 12 cols x 2 students/bench = 600 seats
      const megaHall: Room = {
        id: 'r-mega',
        name: 'Mega Exam Hall',
        rows: 25,
        columns: 12,
        studentsPerBench: 2,
        disabledSeats: [],
      };
      expect(calculateTheoreticalCapacity(25, 12, 2)).toBe(600);
      expect(calculateEffectiveCapacity(megaHall)).toBe(600);
      expect(validateRoomCapacity(megaHall).isValid).toBe(true);
    });
  });
});
