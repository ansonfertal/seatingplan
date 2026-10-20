import type { Room } from '../models/classroom';
import type { ExamCandidate } from '../models/student';

export type MockCohortSpec = {
  branch: string;
  semester: string;
  subjectCode: string;
  count: number;
  prefix: string;
};

/**
 * Generates synthetic exam candidates across balanced cohorts.
 */
export function generateSyntheticExamCandidates(
  totalCount = 2000,
  cohortSpecs?: MockCohortSpec[]
): ExamCandidate[] {
  const specs: MockCohortSpec[] = cohortSpecs || [
    { branch: 'CS', semester: 'S5', subjectCode: 'CS301', count: Math.floor(totalCount * 0.25), prefix: '22CS' },
    { branch: 'EC', semester: 'S5', subjectCode: 'EC301', count: Math.floor(totalCount * 0.25), prefix: '22EC' },
    { branch: 'ME', semester: 'S5', subjectCode: 'ME301', count: Math.floor(totalCount * 0.25), prefix: '22ME' },
    { branch: 'CE', semester: 'S5', subjectCode: 'CE301', count: totalCount - 3 * Math.floor(totalCount * 0.25), prefix: '22CE' },
  ];

  const candidates: ExamCandidate[] = [];
  const firstNames = ['Aarav', 'Ananya', 'Aditya', 'Diya', 'Kavya', 'Rohan', 'Sneha', 'Rahul', 'Pooja', 'Vikram'];
  const lastNames = ['Nair', 'Menon', 'Kurian', 'Sharma', 'Pillai', 'Verma', 'Patel', 'Iyer', 'George', 'Thomas'];

  let idCounter = 1;

  specs.forEach((spec) => {
    for (let i = 1; i <= spec.count; i++) {
      const regDigits = String(i).padStart(4, '0');
      const registerNumber = `${spec.prefix}${regDigits}`;
      const name = `${firstNames[(idCounter + i) % firstNames.length]} ${lastNames[(idCounter * 3 + i) % lastNames.length]}`;

      candidates.push({
        id: `mock-cand-${idCounter}`,
        examId: 'mock-exam',
        registerNumber,
        name,
        branch: spec.branch,
        semester: spec.semester,
        subjectCode: spec.subjectCode,
        sourceRow: idCounter,
      });

      idCounter++;
    }
  });

  return candidates;
}

/**
 * Generates synthetic examination halls with realistic bench geometries.
 */
export function generateSyntheticRooms(targetCapacity: number, studentsPerBench = 2): Room[] {
  const rooms: Room[] = [];
  let currentCapacity = 0;
  let roomIdx = 1;

  // Hall sizes: 40 seats (5x4), 60 seats (6x5), 80 seats (8x5)
  const hallConfigs = [
    { rows: 5, cols: 4 }, // 20 benches = 40 seats (for 2/bench)
    { rows: 6, cols: 5 }, // 30 benches = 60 seats
    { rows: 8, cols: 5 }, // 40 benches = 80 seats
  ];

  while (currentCapacity < targetCapacity) {
    const config = hallConfigs[(roomIdx - 1) % hallConfigs.length];
    const capacity = config.rows * config.cols * studentsPerBench;

    rooms.push({
      id: `room-gen-${roomIdx}`,
      name: `Hall ${100 + roomIdx}`,
      rows: config.rows,
      columns: config.cols,
      studentsPerBench,
      roomOrder: roomIdx,
      active: true,
      maxCapacity: capacity,
      usableCapacity: capacity,
      disabledSeats: [],
      blockedBenches: [],
    });

    currentCapacity += capacity;
    roomIdx++;
  }

  return rooms;
}
