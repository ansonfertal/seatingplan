export type SeatPosition = {
  row: number;
  column: number;
  seatIndex: number;
};

export type BenchPosition = {
  row: number;
  column: number;
};

export type ClassroomDisplayColumn = 'rollNo' | 'name' | 'branch' | 'semester';

/**
 * Room domain model conforming to PRD Section 5.
 * Contains physical bench grid dimensions and capacity constraints.
 */
export type Room = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  /** Row count for each physical column; omitted on regular rectangular rooms. */
  columnRows?: number[];
  /** Number of students per bench: 1, 2, or 3 */
  studentsPerBench: number;
  /** Configured maximum capacity (may be lower than physical capacity, but never higher) */
  maxCapacity?: number;
  /** Sort sequence for filling order (MVP fills in configured room order) */
  roomOrder?: number;
  /** Whether room is active and eligible for allocation */
  active?: boolean;
  displayColumns?: ClassroomDisplayColumn[];
  /** Individual disabled/blocked seats */
  disabledSeats: SeatPosition[];
  /** Fully blocked bench cells */
  blockedBenches?: BenchPosition[];
  /** Calculated effective capacity */
  usableCapacity?: number;
  /** One or more assigned invigilator names for this classroom */
  invigilators?: string[];
};

/** Backward-compatible alias for Room */
export type Classroom = Room;

export type SeatAvailabilityStatus = 'Available' | 'Disabled';

/**
 * Theoretical physical capacity = rows * columns * studentsPerBench
 */
export function calculateTheoreticalCapacity(rows: number, columns: number, studentsPerBench: number): number {
  return Math.max(0, rows * columns * studentsPerBench);
}

/**
 * Effective capacity = theoretical capacity minus blocked bench positions and disabled seats.
 */
export function calculateEffectiveCapacity(room: Room): number {
  const theoretical = calculateTheoreticalCapacity(room.rows, room.columns, room.studentsPerBench);
  const disabledCount = room.disabledSeats?.length || 0;
  const blockedBenchCount = (room.blockedBenches?.length || 0) * room.studentsPerBench;
  const physicalEffective = Math.max(0, theoretical - disabledCount - blockedBenchCount);

  if (room.maxCapacity != null && room.maxCapacity > 0) {
    return Math.min(room.maxCapacity, physicalEffective);
  }
  if (room.usableCapacity != null) {
    return room.usableCapacity;
  }
  return physicalEffective;
}

/**
 * Validates that configured max capacity does not exceed effective physical capacity (PRD Section 4.3).
 */
export function validateRoomCapacity(room: Room): { isValid: boolean; error?: string } {
  const theoretical = calculateTheoreticalCapacity(room.rows, room.columns, room.studentsPerBench);
  const disabledCount = room.disabledSeats?.length || 0;
  const blockedBenchCount = (room.blockedBenches?.length || 0) * room.studentsPerBench;
  const physicalEffective = Math.max(0, theoretical - disabledCount - blockedBenchCount);

  if (room.maxCapacity != null && room.maxCapacity > physicalEffective) {
    return {
      isValid: false,
      error: `Configured maximum capacity (${room.maxCapacity}) cannot exceed effective physical capacity (${physicalEffective})`,
    };
  }

  return { isValid: true };
}
