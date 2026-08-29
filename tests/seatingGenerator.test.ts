import { describe, expect, it } from 'vitest';
import { generateInitialSeating } from '../src/algorithms/seatingGenerator';
import { validateArrangementConflicts } from '../src/algorithms/validator';
import type { Classroom } from '../src/models/classroom';
import type { Student } from '../src/models/student';

const classroomFactory = (overrides: Partial<Classroom> = {}): Classroom => ({
  id: overrides.id ?? 'room-1',
  name: overrides.name ?? 'Room 1',
  rows: overrides.rows ?? 2,
  columns: overrides.columns ?? 2,
  studentsPerBench: overrides.studentsPerBench ?? 1,
  disabledSeats: overrides.disabledSeats ?? [],
  usableCapacity: overrides.usableCapacity ?? 4,
});

const students: Student[] = [
  { id: 's1', registerNumber: 'CS01', name: 'Alice', branch: 'CSE' },
  { id: 's2', registerNumber: 'CS02', name: 'Bob', branch: 'CSE' },
  { id: 's3', registerNumber: 'EC01', name: 'Cathy', branch: 'ECE' },
  { id: 's4', registerNumber: 'EC02', name: 'David', branch: 'ECE' },
  { id: 's5', registerNumber: 'ME01', name: 'Eva', branch: 'ME' },
  { id: 's6', registerNumber: 'ME02', name: 'Frank', branch: 'ME' },
];

describe('Seating generator', () => {
  it('assigns all students to seats without duplicates', () => {
    const classrooms = [
      classroomFactory({ id: 'room-1', name: 'Room 1', rows: 2, columns: 3, usableCapacity: 6 }),
    ];

    const assignments = generateInitialSeating(students, classrooms, {
      sameBenchSeparation: true,
      horizontalAdjacency: true,
      verticalAdjacency: true,
      diagonalAdjacency: false,
    }, 'phase15-seed');

    expect(assignments).toHaveLength(students.length);
    expect(new Set(assignments.map((assignment) => assignment.studentId)).size).toBe(students.length);
    expect(new Set(assignments.map((assignment) => `${assignment.classroomId}:${assignment.row}:${assignment.column}:${assignment.seatIndex}`)).size).toBe(students.length);
  });

  it('produces a deterministic arrangement for a fixed seed', () => {
    const classrooms = [
      classroomFactory({ id: 'room-1', name: 'Room 1', rows: 2, columns: 4, usableCapacity: 8 }),
      classroomFactory({ id: 'room-2', name: 'Room 2', rows: 2, columns: 4, usableCapacity: 8 }),
    ];

    const first = generateInitialSeating(students, classrooms, {
      sameBenchSeparation: true,
      horizontalAdjacency: true,
      verticalAdjacency: true,
      diagonalAdjacency: false,
    }, 'fixed-seed');

    const second = generateInitialSeating(students, classrooms, {
      sameBenchSeparation: true,
      horizontalAdjacency: true,
      verticalAdjacency: true,
      diagonalAdjacency: false,
    }, 'fixed-seed');

    expect(first).toEqual(second);
  });

  it('keeps conflict counts low or zero for feasible input', () => {
    const classrooms = [
      classroomFactory({ id: 'room-1', name: 'Room 1', rows: 2, columns: 3, usableCapacity: 6 }),
      classroomFactory({ id: 'room-2', name: 'Room 2', rows: 2, columns: 3, usableCapacity: 6 }),
    ];

    const assignments = generateInitialSeating(students, classrooms, {
      sameBenchSeparation: true,
      horizontalAdjacency: true,
      verticalAdjacency: true,
      diagonalAdjacency: false,
    }, 'phase15-optimization');

    const conflicts = validateArrangementConflicts(assignments, students, classrooms, {
      sameBenchSeparation: true,
      horizontalAdjacency: true,
      verticalAdjacency: true,
      diagonalAdjacency: false,
    });

    expect(conflicts.length).toBeLessThanOrEqual(4);
  });
});
