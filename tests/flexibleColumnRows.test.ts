import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  calculateEffectiveCapacity,
  calculateTheoreticalCapacity,
  validateRoomCapacity,
  type Classroom,
  type Room,
} from '../src/models/classroom';
import { buildSeatGraph } from '../src/algorithms/seatGraph';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';
import { RoomSeatingPlanSheet } from '../src/export/templates/RoomSeatingPlanSheet';
import { DEFAULT_SEATING_RULES } from '../src/models/arrangement';
import type { Exam } from '../src/models/exam';
import type { Student } from '../src/models/student';

describe('Flexible Per-Column Bench & Row Configuration', () => {
  const sampleExam: Exam = {
    id: 'exam-flex-test',
    name: 'End Semester Exam',
    examName: 'End Semester Exam',
    date: '2026-11-10',
    examDate: '2026-11-10',
    session: 'FN',
    startTime: '09:30',
    endTime: '12:30',
    institutionName: 'College of Engineering',
    institutionLocation: 'Campus',
    status: 'active',
  };

  it('correctly calculates physical and effective capacity for asymmetric columns (e.g. 4 rows in Col 1, 8 rows in Col 2)', () => {
    // 2 columns: Column 1 has 4 rows, Column 2 has 8 rows -> Total 12 benches
    // With 2 students per bench -> 24 seats
    const room: Room = {
      id: 'room-asym-4-8',
      name: 'Hall 4x8 Asymmetric',
      rows: 8,
      columns: 2,
      columnRows: [4, 8],
      studentsPerBench: 2,
      disabledSeats: [],
      blockedBenches: [],
      usableCapacity: 24,
    };

    const theoretical = calculateTheoreticalCapacity(room.rows, room.columns, room.studentsPerBench, room.columnRows);
    expect(theoretical).toBe(24);

    const effective = calculateEffectiveCapacity(room);
    expect(effective).toBe(24);

    // Max capacity cannot exceed 24 (even though 8 * 2 * 2 = 32 in a uniform grid)
    const validCheck = validateRoomCapacity({ ...room, maxCapacity: 24 });
    expect(validCheck.isValid).toBe(true);

    const invalidCheck = validateRoomCapacity({ ...room, maxCapacity: 25 });
    expect(invalidCheck.isValid).toBe(false);
    expect(invalidCheck.error).toContain('cannot exceed effective physical capacity (24)');
  });

  it('buildSeatGraph creates exactly 24 seat nodes with correct column-specific row bounds', () => {
    const room: Classroom = {
      id: 'room-asym-4-8',
      name: 'Hall 4x8 Asymmetric',
      rows: 8,
      columns: 2,
      columnRows: [4, 8],
      studentsPerBench: 2,
      disabledSeats: [],
    };

    const graph = buildSeatGraph(room);
    // 4 benches in col 0 * 2 + 8 benches in col 1 * 2 = 8 + 16 = 24 seats
    expect(graph.nodes).toHaveLength(24);

    const col0Seats = graph.nodes.filter((n) => n.column === 0);
    expect(col0Seats).toHaveLength(8);
    const col0MaxRow = Math.max(...col0Seats.map((n) => n.row));
    expect(col0MaxRow).toBe(3); // 0, 1, 2, 3 (4 rows)

    const col1Seats = graph.nodes.filter((n) => n.column === 1);
    expect(col1Seats).toHaveLength(16);
    const col1MaxRow = Math.max(...col1Seats.map((n) => n.row));
    expect(col1MaxRow).toBe(7); // 0..7 (8 rows)
  });

  it('allocates candidates into asymmetric room and passes independent validation', () => {
    const room: Classroom = {
      id: 'room-asym-4-8',
      name: 'Hall 4x8 Asymmetric',
      rows: 8,
      columns: 2,
      columnRows: [4, 8],
      studentsPerBench: 2,
      disabledSeats: [],
      usableCapacity: 24,
    };

    const students: Student[] = Array.from({ length: 24 }, (_, i) => ({
      id: `s-${i + 1}`,
      registerNumber: `CS${String(i + 1).padStart(3, '0')}`,
      name: `Student ${i + 1}`,
      branch: i % 2 === 0 ? 'CSE' : 'ECE',
      semester: 'S5',
      subjectCode: i % 2 === 0 ? 'CS301' : 'EC301',
    }));

    const result = generateConstraintAwareSeating(
      students,
      [room],
      DEFAULT_SEATING_RULES
    );

    expect(result.assignments).toHaveLength(24);

    // Verify all col 0 assignments have row < 4
    const col0Assignments = result.assignments.filter((a) => a.column === 0);
    expect(col0Assignments.every((a) => a.row < 4)).toBe(true);

    // Verify all col 1 assignments have row < 8
    const col1Assignments = result.assignments.filter((a) => a.column === 1);
    expect(col1Assignments.every((a) => a.row < 8)).toBe(true);

    // Independent validator must verify physical validity without errors
    const report = validateSeatingPlanIndependently(result.assignments, students, [room]);
    expect(report.isValid).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('independentValidator flags out-of-bounds row on short column as C5 violation', () => {
    const room: Classroom = {
      id: 'room-asym-4-8',
      name: 'Hall 4x8 Asymmetric',
      rows: 8,
      columns: 2,
      columnRows: [4, 8],
      studentsPerBench: 2,
      disabledSeats: [],
      usableCapacity: 24,
    };

    const student: Student = {
      id: 's-out-of-bounds',
      registerNumber: 'CS999',
      name: 'Student Out Of Bounds',
      branch: 'CSE',
      semester: 'S5',
      subjectCode: 'CS301',
    };

    // Row 5 in Column 0 is illegal because Column 0 only has 4 rows (0..3)
    const illegalAssignment = [
      {
        classroomId: room.id,
        roomId: room.id,
        row: 5,
        column: 0,
        seatIndex: 0,
        position: 0,
        studentId: student.id,
        candidateId: student.id,
      },
    ];

    const report = validateSeatingPlanIndependently(illegalAssignment, [student], [room]);
    expect(report.isValid).toBe(false);
    expect(report.violations.some((v) => v.type === 'C5_INVALID_PHYSICAL_SEAT')).toBe(true);
  });

  it('renders RoomSeatingPlanSheet with "No Bench" markers for rows exceeding short column height', () => {
    const room: Room = {
      id: 'room-asym-4-8',
      name: 'Hall Asymmetric',
      rows: 8,
      columns: 2,
      columnRows: [4, 8],
      studentsPerBench: 2,
      disabledSeats: [],
      usableCapacity: 24,
    };

    const students: Student[] = [
      {
        id: 's-1',
        registerNumber: 'CS001',
        name: 'Student 1',
        branch: 'CSE',
        semester: 'S5',
        subjectCode: 'CS301',
      },
    ];

    const assignments = [
      {
        classroomId: room.id,
        roomId: room.id,
        row: 0,
        column: 0,
        seatIndex: 0,
        position: 0,
        studentId: 's-1',
        candidateId: 's-1',
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(RoomSeatingPlanSheet, {
        exam: sampleExam,
        rooms: [room],
        assignments,
        students,
      })
    );

    // Column 0 rows 4..7 should be rendered with "No Bench"
    expect(html).toContain('No Bench');
    // R1-C1 exists (row 0, col 0)
    expect(html).toContain('R1-C1');
    // R8-C2 exists (row 7, col 1)
    expect(html).toContain('R8-C2');
    // R8-C1 should NOT exist as a bench header because Col 1 only has 4 benches!
    expect(html).not.toContain('R8-C1');
  });
});
