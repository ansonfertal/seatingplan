import { describe, expect, it } from 'vitest';
import { validateSeatingCapacity } from '../src/algorithms/capacityValidator';
import { validateStudentData } from '../src/import/studentValidator';

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
});
