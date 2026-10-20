import { describe, expect, it } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat, AllocationVersion, ValidationReport } from '../src/models/arrangement';
import {
  simulateSeatSwap,
  validateProposedSwap,
  type SeatPositionRef,
} from '../src/algorithms/swapValidator';
import {
  finalizeAllocationVersion,
  branchDraftFromFinalized,
  isVersionFinalized,
  isVersionSuperseded,
  getLatestFinalizedVersion,
} from '../src/store/versionManager';

describe('Phase 4 — Review, Swaps, Versioning & Finalization', () => {
  const sampleRoom: Room = {
    id: 'room-101',
    name: 'Hall 101',
    rows: 2,
    columns: 2,
    studentsPerBench: 2, // 4 benches, 8 seats
    disabledSeats: [],
    blockedBenches: [],
  };

  const sampleCandidates: ExamCandidate[] = [
    { id: 'c1', registerNumber: 'CS001', name: 'Alice', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
    { id: 'c2', registerNumber: 'EC001', name: 'Bob', branch: 'EC', semester: 'S5', subjectCode: 'EC301' },
    { id: 'c3', registerNumber: 'ME001', name: 'Charlie', branch: 'ME', semester: 'S5', subjectCode: 'ME301' },
    { id: 'c4', registerNumber: 'CS002', name: 'David', branch: 'CS', semester: 'S5', subjectCode: 'CS301' }, // Same subject as Alice, same branch/sem as Alice
    { id: 'c5', registerNumber: 'EE001', name: 'Eve', branch: 'EE', semester: 'S5', subjectCode: 'EE301' },
  ];

  // Bench 0,0: c1 (Alice - CS/S5/CS301) & c2 (Bob - EC/S5/EC301) -> Compliant
  // Bench 0,1: c3 (Charlie - ME/S5/ME301) & Empty
  // Bench 1,0: c4 (David - CS/S5/CS301) & Empty
  const initialAssignments: AssignedSeat[] = [
    { classroomId: 'room-101', roomId: 'room-101', row: 0, column: 0, seatIndex: 0, position: 0, studentId: 'c1', candidateId: 'c1' },
    { classroomId: 'room-101', roomId: 'room-101', row: 0, column: 0, seatIndex: 1, position: 1, studentId: 'c2', candidateId: 'c2' },
    { classroomId: 'room-101', roomId: 'room-101', row: 0, column: 1, seatIndex: 0, position: 0, studentId: 'c3', candidateId: 'c3' },
    { classroomId: 'room-101', roomId: 'room-101', row: 1, column: 0, seatIndex: 0, position: 0, studentId: 'c4', candidateId: 'c4' },
  ];

  describe('TASK-4.3: Manual Move & Swap Simulation Engine', () => {
    it('swaps candidate positions between two occupied seats', () => {
      const seatA: SeatPositionRef = { roomId: 'room-101', row: 0, column: 0, seatIndex: 0 }; // Alice
      const seatB: SeatPositionRef = { roomId: 'room-101', row: 0, column: 1, seatIndex: 0 }; // Charlie

      const result = simulateSeatSwap(initialAssignments, seatA, seatB);

      const occupantA = result.find(
        (a) => a.row === 0 && a.column === 0 && (a.position ?? a.seatIndex) === 0
      );
      const occupantB = result.find(
        (a) => a.row === 0 && a.column === 1 && (a.position ?? a.seatIndex) === 0
      );

      expect(occupantA?.candidateId).toBe('c3'); // Charlie moved to Seat A
      expect(occupantB?.candidateId).toBe('c1'); // Alice moved to Seat B
      expect(result).toHaveLength(4);
    });

    it('moves a candidate into an empty seat position and clears source seat', () => {
      const sourceSeat: SeatPositionRef = { roomId: 'room-101', row: 1, column: 0, seatIndex: 0 }; // David
      const emptyTargetSeat: SeatPositionRef = { roomId: 'room-101', row: 1, column: 1, seatIndex: 1 }; // Empty

      const result = simulateSeatSwap(initialAssignments, sourceSeat, emptyTargetSeat);

      const oldSeat = result.find(
        (a) => a.row === 1 && a.column === 0 && (a.position ?? a.seatIndex) === 0
      );
      const newSeat = result.find(
        (a) => a.row === 1 && a.column === 1 && (a.position ?? a.seatIndex) === 1
      );

      expect(oldSeat).toBeUndefined(); // Source seat is now empty
      expect(newSeat?.candidateId).toBe('c4'); // David is now at new seat
      expect(result).toHaveLength(4);
    });

    it('returns unchanged assignments when fromSeat and toSeat are identical', () => {
      const seat: SeatPositionRef = { roomId: 'room-101', row: 0, column: 0, seatIndex: 0 };
      const result = simulateSeatSwap(initialAssignments, seat, seat);

      expect(result).toEqual(initialAssignments);
    });
  });

  describe('TASK-4.3: Validator-Guarded Proposed Swap Verification', () => {
    it('permits a valid swap when neither seat introduces hard conflicts', () => {
      // Swapping Bob (c2, EC/S5/EC301 on Bench 0,0) with Charlie (c3, ME/S5/ME301 on Bench 0,1)
      // Bench 0,0 will have Alice (CS) and Charlie (ME) -> Compliant!
      // Bench 0,1 will have Bob (EC) -> Compliant!
      const seatBob: SeatPositionRef = { roomId: 'room-101', row: 0, column: 0, seatIndex: 1 };
      const seatCharlie: SeatPositionRef = { roomId: 'room-101', row: 0, column: 1, seatIndex: 0 };

      const validation = validateProposedSwap(
        initialAssignments,
        sampleCandidates,
        [sampleRoom],
        seatBob,
        seatCharlie
      );

      expect(validation.isValid).toBe(true);
      expect(validation.blockingReasons).toHaveLength(0);
      expect(validation.violations).toHaveLength(0);
    });

    it('blocks swap that causes a C2 subject conflict on a bench', () => {
      // Moving David (c4, CS301) to Bench 0,0 Seat 1 (replacing Bob c2)
      // Now Bench 0,0 would have Alice (c1, CS301) and David (c4, CS301) -> SAME SUBJECT!
      const seatBob: SeatPositionRef = { roomId: 'room-101', row: 0, column: 0, seatIndex: 1 };
      const seatDavid: SeatPositionRef = { roomId: 'room-101', row: 1, column: 0, seatIndex: 0 };

      const validation = validateProposedSwap(
        initialAssignments,
        sampleCandidates,
        [sampleRoom],
        seatBob,
        seatDavid
      );

      expect(validation.isValid).toBe(false);
      expect(validation.violations.some((v) => v.type === 'C2_SAME_BENCH_SUBJECT')).toBe(true);
      expect(validation.blockingReasons.some((r) => r.includes('Constraint C2'))).toBe(true);
    });

    it('blocks swap that causes a C3 branch + semester conflict on a bench', () => {
      // Create candidate DaveWithDiffSubject who has CS, S5, but different subject CS302
      const candidateDaveDiffSub: ExamCandidate = {
        id: 'c4b',
        registerNumber: 'CS002B',
        name: 'David B',
        branch: 'CS',
        semester: 'S5',
        subjectCode: 'CS302', // Different subject, but same branch CS and semester S5!
      };

      const customCandidates = [sampleCandidates[0], sampleCandidates[1], candidateDaveDiffSub];
      const customAssignments: AssignedSeat[] = [
        { classroomId: 'room-101', roomId: 'room-101', row: 0, column: 0, seatIndex: 0, position: 0, studentId: 'c1', candidateId: 'c1' }, // Alice
        { classroomId: 'room-101', roomId: 'room-101', row: 0, column: 0, seatIndex: 1, position: 1, studentId: 'c2', candidateId: 'c2' }, // Bob
        { classroomId: 'room-101', roomId: 'room-101', row: 1, column: 0, seatIndex: 0, position: 0, studentId: 'c4b', candidateId: 'c4b' }, // David B
      ];

      // Swap Bob with David B
      const seatBob: SeatPositionRef = { roomId: 'room-101', row: 0, column: 0, seatIndex: 1 };
      const seatDavidB: SeatPositionRef = { roomId: 'room-101', row: 1, column: 0, seatIndex: 0 };

      const validation = validateProposedSwap(
        customAssignments,
        customCandidates,
        [sampleRoom],
        seatBob,
        seatDavidB
      );

      expect(validation.isValid).toBe(false);
      expect(validation.violations.some((v) => v.type === 'C3_SAME_BENCH_BRANCH_SEMESTER')).toBe(true);
      expect(validation.blockingReasons.some((r) => r.includes('Constraint C3'))).toBe(true);
    });

    it('blocks move to a disabled seat position (C5 violation)', () => {
      const roomWithDisabledSeat: Room = {
        ...sampleRoom,
        disabledSeats: [{ row: 1, column: 1, seatIndex: 1 }],
      };

      const seatAlice: SeatPositionRef = { roomId: 'room-101', row: 0, column: 0, seatIndex: 0 };
      const disabledSeat: SeatPositionRef = { roomId: 'room-101', row: 1, column: 1, seatIndex: 1 };

      const validation = validateProposedSwap(
        initialAssignments,
        sampleCandidates,
        [roomWithDisabledSeat],
        seatAlice,
        disabledSeat
      );

      expect(validation.isValid).toBe(false);
      expect(validation.violations.some((v) => v.type === 'C5_INVALID_PHYSICAL_SEAT')).toBe(true);
    });
  });

  describe('TASK-4.4: Allocation Versioning, Finalization Lock & Superseded Engine', () => {
    const mockValidationReport: ValidationReport = {
      status: 'Valid',
      conflicts: [],
      summary: {
        totalStudents: 4,
        assignedStudents: 4,
        unassignedStudents: 0,
        totalAvailableSeats: 8,
        unusedSeats: 4,
        totalConflicts: 0,
        qualityScore: 100,
      },
    };

    const initialVersion: AllocationVersion = {
      id: 'version-1',
      examId: 'exam-2026',
      versionNumber: 1,
      status: 'draft',
      algorithmVersion: 'v1.0.0-csp',
      seed: 12345,
      generatedAt: '2026-10-16T10:00:00.000Z',
      summary: mockValidationReport.summary,
      assignments: initialAssignments,
    };

    it('locks and finalizes an allocation version, setting timestamp and finalized status', () => {
      const { updatedVersions, finalizedVersion } = finalizeAllocationVersion(
        [initialVersion],
        'version-1'
      );

      expect(finalizedVersion).toBeDefined();
      expect(finalizedVersion?.status).toBe('finalized');
      expect(finalizedVersion?.finalizedAt).toBeDefined();
      expect(isVersionFinalized(finalizedVersion)).toBe(true);
      expect(isVersionSuperseded(finalizedVersion)).toBe(false);
      expect(updatedVersions[0].status).toBe('finalized');
    });

    it('marks any prior finalized versions for the same exam as superseded when a new one is finalized', () => {
      const finalizedV1: AllocationVersion = {
        ...initialVersion,
        id: 'version-1',
        status: 'finalized',
        finalizedAt: '2026-10-16T10:00:00.000Z',
      };

      const draftV2: AllocationVersion = {
        ...initialVersion,
        id: 'version-2',
        versionNumber: 2,
        status: 'draft',
      };

      const { updatedVersions, finalizedVersion } = finalizeAllocationVersion(
        [finalizedV1, draftV2],
        'version-2'
      );

      expect(finalizedVersion?.id).toBe('version-2');
      expect(finalizedVersion?.status).toBe('finalized');

      const v1Updated = updatedVersions.find((v) => v.id === 'version-1');
      expect(v1Updated?.status).toBe('superseded');
      expect(v1Updated?.supersededAt).toBeDefined();
      expect(isVersionSuperseded(v1Updated)).toBe(true);
    });

    it('branches a new draft version from a finalized version upon manual edit', () => {
      const finalizedV1: AllocationVersion = {
        ...initialVersion,
        status: 'finalized',
        finalizedAt: '2026-10-16T10:00:00.000Z',
      };

      const modifiedAssignments = initialAssignments.slice(0, 3);

      const { updatedVersions, newVersion } = branchDraftFromFinalized(
        [finalizedV1],
        'version-1',
        modifiedAssignments,
        mockValidationReport
      );

      expect(newVersion.versionNumber).toBe(2);
      expect(newVersion.status).toBe('draft');
      expect(newVersion.assignments).toHaveLength(3);

      // Base version v1 should now be marked superseded
      const v1 = updatedVersions.find((v) => v.id === 'version-1');
      expect(v1?.status).toBe('superseded');
      expect(updatedVersions).toHaveLength(2);
    });

    it('accurately retrieves the latest finalized version', () => {
      const versions: AllocationVersion[] = [
        { ...initialVersion, id: 'v1', versionNumber: 1, status: 'superseded' },
        { ...initialVersion, id: 'v2', versionNumber: 2, status: 'finalized' },
        { ...initialVersion, id: 'v3', versionNumber: 3, status: 'draft' },
      ];

      const latest = getLatestFinalizedVersion(versions, 'exam-2026');
      expect(latest?.id).toBe('v2');
      expect(latest?.versionNumber).toBe(2);
    });
  });
});
