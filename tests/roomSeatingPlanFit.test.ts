import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoomSeatingPlanSheet } from '../src/export/templates/RoomSeatingPlanSheet';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat } from '../src/models/arrangement';
import type { Exam } from '../src/models/exam';

describe('Room Seating Plan Sheet Single-Sheet Fit Verification', () => {
  const sampleExam: Exam = {
    id: 'exam-2026',
    name: 'University Degree Examinations',
    examName: 'University Degree Examinations',
    date: '2026-10-25',
    examDate: '2026-10-25',
    session: 'FN',
    startTime: '09:30',
    endTime: '12:30',
    institutionName: 'Albertian Institute of Science and Technology',
    institutionLocation: 'Kalamassery, Kochi - 682022',
    examCode: 'KTU-BTECH-2026',
    documentCode: 'AISAT/EXAM/FORM/04',
    status: 'active',
  };

  const createRoomWithAssignments = (rows: number, cols: number, studentsPerBench = 2): {
    room: Room;
    candidates: ExamCandidate[];
    assignments: AssignedSeat[];
  } => {
    const room: Room = {
      id: `hall-${rows}x${cols}`,
      name: `Hall ${rows}x${cols}`,
      rows,
      columns: cols,
      studentsPerBench,
      usableCapacity: rows * cols * studentsPerBench,
      disabledSeats: [],
      blockedBenches: [],
      active: true,
      roomOrder: 1,
    };

    const count = rows * cols * studentsPerBench;
    const candidates: ExamCandidate[] = Array.from({ length: count }, (_, i) => ({
      id: `cand-${i + 1}`,
      registerNumber: `CS${String(i + 1).padStart(3, '0')}`,
      name: `Candidate ${i + 1}`,
      branch: 'CSE',
      semester: 'S6',
      subjectCode: 'CS601',
    }));

    const assignments: AssignedSeat[] = [];
    let candIdx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let s = 0; s < studentsPerBench; s++) {
          if (candIdx < candidates.length) {
            assignments.push({
              classroomId: room.id,
              roomId: room.id,
              row: r,
              column: c,
              seatIndex: s,
              position: s,
              studentId: candidates[candIdx].id,
              candidateId: candidates[candIdx].id,
            });
            candIdx++;
          }
        }
      }
    }

    return { room, candidates, assignments };
  };

  it('renders with fit-single-page and landscape orientation classes', () => {
    const { room, candidates, assignments } = createRoomWithAssignments(5, 4, 2);
    const html = renderToStaticMarkup(
      React.createElement(RoomSeatingPlanSheet, {
        exam: sampleExam,
        rooms: [room],
        assignments,
        students: candidates,
      })
    );

    expect(html).toContain('fit-single-page');
    expect(html).toContain('landscape');
    expect(html).toContain('room-seating-plan-wrapper');
  }, 15000);

  it('embeds print @page landscape orientation rules to ensure browser print dialog uses A4 landscape', () => {
    const { room, candidates, assignments } = createRoomWithAssignments(5, 4, 2);
    const html = renderToStaticMarkup(
      React.createElement(RoomSeatingPlanSheet, {
        exam: sampleExam,
        rooms: [room],
        assignments,
        students: candidates,
      })
    );

    expect(html).toContain('@media print');
    expect(html).toContain('size: A4 landscape !important');
    expect(html).toContain('margin: 5mm 6mm !important');
  });

  it('scales gracefully across varying grid sizes (small 2x2, standard 5x4, dense 8x6, dense 10x5)', () => {
    const gridSizes = [
      { rows: 2, cols: 2 },
      { rows: 5, cols: 4 },
      { rows: 8, cols: 6 },
      { rows: 10, cols: 5 },
    ];

    gridSizes.forEach(({ rows, cols }) => {
      const { room, candidates, assignments } = createRoomWithAssignments(rows, cols, 2);
      const html = renderToStaticMarkup(
        React.createElement(RoomSeatingPlanSheet, {
          exam: sampleExam,
          rooms: [room],
          assignments,
          students: candidates,
        })
      );

      // Verify all row bench keys are rendered
      expect(html).toContain(`R1-C1`);
      expect(html).toContain(`R${rows}-C${cols}`);

      // Verify candidate register numbers are present
      expect(html).toContain('CS001');

      // Verify Front Board and Verification Legend are present
      expect(html).toContain('FRONT BOARD / TEACHER&#x27;S DESK / ENTRANCE');
      expect(html).toContain('Superintendent Verification:');
      expect(html).toContain('Hall Occupancy:');
    });
  });

  it('filters by targetRoomId when specified, rendering only that single room sheet', () => {
    const room1 = createRoomWithAssignments(4, 3, 2);
    const room2 = createRoomWithAssignments(5, 4, 2);
    room2.room.id = 'hall-target-room';

    const html = renderToStaticMarkup(
      React.createElement(RoomSeatingPlanSheet, {
        exam: sampleExam,
        rooms: [room1.room, room2.room],
        assignments: [...room1.assignments, ...room2.assignments],
        students: [...room1.candidates, ...room2.candidates],
        targetRoomId: 'hall-target-room',
      })
    );

    expect(html).toContain('HALL: HALL 5X4');
    expect(html).not.toContain('HALL: HALL 4X3');
  });
});
