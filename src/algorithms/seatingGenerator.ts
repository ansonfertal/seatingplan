import type { SeatingRules, AssignedSeat } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import { allocateStudentsToRooms } from './roomAllocation';
import { buildSeatGraph, getSeatKey } from './seatGraph';
import { createSeedFromString, createSeededRandom } from './random';

export function generateInitialSeating(
  students: Student[],
  classrooms: Classroom[],
  rules: SeatingRules,
  seed = 'default-seed'
): AssignedSeat[] {
  const assignments: AssignedSeat[] = [];
  const deterministicSeed = createSeedFromString(seed.toString());
  const roomAssignments = allocateStudentsToRooms(students, classrooms, deterministicSeed);

  const roomMap = new Map(classrooms.map((classroom) => [classroom.id, classroom]));

  roomAssignments.allocations.forEach(({ classroomId, studentIds }) => {
    const classroom = roomMap.get(classroomId);
    if (!classroom) return;

    const graph = buildSeatGraph(classroom, rules);
    const seatOrder = [...graph.nodes];
    const random = createSeededRandom(deterministicSeed + classroomId.length * 31);

    seatOrder.sort(() => random() - 0.5);

    const seatAssignments = new Map<string, string>();
    const roomStudents = students.filter((student) => studentIds.includes(student.id));

    const sortedStudents = [...roomStudents].sort((a, b) => b.branch.localeCompare(a.branch));

    sortedStudents.forEach((student) => {
      let bestSeat = seatOrder[0];
      let bestPenalty = Number.POSITIVE_INFINITY;

      seatOrder.forEach((seat) => {
        const seatKey = getSeatKey({
          row: seat.row,
          column: seat.column,
          seatIndex: seat.seatIndex,
        });

        if (seatAssignments.has(seatKey)) {
          return;
        }

        let penalty = 0;

        graph.adjacency[seatKey]?.forEach((neighborKey) => {
          const neighborStudentId = seatAssignments.get(neighborKey);
          if (!neighborStudentId) return;

          const neighborStudent = students.find((candidate) => candidate.id === neighborStudentId);
          if (!neighborStudent || neighborStudent.branch !== student.branch) {
            return;
          }

          penalty += 100;
        });

        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestSeat = seat;
        }
      });

      const chosenSeatKey = getSeatKey({
        row: bestSeat.row,
        column: bestSeat.column,
        seatIndex: bestSeat.seatIndex,
      });

      seatAssignments.set(chosenSeatKey, student.id);
      assignments.push({
        classroomId,
        row: bestSeat.row,
        column: bestSeat.column,
        seatIndex: bestSeat.seatIndex,
        studentId: student.id,
      });
    });
  });

  return assignments;
}
