import { DEFAULT_SEATING_RULES, type SeatingRules } from '../models/arrangement';
import type { Classroom, SeatPosition } from '../models/classroom';
import { getClassroomColumnRows } from '../utils/capacityCalculator';

export type SeatNode = {
  key: string;
  classroomId: string;
  row: number;
  column: number;
  seatIndex: number;
};

export type SeatGraph = {
  nodes: SeatNode[];
  adjacency: Record<string, string[]>;
};

export function getSeatKey(seat: SeatPosition): string {
  return `${seat.row}-${seat.column}-${seat.seatIndex}`;
}

export function buildSeatGraph(classroom: Classroom, rules: SeatingRules = DEFAULT_SEATING_RULES): SeatGraph {
  const nodes: SeatNode[] = [];
  const adjacency: Record<string, string[]> = {};

  const columnRows = getClassroomColumnRows(classroom.rows, classroom.columns, classroom.columnRows);
  const blockedBenches = classroom.blockedBenches || [];

  const perBench = classroom.studentsPerBench ?? (classroom as unknown as { benchCapacity?: number }).benchCapacity ?? 2;

  const maxRows = Math.max(classroom.rows, ...columnRows);
  for (let row = 0; row < maxRows; row += 1) {
    for (let column = 0; column < classroom.columns; column += 1) {
      if (row >= columnRows[column]) continue;

      // Skip fully blocked benches
      const isBenchBlocked = blockedBenches.some((b) => b.row === row && b.column === column);
      if (isBenchBlocked) continue;

      for (let seatIndex = 0; seatIndex < perBench; seatIndex += 1) {
        const seat = { row, column, seatIndex };
        const key = getSeatKey(seat);

        const disabledSeats = classroom.disabledSeats || [];
        const isDisabled = disabledSeats.some(
          (disabledSeat) =>
            disabledSeat.row === seat.row &&
            disabledSeat.column === seat.column &&
            disabledSeat.seatIndex === seat.seatIndex
        );

        if (isDisabled) {
          continue;
        }

        nodes.push({
          key,
          classroomId: classroom.id,
          row,
          column,
          seatIndex,
        });

        adjacency[key] = [];
      }
    }
  }

  nodes.forEach((node) => {
    const { row, column, seatIndex } = node;

    const addNeighbor = (targetRow: number, targetColumn: number, targetSeatIndex: number) => {
      const targetKey = getSeatKey({ row: targetRow, column: targetColumn, seatIndex: targetSeatIndex });
      if (adjacency[targetKey] && !adjacency[node.key].includes(targetKey)) {
        adjacency[node.key].push(targetKey);
      }
    };

    // Pairwise same-bench partners (supports 1, 2, or 3 students per bench)
    if (rules.sameBenchSeparation && perBench > 1) {
      for (let partnerIdx = 0; partnerIdx < perBench; partnerIdx++) {
        if (partnerIdx !== seatIndex) {
          addNeighbor(row, column, partnerIdx);
        }
      }
    }

    const addBenchNeighbors = (targetRow: number, targetColumn: number) => {
      for (let s = 0; s < perBench; s++) {
        addNeighbor(targetRow, targetColumn, s);
      }
    };

    if (rules.horizontalAdjacency) {
      if (column + 1 < classroom.columns) {
        addBenchNeighbors(row, column + 1);
      }
      if (column - 1 >= 0) {
        addBenchNeighbors(row, column - 1);
      }
    }

    if (rules.verticalAdjacency) {
      if (row + 1 < columnRows[column]) {
        addBenchNeighbors(row + 1, column);
      }
      if (row - 1 >= 0) {
        addBenchNeighbors(row - 1, column);
      }
    }

    if (rules.diagonalAdjacency) {
      const diagonalOffsets = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];

      diagonalOffsets.forEach(([rowOffset, columnOffset]) => {
        const targetRow = row + rowOffset;
        const targetColumn = column + columnOffset;

        if (targetRow >= 0 && targetColumn >= 0 && targetColumn < classroom.columns && targetRow < columnRows[targetColumn]) {
          addBenchNeighbors(targetRow, targetColumn);
        }
      });
    }
  });

  return { nodes, adjacency };
}
