import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildValidationReport } from '../algorithms/validator';
import type { ExamDetails } from '../models/exam';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import type { SeatingRules, SeatingArrangement, ValidationReport } from '../models/arrangement';
import { draftStorage } from '../storage/draftStorage';
import { applySeatSwapToAssignments, type SeatSelection } from './historyManager';

export type StoreSnapshot = {
  exam?: ExamDetails;
  classrooms: Classroom[];
  students: Student[];
  rules: SeatingRules;
  arrangement?: SeatingArrangement;
  validation?: ValidationReport;
  lastActiveStep: string;
};

export type AppState = StoreSnapshot & {
  history: StoreSnapshot[];
  future: StoreSnapshot[];

  // Actions
  setExamDetails: (exam: ExamDetails) => void;
  addClassroom: (classroom: Classroom) => void;
  setClassrooms: (classrooms: Classroom[]) => void;
  updateClassroom: (id: string, classroom: Classroom) => void;
  deleteClassroom: (id: string) => void;
  setStudents: (students: Student[]) => void;
  setRules: (rules: SeatingRules) => void;
  setArrangement: (arrangement: SeatingArrangement) => void;
  setValidation: (validation: ValidationReport) => void;
  setLastActiveStep: (step: string) => void;
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
};

const createSnapshot = (state: AppState): StoreSnapshot => ({
  exam: state.exam,
  classrooms: state.classrooms,
  students: state.students,
  rules: state.rules,
  arrangement: state.arrangement,
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
    (set) => ({
      exam: undefined,
      classrooms: [],
      students: [],
      rules: defaultRules,
      arrangement: undefined,
      validation: undefined,
      lastActiveStep: '/exam',
      history: [],
      future: [],

      setExamDetails: (exam) =>
        set((state) => commitWithHistory(state, { exam })),
      addClassroom: (classroom) =>
        set((state) => commitWithHistory(state, {
          classrooms: [...state.classrooms, classroom],
        })),
      setClassrooms: (classrooms) =>
        set((state) => commitWithHistory(state, { classrooms })),
      updateClassroom: (id, classroom) =>
        set((state) => commitWithHistory(state, {
          classrooms: state.classrooms.map((c) => (c.id === id ? classroom : c)),
        })),
      deleteClassroom: (id) =>
        set((state) => commitWithHistory(state, {
          classrooms: state.classrooms.filter((c) => c.id !== id),
        })),
      setStudents: (students) =>
        set((state) => commitWithHistory(state, { students })),
      setRules: (rules) =>
        set((state) => commitWithHistory(state, { rules })),
      setArrangement: (arrangement) =>
        set((state) => commitWithHistory(state, { arrangement })),
      setValidation: (validation) =>
        set((state) => commitWithHistory(state, { validation })),
      setLastActiveStep: (step) =>
        set({ lastActiveStep: step }),
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
                    return { ...assignment, studentId: studentBId };
                  }

                  if (assignment.studentId === studentBId) {
                    return { ...assignment, studentId: studentAId };
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

          const nextValidation = state.classrooms.length > 0 && state.students.length > 0
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
          exam: undefined,
          classrooms: [],
          students: [],
          rules: defaultRules,
          arrangement: undefined,
          validation: undefined,
          lastActiveStep: '/exam',
          history: [],
          future: [],
        }),
    }),
    {
      name: 'exam-seating-draft',
      storage: draftStorage as any,
      partialize: (state) => ({
        exam: state.exam,
        classrooms: state.classrooms,
        students: state.students,
        rules: state.rules,
        arrangement: state.arrangement,
        validation: state.validation,
        lastActiveStep: state.lastActiveStep,
      }) as any,
    }
  )
);
