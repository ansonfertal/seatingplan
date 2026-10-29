import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeatingNoticeSheet } from '../src/export/templates/SeatingNoticeSheet';
import { generateSeatingNoticePdf } from '../src/export/pdfPackGenerator';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat } from '../src/models/arrangement';
import type { Exam } from '../src/models/exam';

describe('Notice Board Display Sheet Multi-Classroom Packing & Pagination', () => {
  const sampleExam: Exam = {
    id: 'exam-nb-2026',
    name: 'B.Tech University Examinations',
    examName: 'B.Tech University Examinations',
    date: '2026-10-30',
    examDate: '2026-10-30',
    session: 'FN',
    startTime: '09:30',
    endTime: '12:30',
    institutionName: 'Albertian Institute of Science and Technology',
    institutionLocation: 'Kalamassery, Kochi - 682022',
    examCode: 'KTU-BTECH-2026',
    documentCode: 'AISAT/EXAM/NOTICE/01',
    status: 'active',
  };

  const createRoomWithCohorts = (
    roomId: string,
    roomName: string,
    cohortSpecs: Array<{ branch: string; semester: string; subjectCode: string; count: number; startRoll: number }>
  ): { room: Room; candidates: ExamCandidate[]; assignments: AssignedSeat[] } => {
    const totalCount = cohortSpecs.reduce((sum, c) => sum + c.count, 0);
    const room: Room = {
      id: roomId,
      name: roomName,
      rows: 5,
      columns: 4,
      studentsPerBench: 2,
      usableCapacity: 40,
      disabledSeats: [],
      blockedBenches: [],
      active: true,
      roomOrder: 1,
    };

    const candidates: ExamCandidate[] = [];
    const assignments: AssignedSeat[] = [];
    let seatPos = 0;

    cohortSpecs.forEach((spec) => {
      for (let i = 0; i < spec.count; i++) {
        const rollNum = `${spec.branch}${spec.startRoll + i}`;
        const cId = `${roomId}-${rollNum}`;
        candidates.push({
          id: cId,
          registerNumber: rollNum,
          name: `Student ${rollNum}`,
          branch: spec.branch,
          semester: spec.semester,
          subjectCode: spec.subjectCode,
        });

        assignments.push({
          classroomId: roomId,
          roomId,
          row: Math.floor(seatPos / 8),
          column: Math.floor((seatPos % 8) / 2),
          seatIndex: seatPos % 2,
          position: (seatPos % 2) + 1,
          studentId: cId,
          candidateId: cId,
        });
        seatPos++;
      }
    });

    return { room, candidates, assignments };
  };

  it('packs multiple classrooms onto one sheet when their whole details fit', () => {
    // 3 small halls with 1 cohort each (takes ~37mm each, well within the 215mm limit)
    const hall1 = createRoomWithCohorts('hall-101', 'Hall 101', [{ branch: 'CS', semester: 'S5', subjectCode: 'CS301', count: 10, startRoll: 1001 }]);
    const hall2 = createRoomWithCohorts('hall-102', 'Hall 102', [{ branch: 'EC', semester: 'S5', subjectCode: 'EC301', count: 8, startRoll: 2001 }]);
    const hall3 = createRoomWithCohorts('hall-103', 'Hall 103', [{ branch: 'ME', semester: 'S5', subjectCode: 'ME301', count: 6, startRoll: 3001 }]);

    const allRooms = [hall1.room, hall2.room, hall3.room];
    const allCandidates = [...hall1.candidates, ...hall2.candidates, ...hall3.candidates];
    const allAssignments = [...hall1.assignments, ...hall2.assignments, ...hall3.assignments];

    // 1. Verify React component renders all 3 halls on ONE print-sheet
    const html = renderToStaticMarkup(
      React.createElement(SeatingNoticeSheet, {
        exam: sampleExam,
        rooms: allRooms,
        assignments: allAssignments,
        students: allCandidates,
      })
    );

    // Should only contain 1 print sheet
    const sheetMatches = html.match(/class="print-sheet portrait/g);
    expect(sheetMatches).not.toBeNull();
    expect(sheetMatches?.length).toBe(1);

    // All 3 halls must appear on that single sheet
    expect(html).toContain('Hall 101');
    expect(html).toContain('Hall 102');
    expect(html).toContain('Hall 103');

    // 2. Verify PDF generation packs all 3 halls on 1 page
    const pdf = generateSeatingNoticePdf(sampleExam, allRooms, allAssignments, allCandidates);
    expect(pdf.getNumberOfPages()).toBe(1);
  });

  it('advances to next page only when the whole details of another hall exceed the remaining sheet space', () => {
    // Create 6 rooms where each has 2 cohorts (~45mm each)
    // 4 rooms * 45mm = 180mm <= 215mm (fit on sheet 1)
    // 5th room * 45mm = 225mm > 215mm (cannot fit on sheet 1 -> moves to sheet 2)
    const h1 = createRoomWithCohorts('h-1', 'Hall 1', [
      { branch: 'CS', semester: 'S5', subjectCode: 'CS301', count: 5, startRoll: 101 },
      { branch: 'IT', semester: 'S5', subjectCode: 'IT301', count: 5, startRoll: 201 },
    ]);
    const h2 = createRoomWithCohorts('h-2', 'Hall 2', [
      { branch: 'EC', semester: 'S5', subjectCode: 'EC301', count: 5, startRoll: 301 },
      { branch: 'EE', semester: 'S5', subjectCode: 'EE301', count: 5, startRoll: 401 },
    ]);
    const h3 = createRoomWithCohorts('h-3', 'Hall 3', [
      { branch: 'ME', semester: 'S5', subjectCode: 'ME301', count: 5, startRoll: 501 },
      { branch: 'CE', semester: 'S5', subjectCode: 'CE301', count: 5, startRoll: 601 },
    ]);
    const h4 = createRoomWithCohorts('h-4', 'Hall 4', [
      { branch: 'CH', semester: 'S5', subjectCode: 'CH301', count: 5, startRoll: 701 },
      { branch: 'BT', semester: 'S5', subjectCode: 'BT301', count: 5, startRoll: 801 },
    ]);
    const h5 = createRoomWithCohorts('h-5', 'Hall 5', [
      { branch: 'AI', semester: 'S5', subjectCode: 'AI301', count: 5, startRoll: 901 },
      { branch: 'DS', semester: 'S5', subjectCode: 'DS301', count: 5, startRoll: 1001 },
    ]);

    const allRooms = [h1.room, h2.room, h3.room, h4.room, h5.room];
    const allCandidates = [...h1.candidates, ...h2.candidates, ...h3.candidates, ...h4.candidates, ...h5.candidates];
    const allAssignments = [...h1.assignments, ...h2.assignments, ...h3.assignments, ...h4.assignments, ...h5.assignments];

    // React render verification
    const html = renderToStaticMarkup(
      React.createElement(SeatingNoticeSheet, {
        exam: sampleExam,
        rooms: allRooms,
        assignments: allAssignments,
        students: allCandidates,
      })
    );

    const sheetMatches = html.match(/class="print-sheet portrait/g);
    expect(sheetMatches?.length).toBe(2);

    // Verify PDF matches 2 pages (Hall 5 pushed to page 2 because it couldn't fit whole on page 1)
    const pdf = generateSeatingNoticePdf(sampleExam, allRooms, allAssignments, allCandidates);
    expect(pdf.getNumberOfPages()).toBe(2);
  });

  it('keeps the whole details of each hall intact with avoid-break protection', () => {
    const h1 = createRoomWithCohorts('hall-a', 'Auditorium Hall A', [
      { branch: 'CS', semester: 'S7', subjectCode: 'CS401', count: 12, startRoll: 5001 },
    ]);
    const h2 = createRoomWithCohorts('hall-b', 'Auditorium Hall B', [
      { branch: 'EC', semester: 'S7', subjectCode: 'EC401', count: 12, startRoll: 6001 },
    ]);

    const html = renderToStaticMarkup(
      React.createElement(SeatingNoticeSheet, {
        exam: sampleExam,
        rooms: [h1.room, h2.room],
        assignments: [...h1.assignments, ...h2.assignments],
        students: [...h1.candidates, ...h2.candidates],
      })
    );

    // Each hall block must have avoid-break class so browser print engine never breaks inside
    expect(html).toContain('avoid-break space-y-2 border-b-2 border-black');
    // Banners must have high visibility with bold text
    expect(html).toContain('EXAMINATION HALL / ROOM');
    expect(html).toContain('Auditorium Hall A');
    expect(html).toContain('Auditorium Hall B');
  });

  it('filters to single classroom when targetRoomId is specified', () => {
    const h1 = createRoomWithCohorts('hall-1', 'Hall 1', [{ branch: 'CS', semester: 'S1', subjectCode: 'CS101', count: 5, startRoll: 1 }]);
    const h2 = createRoomWithCohorts('hall-2', 'Hall 2', [{ branch: 'EC', semester: 'S1', subjectCode: 'EC101', count: 5, startRoll: 1 }]);

    const html = renderToStaticMarkup(
      React.createElement(SeatingNoticeSheet, {
        exam: sampleExam,
        rooms: [h1.room, h2.room],
        assignments: [...h1.assignments, ...h2.assignments],
        students: [...h1.candidates, ...h2.candidates],
        targetRoomId: 'hall-2',
      })
    );

    expect(html).not.toContain('Hall 1');
    expect(html).toContain('Hall 2');

    const pdf = generateSeatingNoticePdf(
      sampleExam,
      [h1.room, h2.room],
      [...h1.assignments, ...h2.assignments],
      [...h1.candidates, ...h2.candidates],
      'hall-2'
    );
    expect(pdf.getNumberOfPages()).toBe(1);
  });
});
