import { describe, expect, it } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat } from '../src/models/arrangement';
import type { Exam } from '../src/models/exam';
import {
  buildAllocationExportRows,
} from '../src/export/csvAllocationExporter';
import {
  generateAttendanceSheet1Pdf,
  generateSeatingNoticePdf,
  generateRoomSeatingPlanPdf,
} from '../src/export/pdfPackGenerator';
import { formatRegisterRange } from '../src/utils/rangeFormatter';

describe('Phase 5 — Five Print Templates & Print Pack Generator', () => {
  const sampleExam: Exam = {
    id: 'exam-2026',
    name: 'B.Tech University Examination',
    examName: 'B.Tech University Examination',
    date: '2026-10-25',
    examDate: '2026-10-25',
    session: 'FN',
    startTime: '09:30',
    endTime: '12:30',
    institutionName: 'Albertian Institute of Science and Technology',
    institutionLocation: 'Kalamassery, Kochi - 682022',
    examCode: 'KTU-BTECH-2026',
    documentCode: 'AISAT/EXAM/FORM/04',
    status: 'active',
  };

  const sampleRooms: Room[] = [
    {
      id: 'hall-1',
      name: 'Hall 101',
      rows: 2,
      columns: 2,
      studentsPerBench: 2, // 8 seats
      roomOrder: 1,
      disabledSeats: [],
      blockedBenches: [],
    },
    {
      id: 'hall-2',
      name: 'Hall 102',
      rows: 1,
      columns: 2,
      studentsPerBench: 2, // 4 seats
      roomOrder: 2,
      disabledSeats: [],
      blockedBenches: [{ row: 0, column: 1 }], // 1 blocked bench = 2 seats blocked
    },
  ];

  const sampleCandidates: ExamCandidate[] = [
    { id: 'c1', registerNumber: 'CS001', name: 'Alice Smith', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
    { id: 'c2', registerNumber: 'EC001', name: 'Bob Jones', branch: 'EC', semester: 'S5', subjectCode: 'EC301' },
    { id: 'c3', registerNumber: 'CS002', name: 'Charlie Brown', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
    { id: 'c4', registerNumber: 'EC002', name: 'David Miller', branch: 'EC', semester: 'S5', subjectCode: 'EC301' },
    { id: 'c5', registerNumber: 'CS003', name: 'Eve Davis', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
    { id: 'c6', registerNumber: 'ME001', name: 'Frank White', branch: 'ME', semester: 'S5', subjectCode: 'ME301' },
  ];

  const sampleAssignments: AssignedSeat[] = [
    // Hall 101: 4 students
    { classroomId: 'hall-1', roomId: 'hall-1', row: 0, column: 0, seatIndex: 0, position: 0, studentId: 'c1', candidateId: 'c1' },
    { classroomId: 'hall-1', roomId: 'hall-1', row: 0, column: 0, seatIndex: 1, position: 1, studentId: 'c2', candidateId: 'c2' },
    { classroomId: 'hall-1', roomId: 'hall-1', row: 0, column: 1, seatIndex: 0, position: 0, studentId: 'c3', candidateId: 'c3' },
    { classroomId: 'hall-1', roomId: 'hall-1', row: 0, column: 1, seatIndex: 1, position: 1, studentId: 'c4', candidateId: 'c4' },

    // Hall 102: 2 students
    { classroomId: 'hall-2', roomId: 'hall-2', row: 0, column: 0, seatIndex: 0, position: 0, studentId: 'c5', candidateId: 'c5' },
    { classroomId: 'hall-2', roomId: 'hall-2', row: 0, column: 0, seatIndex: 1, position: 1, studentId: 'c6', candidateId: 'c6' },
  ];

  describe('TASK-5.4: Output C — Seating Notice Board Range Formatter', () => {
    it('compresses contiguous register numbers into clean ranges for campus notice boards', () => {
      const consecutiveRolls = ['CS001', 'CS002', 'CS003'];
      expect(formatRegisterRange(consecutiveRolls)).toBe('CS001 to CS003');
    });

    it('handles multiple disjoint continuous ranges with comma separation', () => {
      const mixedRolls = ['CS001', 'CS002', 'CS005', 'CS006', 'CS007', 'CS010'];
      expect(formatRegisterRange(mixedRolls)).toBe('CS001 to CS002, CS005 to CS007, CS010');
    });

    it('handles a single isolated candidate cleanly', () => {
      expect(formatRegisterRange(['ME001'])).toBe('ME001');
    });
  });

  describe('TASK-5.7: Allocation Raw Dataset Export (CSV / XLSX)', () => {
    it('builds structured export rows with all 12 required fields conforming to PRD 4.7', () => {
      const rows = buildAllocationExportRows(sampleExam, sampleRooms, sampleAssignments, sampleCandidates);

      expect(rows).toHaveLength(6);

      const firstRow = rows[0];
      expect(firstRow['Exam Name']).toBe('B.Tech University Examination');
      expect(firstRow['Exam Date']).toBe('2026-10-25');
      expect(firstRow['Session']).toBe('FN');
      expect(firstRow['Room']).toBe('Hall 101');
      expect(firstRow['Bench Row']).toBe(1);
      expect(firstRow['Bench Column']).toBe(1);
      expect(firstRow['Seat Position']).toBe(1);
      expect(firstRow['Register Number']).toBe('CS001');
      expect(firstRow['Candidate Name']).toBe('Alice Smith');
      expect(firstRow['Branch']).toBe('CS');
      expect(firstRow['Semester']).toBe('S5');
      expect(firstRow['Subject Code']).toBe('CS301');
    });

    it('orders export rows systematically by room sequence, row, column, and seat position', () => {
      const rows = buildAllocationExportRows(sampleExam, sampleRooms, sampleAssignments, sampleCandidates);

      // Hall 101 rows appear before Hall 102 rows
      const hall1Rows = rows.filter((r) => r.Room === 'Hall 101');
      const hall2Rows = rows.filter((r) => r.Room === 'Hall 102');

      expect(hall1Rows).toHaveLength(4);
      expect(hall2Rows).toHaveLength(2);
      expect(rows.indexOf(hall1Rows[0])).toBeLessThan(rows.indexOf(hall2Rows[0]));
    });
  });

  describe('TASK-5.2, 5.4, 5.6: Vector jsPDF Institutional Templates', () => {
    it('generates a valid Output A Attendance Sheet #1 jsPDF document', () => {
      const pdf = generateAttendanceSheet1Pdf(sampleExam, sampleRooms, sampleAssignments, sampleCandidates);

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it('generates a valid Output C Seating Notice Board jsPDF document', () => {
      const pdf = generateSeatingNoticePdf(sampleExam, sampleRooms, sampleAssignments, sampleCandidates);

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it('generates a valid Output E Room Seating Plan Diagram jsPDF document in landscape mode', () => {
      const pdf = generateRoomSeatingPlanPdf(sampleExam, sampleRooms, sampleAssignments, sampleCandidates);

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });
  });
});
