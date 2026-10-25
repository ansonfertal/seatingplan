import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildValidationReport } from '../algorithms/validator';
import type { Exam, ExamDetails } from '../models/exam';
import { createNewExam } from '../models/exam';
import type { Classroom, Room } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';
import type {
  AllocationVersion,
  AssignedSeat,
  SeatingArrangement,
  SeatingRules,
  ValidationReport,
} from '../models/arrangement';
import { draftStorage, clearDraft } from '../storage/draftStorage';
import { applySeatSwapToAssignments, type SeatSelection } from './historyManager';
import { branchDraftFromFinalized } from './versionManager';

export type StoreSnapshot = {
  exams: Exam[];
  activeExamId?: string;
  exam?: Exam;
  classrooms: Room[];
  students: ExamCandidate[];
  rules: SeatingRules;
  arrangement?: SeatingArrangement;
  allocationVersions: AllocationVersion[];
  activeVersionId?: string;
  validation?: ValidationReport;
  lastActiveStep: string;
};

export type AppState = StoreSnapshot & {
  history: StoreSnapshot[];
  future: StoreSnapshot[];

  // Exam Actions
  setExamDetails: (exam: ExamDetails | Exam) => void;
  createExam: (overrides?: Partial<ExamDetails>) => Exam;
  updateExam: (id: string, updates: Partial<ExamDetails>) => void;
  duplicateExam: (id?: string) => Exam;
  archiveExam: (id?: string) => void;
  deleteExam: (id: string) => void;
  setActiveExam: (id: string) => void;

  // Classroom Actions
  addClassroom: (classroom: Classroom) => void;
  setClassrooms: (classrooms: Classroom[]) => void;
  updateClassroom: (id: string, classroom: Classroom) => void;
  deleteClassroom: (id: string) => void;

  // Student Actions
  setStudents: (students: Student[]) => void;
  clearAllStudentData: () => void;

  // Rule Actions
  setRules: (rules: SeatingRules) => void;

  // Arrangement & Versioning Actions
  setArrangement: (arrangement: SeatingArrangement) => void;
  createAllocationVersion: (version: AllocationVersion) => void;
  finalizeActiveVersion: () => void;
  markVersionSuperseded: (versionId: string) => void;
  getActiveVersion: () => AllocationVersion | undefined;
  setActiveVersionId: (versionId: string) => void;
  applyValidatedSwap: (newAssignments: AssignedSeat[], newValidation: ValidationReport) => void;
  setValidation: (validation: ValidationReport) => void;
  setLastActiveStep: (step: string) => void;

  // Manual Editing Actions
  swapStudents: (studentAId: string, studentBId: string) => void;
  applySeatSwap: (fromSeat: SeatSelection, toSeat: SeatSelection) => void;
  undo: () => void;
  redo: () => void;
  resetStore: () => void;
};

const defaultRules: SeatingRules = {
  sameBenchSeparation: true,
  horizontalAdjacency: true,
  verticalAdjacency: true,
  diagonalAdjacency: false,
  sameSemesterSeparation: true,
  sameSubjectCodeSeparation: true,
  registerNumberOrder: 'sorted',
  minimizeClassroomsUsed: true,
  differentArrangementPerDate: true,
};

const createSnapshot = (state: AppState): StoreSnapshot => ({
  exams: state.exams,
  activeExamId: state.activeExamId,
  exam: state.exam,
  classrooms: state.classrooms,
  students: state.students,
  rules: state.rules,
  arrangement: state.arrangement,
  allocationVersions: state.allocationVersions,
  activeVersionId: state.activeVersionId,
  validation: state.validation,
  lastActiveStep: state.lastActiveStep,
});

const commitWithHistory = (state: AppState, next: Partial<StoreSnapshot>) => ({
  ...state,
  ...next,
  history: [...state.history, createSnapshot(state)].slice(-50),
  future: [],
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      exams: [],
      activeExamId: undefined,
      exam: undefined,
      classrooms: [],
      students: [],
      rules: defaultRules,
      arrangement: undefined,
      allocationVersions: [],
      activeVersionId: undefined,
      validation: undefined,
      lastActiveStep: '/exam',
      history: [],
      future: [],

      // --- Exam CRUD ---
      setExamDetails: (examInput) =>
        set((state) => {
          const now = new Date().toISOString();
          const targetId = examInput.id || state.exam?.id || `exam-${Date.now()}`;
          const normalizedExam: Exam = {
            id: targetId,
            name: examInput.name || examInput.examName || '',
            examName: examInput.examName || examInput.name || '',
            date: examInput.date || examInput.examDate || '',
            examDate: examInput.examDate || examInput.date || '',
            session: examInput.session || 'FN',
            startTime: examInput.startTime,
            endTime: examInput.endTime,
            durationMinutes: examInput.durationMinutes,
            isOvernight: examInput.isOvernight ?? false,
            timezone: examInput.timezone || 'Asia/Kolkata',
            academicYear: examInput.academicYear,
            semester: examInput.semester,
            selectedSemesters: examInput.selectedSemesters || [],
            selectedSubjectCodes: examInput.selectedSubjectCodes || [],
            institutionName: examInput.institutionName || 'ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY',
            institutionDepartment: examInput.institutionDepartment,
            institutionLocation: examInput.institutionLocation || 'KALAMASSERY',
            examCode: examInput.examCode,
            documentCode: examInput.documentCode || 'AISAT/Form/QPM17/F4',
            status: examInput.status || 'draft',
            coordinatorId: examInput.coordinatorId,
            coordinatorName: examInput.coordinatorName,
            adminId: examInput.adminId,
            adminName: examInput.adminName,
            invigilatorIds: examInput.invigilatorIds || [],
            invigilatorNames: examInput.invigilatorNames || [],
            createdAt: examInput.createdAt || state.exam?.createdAt || now,
            updatedAt: now,
          };

          const existingIndex = state.exams.findIndex((e) => e.id === targetId);
          let updatedExams: Exam[];
          if (existingIndex >= 0) {
            updatedExams = state.exams.map((e) => (e.id === targetId ? normalizedExam : e));
          } else {
            updatedExams = [...state.exams, normalizedExam];
          }

          return commitWithHistory(state, {
            exam: normalizedExam,
            activeExamId: targetId,
            exams: updatedExams,
          });
        }),

      createExam: (overrides) => {
        const newExam = createNewExam(overrides);
        set((state) =>
          commitWithHistory(state, {
            exams: [...state.exams, newExam],
            exam: newExam,
            activeExamId: newExam.id,
            classrooms: [],
            students: [],
            arrangement: undefined,
            allocationVersions: [],
            activeVersionId: undefined,
            validation: undefined,
            lastActiveStep: '/exam',
          })
        );
        return newExam;
      },

      updateExam: (id, updates) =>
        set((state) => {
          const now = new Date().toISOString();
          const target = state.exams.find((e) => e.id === id);
          if (!target) return state;

          const updated: Exam = {
            ...target,
            ...updates,
            id,
            name: updates.name || updates.examName || target.name,
            examName: updates.examName || updates.name || target.examName,
            date: updates.date || updates.examDate || target.date,
            examDate: updates.examDate || updates.date || target.examDate,
            updatedAt: now,
          };

          const nextExams = state.exams.map((e) => (e.id === id ? updated : e));
          const nextActiveExam = state.activeExamId === id ? updated : state.exam;

          return commitWithHistory(state, {
            exams: nextExams,
            exam: nextActiveExam,
          });
        }),

      duplicateExam: (id) => {
        const state = get();
        const targetId = id || state.activeExamId || state.exam?.id;
        const sourceExam = targetId ? state.exams.find((e) => e.id === targetId) || state.exam : state.exam;

        const baseExam = sourceExam || createNewExam();
        const now = new Date().toISOString();
        const duplicatedExam: Exam = {
          ...baseExam,
          id: `exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `${baseExam.name || baseExam.examName} (Copy)`,
          examName: `${baseExam.examName || baseExam.name} (Copy)`,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };

        set((s) =>
          commitWithHistory(s, {
            exams: [...s.exams, duplicatedExam],
            exam: duplicatedExam,
            activeExamId: duplicatedExam.id,
            // Carry forward classrooms but clear student allocations
            arrangement: undefined,
            allocationVersions: [],
            activeVersionId: undefined,
            validation: undefined,
            lastActiveStep: '/exam',
          })
        );

        return duplicatedExam;
      },

      archiveExam: (id) =>
        set((state) => {
          const targetId = id || state.activeExamId || state.exam?.id;
          if (!targetId) return state;

          const nextExams = state.exams.map((e) =>
            e.id === targetId ? { ...e, status: 'archived' as const, updatedAt: new Date().toISOString() } : e
          );
          const nextExam =
            state.exam && state.exam.id === targetId
              ? { ...state.exam, status: 'archived' as const, updatedAt: new Date().toISOString() }
              : state.exam;

          return commitWithHistory(state, {
            exams: nextExams,
            exam: nextExam,
          });
        }),

      deleteExam: (id) =>
        set((state) => {
          const nextExams = state.exams.filter((e) => e.id !== id);
          const isDeletingActive = state.activeExamId === id;
          const nextActiveExam = isDeletingActive ? (nextExams[0] ?? undefined) : state.exam;

          return commitWithHistory(state, {
            exams: nextExams,
            exam: nextActiveExam,
            activeExamId: nextActiveExam?.id,
          });
        }),

      setActiveExam: (id) =>
        set((state) => {
          const target = state.exams.find((e) => e.id === id);
          if (!target) return state;
          return {
            ...state,
            activeExamId: id,
            exam: target,
          };
        }),

      // --- Classroom Actions ---
      addClassroom: (classroom) =>
        set((state) =>
          commitWithHistory(state, {
            classrooms: [...state.classrooms, classroom],
          })
        ),
      setClassrooms: (classrooms) =>
        set((state) => commitWithHistory(state, { classrooms })),
      updateClassroom: (id, classroom) =>
        set((state) =>
          commitWithHistory(state, {
            classrooms: state.classrooms.map((c) => (c.id === id ? classroom : c)),
          })
        ),
      deleteClassroom: (id) =>
        set((state) =>
          commitWithHistory(state, {
            classrooms: state.classrooms.filter((c) => c.id !== id),
          })
        ),

      // --- Student Actions ---
      setStudents: (students) =>
        set((state) => commitWithHistory(state, { students })),
      clearAllStudentData: () => {
        clearDraft();
        set((state) =>
          commitWithHistory(state, {
            students: [],
            arrangement: undefined,
            allocationVersions: [],
            activeVersionId: undefined,
            validation: undefined,
          })
        );
      },

      // --- Rule Actions ---
      setRules: (rules) =>
        set((state) => commitWithHistory(state, { rules })),

      // --- Arrangement & Versioning ---
      setArrangement: (arrangement) =>
        set((state) => commitWithHistory(state, { arrangement })),

      createAllocationVersion: (version) =>
        set((state) =>
          commitWithHistory(state, {
            allocationVersions: [...state.allocationVersions, version],
            activeVersionId: version.id,
          })
        ),

      finalizeActiveVersion: () =>
        set((state) => {
          const now = new Date().toISOString();
          const activeVersion = state.allocationVersions.find((v) => v.id === state.activeVersionId);
          if (!activeVersion) return state;

          const updatedVersion: AllocationVersion = {
            ...activeVersion,
            status: 'finalized',
            finalizedAt: now,
          };

          const nextVersions = state.allocationVersions.map((v) => {
            if (v.id === updatedVersion.id) return updatedVersion;
            if (v.examId === activeVersion.examId && v.status === 'finalized') {
              return { ...v, status: 'superseded' as const, supersededAt: now };
            }
            return v;
          });

          return commitWithHistory(state, {
            allocationVersions: nextVersions,
            arrangement: state.arrangement
              ? { ...state.arrangement, version: updatedVersion }
              : undefined,
          });
        }),

      markVersionSuperseded: (versionId) =>
        set((state) => {
          const now = new Date().toISOString();
          const nextVersions = state.allocationVersions.map((v) =>
            v.id === versionId ? { ...v, status: 'superseded' as const, supersededAt: now } : v
          );
          return commitWithHistory(state, {
            allocationVersions: nextVersions,
          });
        }),

      getActiveVersion: () => {
        const state = get();
        return state.allocationVersions.find((v) => v.id === state.activeVersionId);
      },

      setActiveVersionId: (versionId) =>
        set((state) => {
          const target = state.allocationVersions.find((v) => v.id === versionId);
          if (!target) return state;

          const updatedArrangement: SeatingArrangement | undefined = state.arrangement
            ? {
                ...state.arrangement,
                assignments: target.assignments,
                statistics: target.summary,
                version: target,
              }
            : undefined;

          return commitWithHistory(state, {
            activeVersionId: versionId,
            arrangement: updatedArrangement,
            validation: target.validationReport || state.validation,
          });
        }),

      applyValidatedSwap: (newAssignments, newValidation) =>
        set((state) => {
          const activeVersion = state.allocationVersions.find((v) => v.id === state.activeVersionId);
          const now = new Date().toISOString();

          // If active version is finalized, automatically branch into a new draft version (PRD Section 4.6)
          if (activeVersion && activeVersion.status === 'finalized') {
            const { updatedVersions, newVersion } = branchDraftFromFinalized(
              state.allocationVersions,
              activeVersion.id,
              newAssignments,
              newValidation
            );

            const updatedArrangement: SeatingArrangement = {
              exam: state.exam || state.arrangement?.exam || ({} as any),
              classrooms: state.classrooms,
              assignments: newAssignments,
              generatedAt: now,
              generationSeed: newVersion.seed,
              statistics: newValidation.summary,
              version: newVersion,
            };

            return commitWithHistory(state, {
              allocationVersions: updatedVersions,
              activeVersionId: newVersion.id,
              arrangement: updatedArrangement,
              validation: newValidation,
            });
          }

          // Otherwise, update existing draft active version
          const updatedVersions = state.allocationVersions.map((v) => {
            if (v.id === state.activeVersionId) {
              return {
                ...v,
                assignments: newAssignments,
                summary: newValidation.summary,
                validationReport: newValidation,
              };
            }
            return v;
          });

          const updatedArrangement: SeatingArrangement | undefined = state.arrangement
            ? {
                ...state.arrangement,
                assignments: newAssignments,
                statistics: newValidation.summary,
              }
            : undefined;

          return commitWithHistory(state, {
            allocationVersions: updatedVersions,
            arrangement: updatedArrangement,
            validation: newValidation,
          });
        }),

      setValidation: (validation) =>
        set((state) => commitWithHistory(state, { validation })),

      setLastActiveStep: (step) =>
        set({ lastActiveStep: step }),

      // --- Manual Swap & Editing ---
      swapStudents: (studentAId, studentBId) =>
        set((state) => {
          const studentIndexA = state.students.findIndex((student) => student.id === studentAId);
          const studentIndexB = state.students.findIndex((student) => student.id === studentBId);

          if (studentIndexA === -1 || studentIndexB === -1) {
            return state;
          }

          const nextStudents = [...state.students];
          [nextStudents[studentIndexA], nextStudents[studentIndexB]] = [
            nextStudents[studentIndexB],
            nextStudents[studentIndexA],
          ];

          const nextArrangement = state.arrangement
            ? {
                ...state.arrangement,
                assignments: state.arrangement.assignments.map((assignment) => {
                  if (assignment.studentId === studentAId) {
                    return { ...assignment, studentId: studentBId, candidateId: studentBId };
                  }
                  if (assignment.studentId === studentBId) {
                    return { ...assignment, studentId: studentAId, candidateId: studentAId };
                  }
                  return assignment;
                }),
              }
            : state.arrangement;

          return commitWithHistory(state, {
            students: nextStudents,
            arrangement: nextArrangement,
          });
        }),

      applySeatSwap: (fromSeat, toSeat) =>
        set((state) => {
          if (!state.arrangement) {
            return state;
          }

          const nextAssignments = applySeatSwapToAssignments(
            state.arrangement.assignments,
            fromSeat,
            toSeat
          );

          if (nextAssignments === state.arrangement.assignments) {
            return state;
          }

          const nextArrangement = {
            ...state.arrangement,
            assignments: nextAssignments,
          };

          const nextValidation =
            state.classrooms.length > 0 && state.students.length > 0
              ? buildValidationReport(nextAssignments, state.students, state.classrooms, state.rules)
              : state.validation;

          return commitWithHistory(state, {
            arrangement: nextArrangement,
            validation: nextValidation,
          });
        }),

      undo: () =>
        set((state) => {
          if (state.history.length === 0) {
            return state;
          }

          const previous = state.history[state.history.length - 1];
          return {
            ...previous,
            history: state.history.slice(0, -1),
            future: [createSnapshot(state), ...state.future].slice(0, 50),
          };
        }),

      redo: () =>
        set((state) => {
          if (state.future.length === 0) {
            return state;
          }

          const next = state.future[0];
          return {
            ...next,
            history: [...state.history, createSnapshot(state)].slice(-50),
            future: state.future.slice(1),
          };
        }),

      resetStore: () =>
        set({
          exams: [],
          activeExamId: undefined,
          exam: undefined,
          classrooms: [],
          students: [],
          rules: defaultRules,
          arrangement: undefined,
          allocationVersions: [],
          activeVersionId: undefined,
          validation: undefined,
          lastActiveStep: '/exam',
          history: [],
          future: [],
        }),
    }),
    {
      name: 'exam-seating-draft',
      storage: draftStorage as any,
      partialize: (state) =>
        ({
          exams: state.exams,
          activeExamId: state.activeExamId,
          exam: state.exam,
          classrooms: state.classrooms,
          students: state.students,
          rules: state.rules,
          arrangement: state.arrangement,
          allocationVersions: state.allocationVersions,
          activeVersionId: state.activeVersionId,
          validation: state.validation,
          lastActiveStep: state.lastActiveStep,
        }) as any,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState> | undefined;
        return {
          ...currentState,
          ...persisted,
          rules: { ...defaultRules, ...(persisted?.rules ?? {}) },
          exams: persisted?.exams || (persisted?.exam ? [persisted.exam] : []),
        };
      },
    }
  )
);
