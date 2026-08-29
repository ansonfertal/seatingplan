import { describe, expect, it } from 'vitest';
import { createExcelWorkbook } from '../src/export/excelExporter';
import { formatRegisterRange } from '../src/utils/rangeFormatter';

describe('Excel export structure and roll ranges', () => {
  it('formats continuous and non-contiguous register ranges correctly', () => {
    expect(formatRegisterRange(['CS01', 'CS02', 'CS03'])).toBe('CS01 to CS03');
    expect(formatRegisterRange(['CS01', 'CS02', 'CS03', 'CS05', 'CS07', 'CS08', 'CS10', 'CS11', 'CS12'])).toBe(
      'CS01 to CS03, CS05, CS07 to CS08, CS10 to CS12'
    );
  });

  it('creates a workbook with three populated sheets', () => {
    const exam = {
      examName: 'Semester Exam',
      examDate: '2025-04-20',
      session: 'FN',
      startTime: '09:00',
      endTime: '12:00',
      academicYear: '2025',
      semester: 'S1',
      institutionName: 'Albertian Institute of Science and Technology',
      institutionLocation: 'Kalamassery',
      examCode: 'EXM-101',
      documentCode: 'AISAT/Form/QPM17/F4',
    } as any;

    const classrooms = [
      { id: 'room-1', name: 'Room 1', rows: 2, columns: 2, studentsPerBench: 1, disabledSeats: [] },
      { id: 'room-2', name: 'Room 2', rows: 2, columns: 2, studentsPerBench: 1, disabledSeats: [] },
    ];

    const students = [
      { id: 's1', registerNumber: 'CS01', name: 'Alice', branch: 'CS' },
      { id: 's2', registerNumber: 'CS02', name: 'Bob', branch: 'CS' },
      { id: 's3', registerNumber: 'EC01', name: 'Cathy', branch: 'EC' },
      { id: 's4', registerNumber: 'EC02', name: 'David', branch: 'EC' },
    ];

    const arrangement = {
      exam,
      classrooms,
      assignments: [
        { classroomId: 'room-1', row: 0, column: 0, seatIndex: 0, studentId: 's1' },
        { classroomId: 'room-1', row: 0, column: 1, seatIndex: 0, studentId: 's2' },
        { classroomId: 'room-2', row: 0, column: 0, seatIndex: 0, studentId: 's3' },
        { classroomId: 'room-2', row: 0, column: 1, seatIndex: 0, studentId: 's4' },
      ],
      generatedAt: new Date().toISOString(),
      generationSeed: 1,
      statistics: {
        totalStudents: 4,
        assignedStudents: 4,
        unassignedStudents: 0,
        totalAvailableSeats: 8,
        unusedSeats: 4,
        totalConflicts: 0,
        qualityScore: 100,
      },
    } as any;

    const workbook = createExcelWorkbook(arrangement, students, classrooms);

    expect(workbook.workbook.SheetNames).toHaveLength(3);
    expect(workbook.workbook.SheetNames).toEqual(['Seating Arrangement', 'rooms', 'Attendance sheet']);

    workbook.workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.workbook.Sheets[sheetName];
      expect(Object.keys(sheet).length).toBeGreaterThan(0);
    });
  });
});
