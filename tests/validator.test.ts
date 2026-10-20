import { describe, expect, it } from 'vitest';
import { validateSeatingCapacity } from '../src/algorithms/capacityValidator';
import { validateArrangementConflicts } from '../src/algorithms/validator';
import { validateStudentData } from '../src/import/studentValidator';
import { selectExamStudents } from '../src/utils/examStudentSelector';

describe('Capacity and validation engine', () => {
  it('reports insufficient capacity when student count exceeds available seats', () => {
    const classrooms = [
      { id: 'room-1', name: 'Room 1', rows: 2, columns: 2, studentsPerBench: 1, disabledSeats: [], usableCapacity: 3 },
      { id: 'room-2', name: 'Room 2', rows: 2, columns: 2, studentsPerBench: 1, disabledSeats: [], usableCapacity: 2 },
    ];

    const students = Array.from({ length: 6 }, (_, index) => ({
      id: `student-${index + 1}`,
      registerNumber: `CS${String(index + 1).padStart(2, '0')}`,
      name: `Student ${index + 1}`,
      branch: 'CS',
    }));

    const result = validateSeatingCapacity(classrooms, students);

    expect(result.status).toBe('INSUFFICIENT');
    expect(result.totalAvailableSeats).toBe(5);
    expect(result.totalValidStudents).toBe(6);
    expect(result.shortageCount).toBe(1);
    expect(result.capacityDifference).toBe(-1);
  });

  it('flags duplicate register numbers and missing branches', () => {
    const rawRows = [
      { 'Register No': 'CS101', Name: 'Alice', Branch: 'CS' },
      { 'Register No': 'CS101', Name: 'Alice Duplicate', Branch: 'CS' },
      { 'Register No': 'EC202', Name: 'Bob', Branch: '' },
      { 'Register No': 'ME303', Name: 'Charlie', Branch: 'ME' },
    ];

    const result = validateStudentData(rawRows, {
      registerNumber: 'Register No',
      name: 'Name',
      branch: 'Branch',
    });

    expect(result.validStudents).toHaveLength(2);
    expect(result.invalidRows).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.missingBranchCount).toBe(1);
    expect(result.invalidRows[0].issues).toContain('Duplicate Register Number: CS101');
    expect(result.invalidRows[1].issues).toContain('Missing Branch');
  });

  it('filters exam students by selected semester and subject code', () => {
    const students = [
      { id: 'a', registerNumber: 'A1', name: 'A', branch: 'CS', semester: 'S5', subjectCode: 'CS501' },
      { id: 'b', registerNumber: 'B1', name: 'B', branch: 'EC', semester: 'S5', subjectCode: 'EC501' },
      { id: 'c', registerNumber: 'C1', name: 'C', branch: 'ME', semester: 'S3', subjectCode: 'CS501' },
    ];
    const exam = {
      examName: 'Internal',
      examDate: '2026-10-01',
      session: 'FN' as const,
      selectedSemesters: ['S5'],
      selectedSubjectCodes: ['CS501'],
      institutionName: 'College',
      institutionLocation: 'City',
      documentCode: 'DOC',
    };

    expect(selectExamStudents(students, exam).map((student) => student.id)).toEqual(['a']);
  });

  it('detects matching semester and subject code between adjacent students', () => {
    const students = [
      { id: 'a', registerNumber: 'A1', name: 'A', branch: 'CS', semester: 'S5', subjectCode: 'CS501' },
      { id: 'b', registerNumber: 'B1', name: 'B', branch: 'EC', semester: 'S5', subjectCode: 'CS501' },
    ];
    const classrooms = [{ id: 'room', name: 'Room', rows: 1, columns: 2, studentsPerBench: 1, disabledSeats: [] }];
    const assignments = [
      { classroomId: 'room', row: 0, column: 0, seatIndex: 0, studentId: 'a' },
      { classroomId: 'room', row: 0, column: 1, seatIndex: 0, studentId: 'b' },
    ];
    const rules = {
      sameBenchSeparation: false,
      horizontalAdjacency: true,
      verticalAdjacency: false,
      diagonalAdjacency: false,
      sameSemesterSeparation: true,
      sameSubjectCodeSeparation: true,
    };

    const conflicts = validateArrangementConflicts(assignments, students, classrooms, rules);
    expect(conflicts.map((conflict) => conflict.reason)).toEqual(['semester', 'subjectCode']);
  });
});
