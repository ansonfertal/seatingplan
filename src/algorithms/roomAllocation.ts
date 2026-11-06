import type { Classroom, Room } from '../models/classroom';
import { calculateEffectiveCapacity } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';
import { normalizeCode } from '../models/student';
import type { RegisterNumberOrder } from '../models/arrangement';
import { createSeededRandom, shuffle } from './random';

export type RoomFillStrategy = 'sequential' | 'balanced';

export type RoomAllocation = {
  classroomId: string;
  studentIds: string[];
};

export type RoomAllocationResult = {
  allocations: RoomAllocation[];
  roomOccupancy: Record<string, number>;
};

export type RoomAllocationOptions = {
  examDate?: string;
  minimizeClassroomsUsed?: boolean;
  differentArrangementPerDate?: boolean;
  equalStudentDistribution?: boolean;
};

/**
 * Calculates balanced student quotas across classrooms so headcounts are as equal as possible.
 * Satisfies:
 * 1. 0 <= quota_i <= capacity_i for all rooms
 * 2. sum(quotas) == min(totalStudents, sum(capacities))
 * 3. The difference between quotas of any two unconstrained rooms is at most 1.
 */
export function computeEqualRoomQuotas(
  rooms: { id: string; capacity: number }[],
  totalStudents: number
): Map<string, number> {
  const quotas = new Map<string, number>();
  if (rooms.length === 0 || totalStudents <= 0) {
    rooms.forEach((r) => quotas.set(r.id, 0));
    return quotas;
  }

  const totalCap = rooms.reduce((sum, r) => sum + Math.max(0, r.capacity), 0);
  let remainingStudents = Math.min(totalStudents, totalCap);

  // Initialize all quotas to 0
  rooms.forEach((r) => quotas.set(r.id, 0));

  // Filter active rooms with capacity > 0
  let activeRooms = rooms
    .filter((r) => r.capacity > 0)
    .map((r) => ({ id: r.id, capacity: r.capacity }));

  while (remainingStudents > 0 && activeRooms.length > 0) {
    const fairShare = Math.floor(remainingStudents / activeRooms.length);

    // Identify rooms whose remaining capacity is <= fairShare (capacity bottlenecks)
    const bottleneckIndices = activeRooms
      .map((r, idx) => ({ idx, remainingCap: r.capacity - (quotas.get(r.id) || 0) }))
      .filter((x) => x.remainingCap <= fairShare);

    if (bottleneckIndices.length > 0) {
      // Allocate their full remaining capacity and remove from active
      bottleneckIndices.sort((a, b) => a.remainingCap - b.remainingCap);

      const removedIds = new Set<string>();
      for (const b of bottleneckIndices) {
        const room = activeRooms[b.idx];
        const currentQuota = quotas.get(room.id) || 0;
        const roomRemaining = room.capacity - currentQuota;
        quotas.set(room.id, currentQuota + roomRemaining);
        remainingStudents -= roomRemaining;
        removedIds.add(room.id);
      }
      activeRooms = activeRooms.filter((r) => !removedIds.has(r.id));
    } else {
      // All remaining active rooms have room for at least fairShare
      const remainder = remainingStudents % activeRooms.length;
      for (let i = 0; i < activeRooms.length; i++) {
        const room = activeRooms[i];
        const extra = i < remainder ? 1 : 0;
        const currentQuota = quotas.get(room.id) || 0;
        quotas.set(room.id, currentQuota + fairShare + extra);
      }
      remainingStudents = 0;
      break;
    }
  }

  return quotas;
}

export function hashExamDate(dateStr?: string): number {
  if (!dateStr) return 0;
  let hash = 0;
  const clean = String(dateStr).trim();
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash + clean.charCodeAt(i)) | 0;
  }
  // Avalanche 32-bit mix (Murmur3 fmix) so consecutive dates produce uncorrelated bits
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return Math.abs(hash) || 1;
}

/**
 * Selects the minimum subset of classrooms required to accommodate all candidates.
 * If multiple minimal subsets exist and an examDate is provided, rotates between optimal subsets across dates.
 */
export function selectMinimalClassrooms(
  activeRooms: (Classroom | Room)[],
  studentCount: number,
  maxCohortSize: number,
  examDate?: string,
  differentArrangementPerDate = true
): { selectedRoomIds: Set<string>; roomOrderOverride?: string[] } {
  if (activeRooms.length <= 1 || studentCount === 0) {
    return { selectedRoomIds: new Set(activeRooms.map((r) => r.id)) };
  }

  const dateHash = examDate && differentArrangementPerDate ? hashExamDate(examDate) : 0;
  const targetCap = Math.max(studentCount, maxCohortSize);

  // 1. Sort rooms descending by effective capacity
  const sortedByCap = [...activeRooms].sort(
    (a, b) => calculateEffectiveCapacity(b) - calculateEffectiveCapacity(a)
  );

  // Check if all rooms combined cannot meet targetCap
  const totalCap = sortedByCap.reduce((sum, r) => sum + calculateEffectiveCapacity(r), 0);
  if (totalCap <= targetCap) {
    return { selectedRoomIds: new Set(activeRooms.map((r) => r.id)) };
  }

  // 2. Find minimum number of rooms K needed
  let K = activeRooms.length;
  let cumulativeCap = 0;
  for (let i = 0; i < sortedByCap.length; i++) {
    cumulativeCap += calculateEffectiveCapacity(sortedByCap[i]);
    if (cumulativeCap >= targetCap) {
      K = i + 1;
      break;
    }
  }

  // If all rooms are required, return immediately without combinatorial search
  if (K >= activeRooms.length) {
    return { selectedRoomIds: new Set(activeRooms.map((r) => r.id)) };
  }

  // 3. Find subsets of size K that have capacity >= targetCap
  const roomCaps = activeRooms.map((r) => calculateEffectiveCapacity(r));
  const validSubsets: { subset: (Classroom | Room)[]; capacity: number; orderSum: number }[] = [];

  let calls = 0;
  const MAX_CALLS = 500;
  const MAX_SUBSETS = 30;

  const findCombos = (
    startIdx: number,
    current: (Classroom | Room)[],
    currentCap: number,
    currentOrder: number
  ) => {
    if (current.length === K) {
      if (currentCap >= targetCap) {
        validSubsets.push({ subset: [...current], capacity: currentCap, orderSum: currentOrder });
      }
      return;
    }
    if (++calls > MAX_CALLS || validSubsets.length >= MAX_SUBSETS) return;

    for (let i = startIdx; i < activeRooms.length; i++) {
      const room = activeRooms[i];
      const cap = roomCaps[i];
      current.push(room);
      findCombos(i + 1, current, currentCap + cap, currentOrder + (room.roomOrder ?? 999));
      current.pop();
      if (calls > MAX_CALLS || validSubsets.length >= MAX_SUBSETS) return;
    }
  };

  findCombos(0, [], 0, 0);

  if (validSubsets.length === 0) {
    const fallback = sortedByCap.slice(0, K);
    return { selectedRoomIds: new Set(fallback.map((r) => r.id)) };
  }

  // 4. Sort valid subsets by capacity ascending (tightest fit first, minimal excess)
  validSubsets.sort((a, b) => {
    if (a.capacity !== b.capacity) return a.capacity - b.capacity;
    return a.orderSum - b.orderSum;
  });

  // Keep best-fit subsets within reasonable excess range
  const bestCap = validSubsets[0].capacity;
  const candidateSubsets = validSubsets.filter((sub) => sub.capacity <= bestCap * 1.25);

  // 5. Select subset using dateHash rotation if available, else pick first
  const chosenIndex = dateHash > 0 ? dateHash % candidateSubsets.length : 0;
  const chosenSubset = candidateSubsets[chosenIndex].subset;

  // 6. Within the chosen subset, rotate starting room by dateHash if differentArrangementPerDate
  let orderedRooms = [...chosenSubset].sort((a, b) => (a.roomOrder ?? 999) - (b.roomOrder ?? 999));
  if (dateHash > 0 && orderedRooms.length > 1) {
    const shift = (dateHash >>> 2) % orderedRooms.length;
    orderedRooms = [...orderedRooms.slice(shift), ...orderedRooms.slice(0, shift)];
  }

  return {
    selectedRoomIds: new Set(chosenSubset.map((r) => r.id)),
    roomOrderOverride: orderedRooms.map((r) => r.id),
  };
}

export function compareCandidatesByRegisterNumber(
  a: Student | ExamCandidate,
  b: Student | ExamCandidate
): number {
  return (a.registerNumber || '').localeCompare(b.registerNumber || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Distributes candidates to rooms based on selected room-fill strategy (PRD Section 4.5):
 * - 'sequential': Fills rooms in configured room sequence order up to capacity.
 * - 'balanced': Evenly balances branch & subject cohorts proportionally across all rooms.
 *
 * Automatically minimizes classrooms used (activating only the minimal room subset) and
 * varies classroom selection and room rotation per exam date.
 */
export function allocateStudentsToRooms(
  students: (Student | ExamCandidate)[],
  classrooms: (Classroom | Room)[],
  seed: string | number = 1,
  strategy: RoomFillStrategy = 'sequential',
  registerNumberOrder: RegisterNumberOrder = 'sorted',
  options: RoomAllocationOptions = {}
): RoomAllocationResult {
  const minimizeClassrooms = options.minimizeClassroomsUsed ?? true;
  const differentArrangement = options.differentArrangementPerDate ?? true;
  const equalDistribution = options.equalStudentDistribution ?? false;
  const examDate = options.examDate;

  // Filter active rooms with capacity > 0
  const activeRooms = classrooms
    .filter((r) => r.active !== false && calculateEffectiveCapacity(r) > 0)
    .sort((a, b) => (a.roomOrder ?? 999) - (b.roomOrder ?? 999));

  if (students.length === 0 || activeRooms.length === 0) {
    return {
      allocations: activeRooms.map((r) => ({ classroomId: r.id, studentIds: [] })),
      roomOccupancy: Object.fromEntries(activeRooms.map((r) => [r.id, 0])),
    };
  }

  let selectedMinimalRoomIds = new Set<string>(activeRooms.map((r) => r.id));
  let roomSequence = activeRooms;

  if (minimizeClassrooms && activeRooms.length > 1) {
    const cohortCounts = new Map<string, number>();
    students.forEach((s) => {
      const k = `${normalizeCode(s.subjectCode)}|${normalizeCode(s.branch)}`;
      cohortCounts.set(k, (cohortCounts.get(k) || 0) + 1);
    });
    const maxCohortSize = Math.max(0, ...Array.from(cohortCounts.values()));

    const minimalResult = selectMinimalClassrooms(
      activeRooms,
      students.length,
      maxCohortSize,
      examDate,
      differentArrangement
    );

    selectedMinimalRoomIds = minimalResult.selectedRoomIds;

    if (minimalResult.roomOrderOverride && minimalResult.roomOrderOverride.length > 0) {
      const roomById = new Map(activeRooms.map((r) => [r.id, r]));
      const prioritized = minimalResult.roomOrderOverride
        .map((id) => roomById.get(id))
        .filter((r): r is Classroom | Room => Boolean(r));
      const remaining = activeRooms.filter((r) => !selectedMinimalRoomIds.has(r.id));
      roomSequence = [...prioritized, ...remaining];
    }
  }

  const roomEntries = roomSequence.map((room) => {
    const totalBenches = room.columnRows && room.columnRows.length > 0
      ? room.columnRows.reduce((a, b) => a + b, 0)
      : room.rows * room.columns;

    return {
      classroomId: room.id,
      capacity: calculateEffectiveCapacity(room),
      benchCount: totalBenches,
      isMinimalSelected: selectedMinimalRoomIds.has(room.id),
      studentIds: [] as string[],
      subjectCounts: {} as Record<string, number>,
      branchCounts: {} as Record<string, number>,
    };
  });

  // Target rooms for equal headcount calculation
  const targetRooms = (minimizeClassrooms && selectedMinimalRoomIds.size > 0)
    ? roomEntries.filter((r) => selectedMinimalRoomIds.has(r.classroomId))
    : roomEntries;

  const quotaMap = equalDistribution
    ? computeEqualRoomQuotas(
        targetRooms.map((r) => ({ id: r.classroomId, capacity: r.capacity })),
        students.length
      )
    : new Map<string, number>();

  const getTargetMax = (roomId: string, capacity: number): number => {
    if (!equalDistribution) return capacity;
    return quotaMap.get(roomId) ?? 0;
  };

  // Group candidates into cohorts by SubjectCode + Branch + Semester
  const cohortsMap = new Map<string, (Student | ExamCandidate)[]>();
  students.forEach((student) => {
    const key = `${normalizeCode(student.subjectCode)}|${normalizeCode(student.branch)}|${normalizeCode(student.semester)}`;
    const list = cohortsMap.get(key) || [];
    list.push(student);
    cohortsMap.set(key, list);
  });

  // Sort cohorts by size descending: largest conflicting cohorts must be placed first
  const sortedCohorts = Array.from(cohortsMap.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const numericSeed = typeof seed === 'number' ? seed : 1;
  const random = createSeededRandom(numericSeed);

  if (strategy === 'sequential') {
    // Sequential Fill: Interleave candidates across cohorts
    const interleavedStudents: (Student | ExamCandidate)[] = [];
    const cohortQueues = sortedCohorts.map(([, list]) => {
      if (registerNumberOrder === 'sorted') {
        return [...list].sort(compareCandidatesByRegisterNumber);
      }
      return shuffle([...list], Math.floor(random() * 1000000) + 1);
    });

    let hasRemaining = true;
    while (hasRemaining) {
      hasRemaining = false;
      for (const queue of cohortQueues) {
        if (queue.length > 0) {
          interleavedStudents.push(queue.shift()!);
          hasRemaining = true;
        }
      }
    }

    interleavedStudents.forEach((student) => {
      const branchKey = normalizeCode(student.branch);
      // 1. Prefer minimal selected room within target quota AND same-branch < benchCount
      let targetRoom = roomEntries.find(
        (r) =>
          r.isMinimalSelected &&
          r.studentIds.length < getTargetMax(r.classroomId, r.capacity) &&
          (r.branchCounts[branchKey] ?? 0) < r.benchCount
      );
      // 2. Fallback within minimal selected rooms within target quota
      if (!targetRoom) {
        targetRoom = roomEntries.find(
          (r) =>
            r.isMinimalSelected &&
            r.studentIds.length < getTargetMax(r.classroomId, r.capacity)
        );
      }
      // 3. Fallback within any active room within target quota (if all rooms active)
      if (!targetRoom && equalDistribution) {
        targetRoom = roomEntries.find(
          (r) =>
            r.studentIds.length < getTargetMax(r.classroomId, r.capacity) &&
            (r.branchCounts[branchKey] ?? 0) < r.benchCount
        );
        if (!targetRoom) {
          targetRoom = roomEntries.find(
            (r) => r.studentIds.length < getTargetMax(r.classroomId, r.capacity)
          );
        }
      }
      // 4. Safety fallback: if quotas were too strict for branch constraints, expand up to physical capacity
      if (!targetRoom) {
        targetRoom = roomEntries.find(
          (r) =>
            r.isMinimalSelected &&
            r.studentIds.length < r.capacity &&
            (r.branchCounts[branchKey] ?? 0) < r.benchCount
        );
      }
      if (!targetRoom) {
        targetRoom = roomEntries.find(
          (r) => r.isMinimalSelected && r.studentIds.length < r.capacity
        );
      }
      if (!targetRoom) {
        targetRoom = roomEntries.find(
          (r) => r.studentIds.length < r.capacity && (r.branchCounts[branchKey] ?? 0) < r.benchCount
        );
      }
      if (!targetRoom) {
        targetRoom = roomEntries.find((r) => r.studentIds.length < r.capacity);
      }

      if (targetRoom) {
        targetRoom.studentIds.push(student.id);
        const subKey = normalizeCode(student.subjectCode);
        targetRoom.subjectCounts[subKey] = (targetRoom.subjectCounts[subKey] ?? 0) + 1;
        targetRoom.branchCounts[branchKey] = (targetRoom.branchCounts[branchKey] ?? 0) + 1;
      }
    });
  } else {
    // Balanced Fill: Distribute cohorts across minimal selected rooms (or all if minimal disabled)
    sortedCohorts.forEach(([, cohortStudents]) => {
      const orderedCohort =
        registerNumberOrder === 'sorted'
          ? [...cohortStudents].sort(compareCandidatesByRegisterNumber)
          : shuffle(cohortStudents, Math.floor(random() * 1000000) + 1);

      orderedCohort.forEach((student) => {
        let eligibleRooms = roomEntries.filter(
          (r) =>
            r.isMinimalSelected &&
            r.studentIds.length < getTargetMax(r.classroomId, r.capacity)
        );
        if (eligibleRooms.length === 0 && equalDistribution) {
          eligibleRooms = roomEntries.filter(
            (r) => r.studentIds.length < getTargetMax(r.classroomId, r.capacity)
          );
        }
        // Safety fallback to physical capacity
        if (eligibleRooms.length === 0) {
          eligibleRooms = roomEntries.filter(
            (r) => r.isMinimalSelected && r.studentIds.length < r.capacity
          );
        }
        if (eligibleRooms.length === 0) {
          eligibleRooms = roomEntries.filter((r) => r.studentIds.length < r.capacity);
        }
        if (eligibleRooms.length === 0) return;

        const subKey = normalizeCode(student.subjectCode);
        const branchKey = normalizeCode(student.branch);

        let bestRoom = eligibleRooms[0];
        let bestScore = Number.POSITIVE_INFINITY;

        eligibleRooms.forEach((room) => {
          const roomLimit = getTargetMax(room.classroomId, room.capacity);
          const effectiveCap = Math.max(1, roomLimit);
          const subCount = room.subjectCounts[subKey] ?? 0;
          const branchCount = room.branchCounts[branchKey] ?? 0;
          const remainingSeats = effectiveCap - room.studentIds.length;
          const roomLoadPct = room.studentIds.length / effectiveCap;

          const exceedsBenches = branchCount >= room.benchCount ? 50000 : 0;

          // Penalty favors rooms with lower same-subject/same-branch density, bench availability, and balanced load
          const score = exceedsBenches + subCount * 3.0 + branchCount * 1.5 + roomLoadPct * 2.0 - remainingSeats * 0.1;

          if (score < bestScore) {
            bestScore = score;
            bestRoom = room;
          }
        });

        bestRoom.studentIds.push(student.id);
        bestRoom.subjectCounts[subKey] = (bestRoom.subjectCounts[subKey] ?? 0) + 1;
        bestRoom.branchCounts[branchKey] = (bestRoom.branchCounts[branchKey] ?? 0) + 1;
      });
    });
  }

  const allocations = roomEntries.map(({ classroomId, studentIds }) => ({
    classroomId,
    studentIds,
  }));

  return {
    allocations,
    roomOccupancy: Object.fromEntries(
      roomEntries.map(({ classroomId, studentIds }) => [classroomId, studentIds.length])
    ),
  };
}
