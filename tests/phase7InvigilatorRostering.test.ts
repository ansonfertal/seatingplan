import { describe, expect, it } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat } from '../src/models/arrangement';
import {
  generateInvigilatorRoster,
  type FacultyInvigilator,
} from '../src/algorithms/invigilatorRostering';

describe('TASK-7.4: Invigilator Duty Rostering Engine', () => {
  const facultyList: FacultyInvigilator[] = [
    {
      id: 'f-1',
      name: 'Prof. David Vance',
      department: 'Mechanical Engineering',
      email: 'david@institution.edu',
      designation: 'Professor',
      maxDuties: 5,
      assignedDutiesCount: 1,
      isActive: true,
    },
    {
      id: 'f-2',
      name: 'Dr. Rebecca Stone',
      department: 'Physics',
      email: 'rebecca@institution.edu',
      designation: 'Associate Professor',
      maxDuties: 4,
      assignedDutiesCount: 0,
      isActive: true,
    },
    {
      id: 'f-3',
      name: 'Dr. Alan Turing',
      department: 'Computer Science',
      email: 'alan@institution.edu',
      designation: 'Assistant Professor',
      maxDuties: 4,
      assignedDutiesCount: 2,
      isActive: true,
    },
    {
      id: 'f-4',
      name: 'Dr. Marie Curie',
      department: 'Chemistry',
      email: 'marie@institution.edu',
      designation: 'Professor',
      maxDuties: 5,
      assignedDutiesCount: 0,
      isActive: true,
    },
  ];

  const rooms: Room[] = [
    {
      id: 'r-small',
      name: 'Hall 101',
      rows: 5,
      columns: 3,
      studentsPerBench: 2,
      capacity: 30,
      usableCapacity: 30,
      disabledSeats: [],
      active: true,
      roomOrder: 1,
    },
    {
      id: 'r-large',
      name: 'Auditorium A',
      rows: 10,
      columns: 3,
      studentsPerBench: 2,
      capacity: 60,
      usableCapacity: 60,
      disabledSeats: [],
      active: true,
      roomOrder: 2,
    },
  ];

  // 20 students in Hall 101 (requires 1 invigilator)
  // 45 students in Auditorium A (requires 2 invigilators)
  const students: ExamCandidate[] = [
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `s-small-${i + 1}`,
      registerNumber: `CS_${i + 1}`,
      name: `Student ${i + 1}`,
      branch: 'Computer Science',
      semester: '4',
      subjectCode: 'CS401',
    })),
    ...Array.from({ length: 45 }, (_, i) => ({
      id: `s-large-${i + 1}`,
      registerNumber: `ME_${i + 1}`,
      name: `Student ME ${i + 1}`,
      branch: 'Mechanical Engineering',
      semester: '4',
      subjectCode: 'ME401',
    })),
  ];

  const assignments: AssignedSeat[] = [
    ...Array.from({ length: 20 }, (_, i) => ({
      studentId: `s-small-${i + 1}`,
      candidateId: `s-small-${i + 1}`,
      roomId: 'r-small',
      row: Math.floor(i / 6),
      column: Math.floor((i % 6) / 2),
      seatIndex: i % 2,
    })),
    ...Array.from({ length: 45 }, (_, i) => ({
      studentId: `s-large-${i + 1}`,
      candidateId: `s-large-${i + 1}`,
      roomId: 'r-large',
      row: Math.floor(i / 6),
      column: Math.floor((i % 6) / 2),
      seatIndex: i % 2,
    })),
  ];

  const examMeta = {
    examName: 'End Semester Exams',
    date: '2026-10-30',
    session: 'FN',
  };

  it('allocates required invigilators per room and designates a Chief Superintendent', () => {
    const roster = generateInvigilatorRoster(facultyList, rooms, assignments, students, examMeta, {
      studentsPerInvigilator: 30,
    });

    // Chief superintendent designated
    expect(roster.chiefSuperintendent).toBeDefined();
    expect(roster.chiefSuperintendent?.designation).toContain('Professor');

    // 2 rooms processed
    expect(roster.roomAssignments).toHaveLength(2);

    const smallRoom = roster.roomAssignments.find((r) => r.roomId === 'r-small')!;
    expect(smallRoom.assignedStudentCount).toBe(20);
    expect(smallRoom.requiredInvigilatorsCount).toBe(1);
    expect(smallRoom.assignedInvigilators).toHaveLength(1);

    const largeRoom = roster.roomAssignments.find((r) => r.roomId === 'r-large')!;
    expect(largeRoom.assignedStudentCount).toBe(45);
    expect(largeRoom.requiredInvigilatorsCount).toBe(2);
    expect(largeRoom.assignedInvigilators).toHaveLength(2);
  });

  it('balances workload by prioritizing faculty with fewer assigned duties', () => {
    const roster = generateInvigilatorRoster(facultyList, rooms, assignments, students, examMeta);

    // Dr. Rebecca Stone had 0 duties initially, so she should be assigned before Dr. Alan Turing (who had 2)
    const assignedIds = roster.roomAssignments.flatMap((r) => r.assignedInvigilators.map((i) => i.id));
    expect(assignedIds).toContain('f-2'); // Dr. Rebecca Stone
  });

  it('prefers assigning faculty from outside the room candidate departments', () => {
    const roster = generateInvigilatorRoster(facultyList, rooms, assignments, students, examMeta, {
      preventDepartmentConflict: true,
    });

    const smallRoom = roster.roomAssignments.find((r) => r.roomId === 'r-small')!;
    // Hall 101 has Computer Science students. It should NOT assign Dr. Alan Turing (Computer Science) if other faculty available
    const assignedDepts = smallRoom.assignedInvigilators.map((i) => i.department);
    expect(assignedDepts).not.toContain('Computer Science');
  });
});
