import { describe, expect, it } from 'vitest';
import { buildSeatGraph } from '../src/algorithms/seatGraph';
import { validateSeatingCapacity } from '../src/algorithms/capacityValidator';

describe('Edge-case verification', () => {
  it('reports a shortage warning when the single-branch dataset exceeds capacity', () => {
    const classrooms = [
      { id: 'room-1', name: 'Room 1', rows: 2, columns: 2, studentsPerBench: 1, disabledSeats: [], usableCapacity: 4 },
      { id: 'room-2', name: 'Room 2', rows: 2, columns: 2, studentsPerBench: 1, disabledSeats: [], usableCapacity: 4 },
    ];

    const students = Array.from({ length: 10 }, (_, index) => ({
      id: `student-${index + 1}`,
      registerNumber: `CS${String(index + 1).padStart(2, '0')}`,
      name: `Student ${index + 1}`,
      branch: 'CS',
    }));

    const result = validateSeatingCapacity(classrooms, students);

    expect(result.status).toBe('INSUFFICIENT');
    expect(result.shortageCount).toBe(2);
    expect(result.totalAvailableSeats).toBe(8);
  });

  it('omits disabled seats from the graph and keeps adjacency only for active bench partners', () => {
    const classroom = {
      id: 'bench-room',
      name: 'Bench Room',
      rows: 1,
      columns: 2,
      studentsPerBench: 2,
      disabledSeats: [{ row: 0, column: 0, seatIndex: 1 }],
      usableCapacity: 3,
    };

    const graph = buildSeatGraph(classroom, {
      sameBenchSeparation: true,
      horizontalAdjacency: true,
      verticalAdjacency: false,
      diagonalAdjacency: false,
    });

    const occupiedSeats = graph.nodes.map((node) => node.key);
    expect(occupiedSeats).not.toContain('0-0-1');
    expect(graph.adjacency['0-0-0'] ?? []).not.toContain('0-0-1');
    expect(graph.adjacency['0-1-0']).toContain('0-1-1');
    expect(graph.adjacency['0-1-1']).toContain('0-1-0');
  });
});
