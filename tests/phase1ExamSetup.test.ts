import { describe, expect, it, beforeEach } from 'vitest';
import {
  createNewExam,
  examDetailsSchema,
  validateExamTimes,
  calculateDurationMinutes,
  calculateEndTimeFromDuration,
} from '../src/models/exam';
import {
  calculateTheoreticalCapacity,
  calculateEffectiveCapacity,
  validateRoomCapacity,
  type Room,
} from '../src/models/classroom';
import { useAppStore } from '../src/store/appStore';

describe('Phase 1 — Domain Models & Exam Setup', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
  });

  describe('TASK-1.1: Exam Time Validation & Duration Helpers', () => {
    it('validates regular daytime exam hours correctly', () => {
      const result = validateExamTimes('09:30', '12:30', false);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects end time earlier than start time for non-overnight exams', () => {
      const result = validateExamTimes('14:00', '10:00', false);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End time must be after start time');
    });

    it('permits end time earlier than start time if overnight is enabled', () => {
      const result = validateExamTimes('22:00', '02:00', true);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects identical start and end time', () => {
      const result = validateExamTimes('10:00', '10:00', false);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End time cannot be the same as start time');
    });

    it('validates 24-hour time format', () => {
      const badStart = validateExamTimes('25:00', '12:00', false);
      expect(badStart.isValid).toBe(false);
      expect(badStart.error).toContain('24-hour');

      const badEnd = validateExamTimes('10:00', '12:99', false);
      expect(badEnd.isValid).toBe(false);
      expect(badEnd.error).toContain('24-hour');
    });

    it('calculates duration in minutes accurately for regular and overnight sessions', () => {
      expect(calculateDurationMinutes('09:30', '12:30', false)).toBe(180);
      expect(calculateDurationMinutes('13:30', '16:00', false)).toBe(150);
      expect(calculateDurationMinutes('22:00', '02:00', true)).toBe(240);
      expect(calculateDurationMinutes('', '12:00')).toBeNull();
    });

    it('calculates end time from duration correctly', () => {
      expect(calculateEndTimeFromDuration('09:30', 180)).toBe('12:30');
      expect(calculateEndTimeFromDuration('13:00', 90)).toBe('14:30');
      expect(calculateEndTimeFromDuration('23:00', 120)).toBe('01:00');
    });
  });

  describe('TASK-1.1: Exam Schema & Zod Validation', () => {
    it('parses valid exam details successfully', () => {
      const validData = {
        examName: 'Midterm Examination S5',
        examDate: '2026-11-15',
        session: 'FN',
        startTime: '09:30',
        endTime: '12:30',
        durationMinutes: 180,
      };

      const parsed = examDetailsSchema.safeParse(validData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.examName).toBe('Midterm Examination S5');
        expect(parsed.data.session).toBe('FN');
        expect(parsed.data.institutionName).toBe('ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY');
        expect(parsed.data.documentCode).toBe('AISAT/Form/QPM17/F4');
      }
    });

    it('transforms Forenoon and Afternoon sessions to FN and AN', () => {
      const fnData = examDetailsSchema.parse({
        examName: 'Test FN',
        examDate: '2026-11-15',
        session: 'Forenoon',
      });
      expect(fnData.session).toBe('FN');

      const anData = examDetailsSchema.parse({
        examName: 'Test AN',
        examDate: '2026-11-15',
        session: 'Afternoon',
      });
      expect(anData.session).toBe('AN');
    });

    it('fails validation when mandatory fields are missing', () => {
      const missingName = examDetailsSchema.safeParse({
        examName: '',
        examDate: '2026-11-15',
        session: 'FN',
      });
      expect(missingName.success).toBe(false);

      const missingDate = examDetailsSchema.safeParse({
        examName: 'Valid Name',
        examDate: '',
        session: 'FN',
      });
      expect(missingDate.success).toBe(false);
    });

    it('fails Zod refinement when end time is before start time for daytime exam', () => {
      const invalidTimes = examDetailsSchema.safeParse({
        examName: 'Invalid Timing',
        examDate: '2026-11-15',
        session: 'FN',
        startTime: '14:00',
        endTime: '11:00',
        isOvernight: false,
      });
      expect(invalidTimes.success).toBe(false);
    });
  });

  describe('TASK-1.1: Room Capacity Calculations (PRD Section 4.3 & 5)', () => {
    it('calculates theoretical physical capacity correctly', () => {
      // 5 rows * 6 columns * 2 students per bench = 60
      expect(calculateTheoreticalCapacity(5, 6, 2)).toBe(60);
      // 7 rows * 9 columns * 1 student per bench = 63
      expect(calculateTheoreticalCapacity(7, 9, 1)).toBe(63);
      // 4 rows * 4 columns * 3 students per bench = 48
      expect(calculateTheoreticalCapacity(4, 4, 3)).toBe(48);
    });

    it('calculates effective capacity subtracting disabled seats and blocked benches', () => {
      const room: Room = {
        id: 'room-1',
        name: 'Hall A',
        rows: 5,
        columns: 4,
        studentsPerBench: 2, // theoretical = 40
        disabledSeats: [
          { row: 1, column: 1, seatIndex: 0 },
          { row: 1, column: 1, seatIndex: 1 },
        ],
        blockedBenches: [{ row: 5, column: 4 }], // 1 blocked bench * 2 = 2 seats
      };

      // 40 - 2 disabled - 2 blocked = 36
      expect(calculateEffectiveCapacity(room)).toBe(36);
    });

    it('enforces configured max capacity does not exceed physical effective capacity', () => {
      const validRoom: Room = {
        id: 'room-valid',
        name: 'Room 101',
        rows: 4,
        columns: 4,
        studentsPerBench: 2, // theoretical = 32
        disabledSeats: [],
        maxCapacity: 30, // 30 <= 32: valid
      };
      expect(validateRoomCapacity(validRoom).isValid).toBe(true);

      const invalidRoom: Room = {
        id: 'room-invalid',
        name: 'Room 102',
        rows: 4,
        columns: 4,
        studentsPerBench: 2, // theoretical = 32
        disabledSeats: [{ row: 1, column: 1, seatIndex: 0 }], // effective = 31
        maxCapacity: 35, // 35 > 31: invalid!
      };
      const check = validateRoomCapacity(invalidRoom);
      expect(check.isValid).toBe(false);
      expect(check.error).toContain('cannot exceed effective physical capacity');
    });
  });

  describe('TASK-1.2 & TASK-1.3: Store Exam CRUD, Duplication & Status', () => {
    it('creates a new exam entity with factory defaults', () => {
      const exam = createNewExam({
        name: 'Semester Exam 2026',
        session: 'FN',
      });
      expect(exam.id).toMatch(/^exam-/);
      expect(exam.name).toBe('Semester Exam 2026');
      expect(exam.examName).toBe('Semester Exam 2026');
      expect(exam.status).toBe('draft');
      expect(exam.institutionName).toBe('ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY');
      expect(exam.timezone).toBe('Asia/Kolkata');
    });

    it('sets exam details into store and keeps track of active exam', () => {
      const store = useAppStore.getState();
      store.setExamDetails({
        examName: 'B.Tech S5 Regular',
        examDate: '2026-10-25',
        session: 'FN',
        startTime: '09:30',
        endTime: '12:30',
      });

      const updated = useAppStore.getState();
      expect(updated.exam).toBeDefined();
      expect(updated.exam?.name).toBe('B.Tech S5 Regular');
      expect(updated.activeExamId).toBe(updated.exam?.id);
      expect(updated.exams).toHaveLength(1);
    });

    it('duplicates an existing exam configuration with (Copy) suffix and draft status', () => {
      const store = useAppStore.getState();
      store.setExamDetails({
        examName: 'Original Exam',
        examDate: '2026-10-25',
        session: 'FN',
        status: 'active',
      });

      const originalId = useAppStore.getState().exam?.id;
      const duplicated = store.duplicateExam(originalId);

      expect(duplicated.name).toBe('Original Exam (Copy)');
      expect(duplicated.status).toBe('draft');
      expect(duplicated.id).not.toBe(originalId);

      const currentStore = useAppStore.getState();
      expect(currentStore.exams).toHaveLength(2);
      expect(currentStore.activeExamId).toBe(duplicated.id);
    });

    it('archives an active exam successfully', () => {
      const store = useAppStore.getState();
      store.setExamDetails({
        examName: 'Exam to Archive',
        examDate: '2026-10-25',
        session: 'FN',
        status: 'active',
      });

      store.archiveExam();

      const updated = useAppStore.getState();
      expect(updated.exam?.status).toBe('archived');
      expect(updated.exams.find((e) => e.id === updated.activeExamId)?.status).toBe('archived');
    });

    it('manages allocation version snapshots and finalization locking', () => {
      const store = useAppStore.getState();
      store.setExamDetails({
        examName: 'Versioned Exam',
        examDate: '2026-10-25',
        session: 'FN',
      });

      const versionId = 'version-1';
      const currentExam = useAppStore.getState().exam!;
      store.createAllocationVersion({
        id: versionId,
        examId: currentExam.id,
        versionNumber: 1,
        status: 'draft',
        algorithmVersion: '1.0.0',
        seed: 42,
        generatedAt: new Date().toISOString(),
        summary: {
          totalStudents: 30,
          assignedStudents: 30,
          unassignedStudents: 0,
          totalAvailableSeats: 40,
          unusedSeats: 10,
          totalConflicts: 0,
          qualityScore: 100,
        },
        assignments: [],
      });

      expect(store.getActiveVersion()?.status).toBe('draft');
      expect(store.getActiveVersion()?.versionNumber).toBe(1);

      // Finalize active version
      store.finalizeActiveVersion();
      expect(store.getActiveVersion()?.status).toBe('finalized');
      expect(store.getActiveVersion()?.finalizedAt).toBeDefined();

      // Mark version superseded
      store.markVersionSuperseded(versionId);
      expect(useAppStore.getState().allocationVersions[0].status).toBe('superseded');
    });
  });
});
