import type { SeatingRules } from '../models/arrangement';
import type { Classroom, SeatPosition } from '../models/classroom';

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

export function buildSeatGraph(classroom: Classroom, rules: SeatingRules): SeatGraph {
  const nodes: SeatNode[] = [];
  const adjacency: Record<string, string[]> = {};

  for (let row = 0; row < classroom.rows; row += 1) {
    for (let column = 0; column < classroom.columns; column += 1) {
      for (let seatIndex = 0; seatIndex < classroom.studentsPerBench; seatIndex += 1) {
        const seat = { row, column, seatIndex };
        const key = getSeatKey(seat);

        const isDisabled = classroom.disabledSeats.some(
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

    if (rules.sameBenchSeparation && classroom.studentsPerBench > 1) {
      const benchPartner = seatIndex === 0 ? 1 : 0;
      addNeighbor(row, column, benchPartner);
    }

    if (rules.horizontalAdjacency) {
      if (column + 1 < classroom.columns) {
        addNeighbor(row, column + 1, seatIndex);
      }
      if (column - 1 >= 0) {
        addNeighbor(row, column - 1, seatIndex);
      }
    }

    if (rules.verticalAdjacency) {
      if (row + 1 < classroom.rows) {
        addNeighbor(row + 1, column, seatIndex);
      }
      if (row - 1 >= 0) {
        addNeighbor(row - 1, column, seatIndex);
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

        if (targetRow >= 0 && targetRow < classroom.rows && targetColumn >= 0 && targetColumn < classroom.columns) {
          addNeighbor(targetRow, targetColumn, seatIndex);
        }
      });
    }
  });

  return { nodes, adjacency };
}
