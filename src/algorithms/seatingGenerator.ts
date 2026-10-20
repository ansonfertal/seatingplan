import type {
  AssignedSeat,
  ArrangementStatistics,
  RegisterNumberOrder,
  SeatingRules,
  UnassignedCandidate,
} from '../models/arrangement';
import type { Classroom, Room } from '../models/classroom';
import { calculateEffectiveCapacity } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';
import { normalizeCode } from '../models/student';
import { allocateStudentsToRooms, hashExamDate, type RoomFillStrategy } from './roomAllocation';
import { buildSeatGraph } from './seatGraph';
import { createSeedFromString, createSeededRandom, shuffle } from './random';
import { calculateArrangementQuality } from '../utils/qualityCalculator';

import { getClassroomColumnRows } from '../utils/capacityCalculator';

export type SeatingGenerationOptions = {
  seed?: string | number;
  strategy?: RoomFillStrategy;
  registerNumberOrder?: RegisterNumberOrder;
  versionId?: string;
  examDate?: string;
  minimizeClassroomsUsed?: boolean;
  differentArrangementPerDate?: boolean;
  onProgress?: (progress: { stage: string; percent: number }) => void;
};

export type SeatingGenerationOutput = {
  assignments: AssignedSeat[];
  unassignedCandidates: UnassignedCandidate[];
  algorithmVersion: string;
  generationSeed: number;
  statistics: ArrangementStatistics;
};

/**
 * Checks whether placing candidate S on a bench alongside existing occupants violates:
 * - C2: Same subject code
 * - C3: Same branch AND same semester
 */
export function checkBenchConflict(
  candidate: Student | ExamCandidate,
  benchOccupants: (Student | ExamCandidate)[]
): { hasConflict: boolean; reason?: 'subject' | 'branch_semester'; conflictingStudent?: Student | ExamCandidate } {
  const candSub = normalizeCode(candidate.subjectCode);
  const candBranch = normalizeCode(candidate.branch);
  const candSem = normalizeCode(candidate.semester);

  for (const occupant of benchOccupants) {
    const occSub = normalizeCode(occupant.subjectCode);
    const occBranch = normalizeCode(occupant.branch);
    const occSem = normalizeCode(occupant.semester);

    // Hard Constraint C2: No two occupants of same bench share subject code
    if (candSub && occSub && candSub === occSub) {
      return { hasConflict: true, reason: 'subject', conflictingStudent: occupant };
    }

    // Hard Constraint C3: No two occupants of same bench share BOTH branch and semester
    if (candBranch && occBranch && candBranch === occBranch && candSem && occSem && candSem === occSem) {
      return { hasConflict: true, reason: 'branch_semester', conflictingStudent: occupant };
    }
  }

  return { hasConflict: false };
}

/**
 * Deterministic constraint-aware seating allocation engine (PRD Section 4.4 & 4.5).
 * Enforces hard constraints C1–C5 and strictly forbids LLM-generated assignments.
 */
export function generateConstraintAwareSeating(
  students: (Student | ExamCandidate)[],
  classrooms: (Classroom | Room)[],
  rules: SeatingRules,
  options: SeatingGenerationOptions = {}
): SeatingGenerationOutput {
  const seedString = String(options.seed ?? '1001');
  const deterministicSeed = typeof options.seed === 'number' ? options.seed : createSeedFromString(seedString);
  const strategy = options.strategy ?? 'sequential';
  const registerNumberOrder: RegisterNumberOrder =
    options.registerNumberOrder ?? rules.registerNumberOrder ?? 'sorted';
  const examDate = options.examDate;
  const minimizeClassroomsUsed =
    options.minimizeClassroomsUsed ?? rules.minimizeClassroomsUsed ?? true;
  const differentArrangementPerDate =
    options.differentArrangementPerDate ?? rules.differentArrangementPerDate ?? true;
  const dateSalt = examDate && differentArrangementPerDate ? hashExamDate(examDate) : 0;
  const algorithmVersion = '1.2.0-csp';

  options.onProgress?.({ stage: 'Validating capacity and pre-sorting cohorts...', percent: 10 });

  // Distribute candidates to rooms with minimal classroom bin-packing and date rotation
  const roomAllocationResult = allocateStudentsToRooms(
    students,
    classrooms,
    deterministicSeed,
    strategy,
    registerNumberOrder,
    {
      examDate,
      minimizeClassroomsUsed,
      differentArrangementPerDate,
    }
  );
  const roomMap = new Map(classrooms.map((c) => [c.id, c]));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const assignments: AssignedSeat[] = [];
  const unassignedCandidates: UnassignedCandidate[] = [];
  const assignedStudentIds = new Set<string>();

  // Global bench and seat tracking across all active rooms
  const benchOccupantsMap = new Map<string, (Student | ExamCandidate)[]>(); // `${classroomId}:${r}-${c}` -> occupants
  const seatOccupantMap = new Map<string, string>(); // `${classroomId}:${node.key}` -> studentId

  let roomsProcessed = 0;
  const totalRooms = roomAllocationResult.allocations.length;

  roomAllocationResult.allocations.forEach(({ classroomId, studentIds }) => {
    const classroom = roomMap.get(classroomId);
    if (!classroom) return;

    roomsProcessed++;
    const currentPercent = 10 + Math.round((roomsProcessed / Math.max(1, totalRooms)) * 70);
    options.onProgress?.({
      stage: `Allocating seats in room ${classroom.name} (${roomsProcessed}/${totalRooms})...`,
      percent: currentPercent,
    });

    // Candidates assigned to this room
    const roomCandidates = studentIds
      .map((id) => studentMap.get(id))
      .filter((s): s is Student | ExamCandidate => Boolean(s));

    const roomCapacity = calculateEffectiveCapacity(classroom);
    const graph = buildSeatGraph(classroom, rules);

    // Bench traversal pattern: rotate between row-major and column-major across dates
    const benchTraversalPattern = dateSalt > 0 ? (dateSalt >>> 3) % 2 : 0;

    // Prioritize seatIndex 0 across all physical benches to automatically distribute students 1 per bench
    const availableNodes = [...graph.nodes].sort((a, b) => {
      if (a.seatIndex !== b.seatIndex) return a.seatIndex - b.seatIndex;
      if (benchTraversalPattern === 1) {
        if (a.column !== b.column) return a.column - b.column;
        return a.row - b.row;
      }
      if (a.row !== b.row) return a.row - b.row;
      return a.column - b.column;
    });

    // Seeded randomization for tie-breaking and seat exploration
    const random = createSeededRandom(deterministicSeed + classroomId.length * 37 + roomsProcessed * 13);

    // Sort room candidates: group by (subject, branch) and order largest cohorts first
    const cohorts = new Map<string, (Student | ExamCandidate)[]>();
    roomCandidates.forEach((c) => {
      const key = `${normalizeCode(c.subjectCode)}|${normalizeCode(c.branch)}`;
      const list = cohorts.get(key) || [];
      list.push(c);
      cohorts.set(key, list);
    });

    if (registerNumberOrder === 'sorted') {
      cohorts.forEach((list) => {
        list.sort((a, b) =>
          (a.registerNumber || '').localeCompare(b.registerNumber || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        );
      });
    } else {
      const roomRandom = createSeededRandom(
        deterministicSeed + dateSalt * 7919 + classroomId.length * 37 + roomsProcessed * 13
      );
      cohorts.forEach((list) => {
        const shuffled = shuffle(list, Math.floor(roomRandom() * 1000000) + 1);
        list.length = 0;
        list.push(...shuffled);
      });
    }

    // Interleave candidates across cohorts (largest cohorts first) to maximize pairing compatibility on benches
    let cohortLists = Array.from(cohorts.values())
      .sort((a, b) => b.length - a.length)
      .map((list) => [...list]);

    // When different arrangement per date is enabled, rotate cohort seating & companion pairing
    if (dateSalt > 0 && cohortLists.length > 1) {
      const cohortShift = dateSalt % cohortLists.length;
      cohortLists = [...cohortLists.slice(cohortShift), ...cohortLists.slice(0, cohortShift)];

      for (let i = 1; i < cohortLists.length; i++) {
        const list = cohortLists[i];
        if (list.length > 1) {
          const companionShift = (dateSalt >>> (i + 1)) % list.length;
          if (companionShift > 0) {
            cohortLists[i] = [...list.slice(companionShift), ...list.slice(0, companionShift)];
          }
        }
      }
    }

    const sortedCandidates: (Student | ExamCandidate)[] = [];
    let hasRemaining = true;
    while (hasRemaining) {
      hasRemaining = false;
      for (const list of cohortLists) {
        if (list.length > 0) {
          sortedCandidates.push(list.shift()!);
          hasRemaining = true;
        }
      }
    }

    // Track room assignment count for C1
    let roomAssignedCount = 0;

    sortedCandidates.forEach((candidate) => {
      // Check C1 Room Capacity Limit
      if (roomAssignedCount >= roomCapacity) {
        unassignedCandidates.push({
          candidateId: candidate.id,
          registerNumber: candidate.registerNumber,
          name: candidate.name,
          branch: candidate.branch,
          semester: candidate.semester || '',
          subjectCode: candidate.subjectCode || '',
          reason: `Room ${classroom.name} capacity limit (${roomCapacity} seats) reached`,
        });
        return;
      }


      let bestNode: typeof availableNodes[0] | null = null;
      let lowestPenalty = Number.POSITIVE_INFINITY;

      // Evaluate candidate seats
      for (const node of availableNodes) {
        const fullSeatKey = `${classroom.id}:${node.key}`;
        if (seatOccupantMap.has(fullSeatKey)) continue;

        const benchKey = `${classroom.id}:${node.row}-${node.column}`;
        const currentBenchOccupants = benchOccupantsMap.get(benchKey) || [];

        // Rule: Two students of the same branch can NEVER occupy the same bench.
        // If only students of the same branch are left, only 1 student can occupy a bench in that case.
        const hasSameBranchOnBench = currentBenchOccupants.some(
          (occ) => normalizeCode(occ.branch) === normalizeCode(candidate.branch)
        );
        if (hasSameBranchOnBench) {
          continue;
        }

        // Check Hard Constraints C2 and C3 on the same bench
        const conflictCheck = checkBenchConflict(candidate, currentBenchOccupants);
        if (conflictCheck.hasConflict) {
          // Hard conflict on bench -> cannot place here!
          continue;
        }

        // Calculate soft penalty for adjacent benches (if enabled)
        let penalty = 0;

        // Automatically distribute students 1 per bench:
        // Heavily penalize placing on an already-occupied bench when empty benches are available
        if (currentBenchOccupants.length > 0) {
          penalty += currentBenchOccupants.length * 10000;
        }

        // Prefer seatIndex 0 (primary seat position) across all benches
        penalty += node.seatIndex * 150;

        // Check neighboring seats in graph (Adjacency Constraints)
        const neighborKeys = graph.adjacency[node.key] || [];
        let hasHardAdjacentConflict = false;

        // If only same branch students remain, adjacency restrictions for the same branch
        // do not prevent them from occupying vacant benches.
        if (neighborKeys.length > 0) {
          for (const nKey of neighborKeys) {
            const neighborStudentId = seatOccupantMap.get(`${classroom.id}:${nKey}`);
            if (!neighborStudentId) continue;
            const neighborStudent = studentMap.get(neighborStudentId);
            if (!neighborStudent) continue;

            const isSameSubject =
              Boolean(candidate.subjectCode && neighborStudent.subjectCode) &&
              normalizeCode(candidate.subjectCode) === normalizeCode(neighborStudent.subjectCode);

            const isSameBranch =
              Boolean(candidate.branch && neighborStudent.branch) &&
              normalizeCode(candidate.branch) === normalizeCode(neighborStudent.branch);

            const isSameBranchSemester =
              isSameBranch &&
              normalizeCode(candidate.semester) === normalizeCode(neighborStudent.semester);

            if (
              rules.horizontalAdjacency ||
              rules.verticalAdjacency ||
              rules.diagonalAdjacency
            ) {
              // Check hard prohibition under strictAdjacency
              if (rules.strictAdjacency) {
                const prohibitSubject = rules.adjacentSameSubjectSeparation ?? rules.sameSubjectCodeSeparation;
                const prohibitBranch = rules.adjacentSameBranchSeparation ?? true;

                if (prohibitSubject && isSameSubject) {
                  hasHardAdjacentConflict = true;
                  break;
                }
                if (prohibitBranch && (isSameBranch || isSameBranchSemester)) {
                  hasHardAdjacentConflict = true;
                  break;
                }
              }

              // Soft penalties for adjacent benches only when randomized order is active
              if (registerNumberOrder === 'random') {
                if (isSameSubject) {
                  penalty += 60;
                }
                if (isSameBranchSemester) {
                  penalty += 40;
                } else if (isSameBranch && rules.adjacentSameBranchSeparation) {
                  penalty += 30;
                }
              }
            }
          }
        }

        if (hasHardAdjacentConflict) {
          continue;
        }

        // Slight deterministic tie-break jitter only when randomized order is active
        if (registerNumberOrder === 'random') {
          penalty += (random() - 0.5) * 5;
        }

        if (penalty < lowestPenalty) {
          lowestPenalty = penalty;
          bestNode = node;
        }
      }

      if (bestNode) {
        // Place candidate in bestNode
        seatOccupantMap.set(`${classroom.id}:${bestNode.key}`, candidate.id);
        const benchKey = `${classroom.id}:${bestNode.row}-${bestNode.column}`;
        const benchList = benchOccupantsMap.get(benchKey) || [];
        benchList.push(candidate);
        benchOccupantsMap.set(benchKey, benchList);

        assignments.push({
          allocationVersionId: options.versionId,
          candidateId: candidate.id,
          studentId: candidate.id,
          roomId: classroom.id,
          classroomId: classroom.id,
          row: bestNode.row,
          column: bestNode.column,
          position: bestNode.seatIndex,
          seatIndex: bestNode.seatIndex,
        });

        assignedStudentIds.add(candidate.id);
        roomAssignedCount++;
      } else {
        // Infeasible to place candidate on any available seat without C2 or C3 violation
        unassignedCandidates.push({
          candidateId: candidate.id,
          registerNumber: candidate.registerNumber,
          name: candidate.name,
          branch: candidate.branch,
          semester: candidate.semester || '',
          subjectCode: candidate.subjectCode || '',
          reason: `No compatible bench found in room ${classroom.name} (C2/C3 bench companion conflict)`,
        });
      }
    });
  });

  // Phase 2: Post-Allocation Remainder Placement for Same-Branch Candidates on Vacant Benches
  // Requirement: If only students of the same branch are left after allocation according to rules,
  // if there are seats vacant the students of same branch can occupy the benches with the only
  // restriction that only 1 student can occupy a bench in that case.
  const unassignedRemainder = students.filter((s) => !assignedStudentIds.has(s.id));
  if (unassignedRemainder.length > 0) {
    const unassignedBranches = new Set(unassignedRemainder.map((s) => normalizeCode(s.branch)));
    const isOnlySameBranchLeft = unassignedBranches.size === 1;

    const activeClassrooms = classrooms
      .filter((c) => c.active !== false && calculateEffectiveCapacity(c) > 0)
      .sort((a, b) => (a.roomOrder ?? 999) - (b.roomOrder ?? 999));

    type VacantBenchRef = {
      classroom: Classroom | Room;
      row: number;
      column: number;
      seatIndex: number;
      key: string;
    };

    const getVacantBenches = (): VacantBenchRef[] => {
      const list: VacantBenchRef[] = [];
      activeClassrooms.forEach((c) => {
        const roomAssignedSoFar = assignments.filter((a) => (a.roomId || a.classroomId) === c.id).length;
        const roomCap = calculateEffectiveCapacity(c);
        if (roomAssignedSoFar >= roomCap) return;

        const cRows = getClassroomColumnRows(c.rows, c.columns, c.columnRows);

        for (let col = 0; col < c.columns; col++) {
          for (let row = 0; row < cRows[col]; row++) {
            const benchKey = `${c.id}:${row}-${col}`;
            const occupants = benchOccupantsMap.get(benchKey) || [];
            if (occupants.length > 0) continue; // Must be completely vacant (0 occupants)

            const isBlocked = c.blockedBenches?.some((b) => b.row === row && b.column === col);
            if (isBlocked) continue;

            const isDisabled = c.disabledSeats?.some((s) => s.row === row && s.column === col && s.seatIndex === 0);
            if (isDisabled) continue;

            const seatKey = `${row}-${col}-0`;
            if (seatOccupantMap.has(`${c.id}:${seatKey}`)) continue;

            list.push({
              classroom: c,
              row,
              column: col,
              seatIndex: 0,
              key: seatKey,
            });
          }
        }
      });
      return list;
    };

    const vacantBenches = getVacantBenches();

    const remainderCandidates = registerNumberOrder === 'sorted'
      ? [...unassignedRemainder].sort((a, b) =>
        (a.registerNumber || '').localeCompare(b.registerNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      )
      : shuffle([...unassignedRemainder], deterministicSeed + 777);

    remainderCandidates.forEach((candidate) => {
      const targetIdx = vacantBenches.findIndex((bench) => {
        if (!rules.strictAdjacency) return true;

        const c = bench.classroom;
        const graph = buildSeatGraph(c, rules);
        const neighborKeys = graph.adjacency[bench.key] || [];
        for (const nKey of neighborKeys) {
          const neighborStudentId = seatOccupantMap.get(`${c.id}:${nKey}`);
          if (!neighborStudentId) continue;
          const neighborStudent = studentMap.get(neighborStudentId);
          if (!neighborStudent) continue;

          const isSameSubject =
            Boolean(candidate.subjectCode && neighborStudent.subjectCode) &&
            normalizeCode(candidate.subjectCode) === normalizeCode(neighborStudent.subjectCode);
          const isSameBranch =
            Boolean(candidate.branch && neighborStudent.branch) &&
            normalizeCode(candidate.branch) === normalizeCode(neighborStudent.branch);

          const prohibitSubject = rules.adjacentSameSubjectSeparation ?? rules.sameSubjectCodeSeparation;
          const prohibitBranch = rules.adjacentSameBranchSeparation ?? true;

          // If only students of the same branch are left, user rule allows them to occupy vacant benches 1 per bench
          if (!isOnlySameBranchLeft) {
            if (prohibitSubject && isSameSubject) return false;
            if (prohibitBranch && isSameBranch) return false;
          }
        }
        return true;
      });

      if (targetIdx !== -1) {
        const [target] = vacantBenches.splice(targetIdx, 1);
        const c = target.classroom;
        const benchKey = `${c.id}:${target.row}-${target.column}`;
        const seatKey = `${c.id}:${target.key}`;

        benchOccupantsMap.set(benchKey, [candidate]);
        seatOccupantMap.set(seatKey, candidate.id);

        assignments.push({
          allocationVersionId: options.versionId,
          candidateId: candidate.id,
          studentId: candidate.id,
          roomId: c.id,
          classroomId: c.id,
          row: target.row,
          column: target.column,
          position: target.seatIndex,
          seatIndex: target.seatIndex,
        });

        assignedStudentIds.add(candidate.id);

        // Remove from unassignedCandidates if previously listed
        const idx = unassignedCandidates.findIndex((u) => u.candidateId === candidate.id);
        if (idx !== -1) {
          unassignedCandidates.splice(idx, 1);
        }
      }
    });
  }

  // Check C4: Any students completely omitted from room allocations
  students.forEach((s) => {
    if (!assignedStudentIds.has(s.id) && !unassignedCandidates.some((u) => u.candidateId === s.id)) {
      unassignedCandidates.push({
        candidateId: s.id,
        registerNumber: s.registerNumber,
        name: s.name,
        branch: s.branch,
        semester: s.semester || '',
        subjectCode: s.subjectCode || '',
        reason: 'Unassigned due to overall examination capacity shortage',
      });
    }
  });

  options.onProgress?.({ stage: 'Calculating arrangement quality metrics...', percent: 90 });

  const totalStudents = students.length;
  const assignedStudents = assignedStudentIds.size;
  const unassignedStudents = unassignedCandidates.length;
  const totalAvailableSeats = classrooms
    .filter((c) => c.active !== false)
    .reduce((sum, c) => sum + calculateEffectiveCapacity(c), 0);
  const unusedSeats = Math.max(0, totalAvailableSeats - assignedStudents);

  const statistics = calculateArrangementQuality({
    totalStudents,
    assignedStudents,
    unassignedStudents,
    totalAvailableSeats,
    unusedSeats,
    totalConflicts: 0, // Hard conflicts strictly avoided by allocator
  });

  options.onProgress?.({ stage: 'Seating generation complete.', percent: 100 });

  return {
    assignments,
    unassignedCandidates,
    algorithmVersion,
    generationSeed: deterministicSeed,
    statistics,
  };
}

/**
 * Backward-compatible wrapper returning AssignedSeat[].
 */
export function generateInitialSeating(
  students: Student[],
  classrooms: Classroom[],
  rules: SeatingRules,
  seed = 'default-seed'
): AssignedSeat[] {
  const result = generateConstraintAwareSeating(students, classrooms, rules, { seed });
  return result.assignments;
}
