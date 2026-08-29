export type SeatPosition = {
  row: number;
  column: number;
  seatIndex: number;
};

export type Classroom = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  studentsPerBench: number;
  disabledSeats: SeatPosition[];
  usableCapacity?: number;
};

export type SeatAvailabilityStatus = 'Available' | 'Disabled';
