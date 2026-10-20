import type { Room } from '../models/classroom';
import type { ExamCandidate } from '../models/student';
import type { AssignedSeat } from '../models/arrangement';

export type FacultyInvigilator = {
  id: string;
  name: string;
  department: string;
  email: string;
  designation: string; // e.g. 'Professor', 'Associate Professor', 'Assistant Professor'
  maxDuties: number;
  assignedDutiesCount: number;
  isActive: boolean;
};

export type RoomInvigilatorAssignment = {
  roomId: string;
  roomName: string;
  assignedStudentCount: number;
  requiredInvigilatorsCount: number;
  assignedInvigilators: FacultyInvigilator[];
  departmentClashes: string[]; // Warnings if faculty from same department as students in room
};

export type InvigilatorRosterResult = {
  examName: string;
  date: string;
  session: string;
  chiefSuperintendent?: FacultyInvigilator;
  roomAssignments: RoomInvigilatorAssignment[];
  totalFacultyAssigned: number;
  unfulfilledRoomsCount: number;
  warnings: string[];
};

export type RosteringOptions = {
  studentsPerInvigilator?: number; // default: 30 students per invigilator
  preventDepartmentConflict?: boolean; // default: true (faculty should not invigilate their own department)
};

/**
 * Procedural workload-balancing allocator for examination invigilators (Phase 7 TASK-7.4).
 * - Distributes invigilator duties fairly according to current workload and maxDuties limit.
 * - Enforces minimum 1 invigilator per room, +1 per additional 30 candidates.
 * - Flags or avoids home department conflicts where possible.
 */
export function generateInvigilatorRoster(
  facultyList: FacultyInvigilator[],
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[],
  examMetadata: { examName: string; date: string; session: string },
  options: RosteringOptions = {}
): InvigilatorRosterResult {
  const { studentsPerInvigilator = 30, preventDepartmentConflict = true } = options;

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const warnings: string[] = [];

  // Group candidate assignments by room and determine room departments
  const roomStudentMap = new Map<string, ExamCandidate[]>();
  assignments.forEach((a) => {
    const rId = a.roomId || a.classroomId;
    const sId = a.studentId || a.candidateId;
    if (rId && sId) {
      const student = studentMap.get(sId);
      if (student) {
        const list = roomStudentMap.get(rId) || [];
        list.push(student);
        roomStudentMap.set(rId, list);
      }
    }
  });

  // Track faculty duty pool with local copies to prevent state mutation
  const facultyPool = facultyList
    .filter((f) => f.isActive)
    .map((f) => ({ ...f }));

  // Rank designations: Full Professor > Associate Professor > Assistant Professor
  const getFacultyRank = (designation: string): number => {
    const lower = designation.toLowerCase().trim();
    if (lower === 'professor' || lower.startsWith('professor')) return 3;
    if (lower.includes('associate')) return 2;
    if (lower.includes('assistant')) return 1;
    return 0;
  };

  // Pick Chief Superintendent: Senior-most faculty (highest rank) with availability
  const seniorFaculty = facultyPool
    .filter((f) => f.assignedDutiesCount < f.maxDuties)
    .sort((a, b) => {
      const rankA = getFacultyRank(a.designation);
      const rankB = getFacultyRank(b.designation);
      if (rankA !== rankB) return rankB - rankA;
      return a.assignedDutiesCount - b.assignedDutiesCount;
    });

  const chiefSuperintendent = seniorFaculty[0];
  const sessionAssignedFacultyIds = new Set<string>();

  if (chiefSuperintendent) {
    chiefSuperintendent.assignedDutiesCount++;
    sessionAssignedFacultyIds.add(chiefSuperintendent.id);
  } else {
    warnings.push('No available faculty found for Chief Superintendent duty.');
  }

  const roomAssignments: RoomInvigilatorAssignment[] = [];
  let unfulfilledRoomsCount = 0;

  // Process rooms in configured order
  const activeRooms = rooms.filter((r) => r.active !== false);

  activeRooms.forEach((room) => {
    const roomStudents = roomStudentMap.get(room.id) || [];
    const studentCount = roomStudents.length;

    // Skip empty rooms
    if (studentCount === 0) return;

    // Required invigilators: minimum 1, +1 for every 30 students beyond initial 30
    const requiredCount = Math.max(1, Math.ceil(studentCount / studentsPerInvigilator));

    // Determine branches present in room
    const roomBranches = new Set(roomStudents.map((s) => s.branch.trim().toUpperCase()));

    const assignedToRoom: FacultyInvigilator[] = [];
    const departmentClashes: string[] = [];

    for (let i = 0; i < requiredCount; i++) {
      // Find candidate faculty: ensure not already assigned anywhere in this session sitting
      const available = facultyPool
        .filter(
          (f) =>
            !sessionAssignedFacultyIds.has(f.id) &&
            f.assignedDutiesCount < f.maxDuties
        )
        .sort((a, b) => a.assignedDutiesCount - b.assignedDutiesCount);

      if (available.length === 0) {
        unfulfilledRoomsCount++;
        warnings.push(`Insufficient faculty to fully staff Room ${room.name} (Shortage: ${requiredCount - assignedToRoom.length}).`);
        break;
      }

      let chosen: FacultyInvigilator | undefined;

      if (preventDepartmentConflict) {
        // Prefer faculty whose department does NOT match any students in this room
        chosen = available.find((f) => !roomBranches.has(f.department.trim().toUpperCase()));
      }

      // If no conflict-free faculty available, pick from lowest workload pool and log warning
      if (!chosen) {
        chosen = available[0];
        if (roomBranches.has(chosen.department.trim().toUpperCase())) {
          departmentClashes.push(`${chosen.name} (${chosen.department}) is invigilating students from own department.`);
        }
      }

      chosen.assignedDutiesCount++;
      sessionAssignedFacultyIds.add(chosen.id);
      assignedToRoom.push(chosen);
    }

    roomAssignments.push({
      roomId: room.id,
      roomName: room.name,
      assignedStudentCount: studentCount,
      requiredInvigilatorsCount: requiredCount,
      assignedInvigilators: assignedToRoom,
      departmentClashes,
    });
  });

  const totalFacultyAssigned =
    (chiefSuperintendent ? 1 : 0) +
    roomAssignments.reduce((acc, r) => acc + r.assignedInvigilators.length, 0);

  return {
    examName: examMetadata.examName,
    date: examMetadata.date,
    session: examMetadata.session,
    chiefSuperintendent,
    roomAssignments,
    totalFacultyAssigned,
    unfulfilledRoomsCount,
    warnings,
  };
}
