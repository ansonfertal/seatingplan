import { describe, expect, it } from 'vitest';
import {
  calculateUsableCapacityForClassroom,
  getClassroomColumnRows,
} from '../src/utils/capacityCalculator';
import {
  calculateTheoreticalCapacity,
  calculateEffectiveCapacity,
  validateRoomCapacity,
  type Classroom,
} from '../src/models/classroom';
import { buildSeatGraph } from '../src/algorithms/seatGraph';

describe('Classroom Grid Scaling & Dimension Independence', () => {
  it('allows arbitrary number of rows beyond 5 and columns beyond 5', () => {
    // 12 rows x 7 cols x 2 students/bench = 168 seats
    const room: Classroom = {
      id: 'room-12-7',
      name: 'Lecture Hall 101',
      rows: 12,
      columns: 7,
      studentsPerBench: 2,
      disabledSeats: [],
      usableCapacity: 168,
    };

    expect(room.rows).toBe(12);
    expect(room.columns).toBe(7);
    expect(calculateTheoreticalCapacity(room.rows, room.columns, room.studentsPerBench)).toBe(168);
    expect(calculateEffectiveCapacity(room)).toBe(168);
    expect(validateRoomCapacity(room).isValid).toBe(true);
  });

  it('calculates physical effective capacity for large auditoriums (e.g., 20 rows x 10 columns = 400 seats)', () => {
    const rows = 20;
    const columns = 10;
    const studentsPerBench = 2;
    const columnRows = getClassroomColumnRows(rows, columns, undefined);

    expect(columnRows).toHaveLength(10);
    expect(columnRows.every((r) => r === 20)).toBe(true);

    const capacity = calculateUsableCapacityForClassroom(rows, columns, studentsPerBench, [], columnRows);
    expect(capacity).toBe(400);
  });

  it('updates columnRows when rows is increased beyond previous column counts', () => {
    // Legacy room had 5 rows across 4 columns
    const legacyColumnRows = [5, 5, 5, 5];
    // User updates rows to 9
    const updated = getClassroomColumnRows(9, 4, legacyColumnRows);

    expect(updated).toHaveLength(4);
    expect(updated).toEqual([9, 9, 9, 9]);

    const capacity = calculateUsableCapacityForClassroom(9, 4, 2, [], updated);
    expect(capacity).toBe(72);
  });

  it('buildSeatGraph generates nodes for all rows beyond 5', () => {
    const room: Classroom = {
      id: 'room-large-graph',
      name: 'Science Hall',
      rows: 8,
      columns: 5,
      studentsPerBench: 2,
      disabledSeats: [],
      usableCapacity: 80,
    };

    const graph = buildSeatGraph(room);
    expect(graph.nodes).toHaveLength(80);

    // Verify row 7 (0-indexed for 8 rows) exists
    const row7Seats = graph.nodes.filter((node) => node.row === 7);
    expect(row7Seats).toHaveLength(10); // 5 cols * 2 students = 10 seats
  });

  it('simulates dynamic row and column incrementing on the grid without limit', () => {
    let classroom: Classroom = {
      id: 'r-dyn',
      name: 'Flexible Hall',
      rows: 5,
      columns: 5,
      studentsPerBench: 2,
      disabledSeats: [],
      usableCapacity: 50,
    };

    // Increment rows 5 times: 5 -> 10
    for (let i = 0; i < 5; i++) {
      const nextRows = classroom.rows + 1;
      const nextColumnRows = Array.from({ length: classroom.columns }, () => nextRows);
      const capacity = calculateUsableCapacityForClassroom(
        nextRows,
        classroom.columns,
        classroom.studentsPerBench,
        classroom.disabledSeats,
        nextColumnRows
      );
      classroom = {
        ...classroom,
        rows: nextRows,
        columnRows: nextColumnRows,
        usableCapacity: capacity,
      };
    }

    expect(classroom.rows).toBe(10);
    expect(classroom.usableCapacity).toBe(100);

    // Increment columns 3 times: 5 -> 8
    for (let j = 0; j < 3; j++) {
      const nextCols = classroom.columns + 1;
      const nextColumnRows = Array.from({ length: nextCols }, () => classroom.rows);
      const capacity = calculateUsableCapacityForClassroom(
        classroom.rows,
        nextCols,
        classroom.studentsPerBench,
        classroom.disabledSeats,
        nextColumnRows
      );
      classroom = {
        ...classroom,
        columns: nextCols,
        columnRows: nextColumnRows,
        usableCapacity: capacity,
      };
    }

    expect(classroom.rows).toBe(10);
    expect(classroom.columns).toBe(8);
    expect(classroom.usableCapacity).toBe(160);
  });
});
