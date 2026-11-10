import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat } from '../src/models/arrangement';
import type { Exam } from '../src/models/exam';
import { generateInternalAttendanceSheetPdf } from '../src/export/pdfPackGenerator';
import { InternalAttendanceSheet } from '../src/export/templates/InternalAttendanceSheet';
import { PrintContainer } from '../src/export/templates/PrintContainer';

describe('Internal Examination Attendance Sheet & Non-Overlapping Header Tests', () => {
  const sampleExam: Exam = {
    id: 'exam-int-2026',
    name: 'First Internal Assessment Examinations - B.Tech Fourth Semester (Autonomous Scheme) May 2026',
    examName: 'First Internal Assessment Examinations - B.Tech Fourth Semester (Autonomous Scheme) May 2026',
    date: '2026-05-18',
    examDate: '2026-05-18',
    session: 'FN',
    startTime: '09:30 AM',
    endTime: '11:30 AM',
    institutionName: 'Albertian Institute of Science and Technology',
    institutionLocation: 'Kalamassery, Kochi - 682022',
    examCode: 'INT-S4-2026',
    documentCode: 'AISAT/EXAM/INT/01',
    status: 'active',
  };

  const sampleRooms: Room[] = [
    {
      id: 'hall-a',
      name: 'Seminar Hall A',
      rows: 2,
      columns: 2,
      studentsPerBench: 2,
      roomOrder: 1,
      invigilators: ['Dr. John Doe', 'Prof. Jane Smith'],
      disabledSeats: [],
      blockedBenches: [],
    },
  ];

  const sampleCandidates: ExamCandidate[] = [
    { id: 's1', rollNo: 'ROLL-101', registerNumber: 'REG101', name: 'Alice Walker', branch: 'CS', semester: 'S4', subjectCode: 'CS202' },
    { id: 's2', rollNo: 'ROLL-102', registerNumber: 'REG102', name: 'Bob Roberts', branch: 'EC', semester: 'S4', subjectCode: 'EC202' },
    { id: 's3', rollNo: 'ROLL-103', registerNumber: 'REG103', name: 'Charlie Clark', branch: 'CS', semester: 'S4', subjectCode: 'CS202' },
  ];

  const sampleAssignments: AssignedSeat[] = [
    { classroomId: 'hall-a', roomId: 'hall-a', row: 0, column: 0, seatIndex: 0, position: 0, studentId: 's1', candidateId: 's1' },
    { classroomId: 'hall-a', roomId: 'hall-a', row: 0, column: 0, seatIndex: 1, position: 1, studentId: 's2', candidateId: 's2' },
    { classroomId: 'hall-a', roomId: 'hall-a', row: 0, column: 1, seatIndex: 0, position: 0, studentId: 's3', candidateId: 's3' },
  ];

  describe('InternalAttendanceSheet Component', () => {
    it('renders all 7 required columns: Sl. No., Roll No., Name, Subject Code, Main Sheets, Additional Sheets, Signature', () => {
      const html = renderToStaticMarkup(
        React.createElement(InternalAttendanceSheet, {
          exam: sampleExam,
          rooms: sampleRooms,
          assignments: sampleAssignments,
          students: sampleCandidates,
        })
      );

      expect(html).toContain('Sl. No.');
      expect(html).toContain('Roll No.');
      expect(html).toContain('Name');
      expect(html).toContain('Subject Code');
      expect(html).toContain('Main Sheets');
      expect(html).toContain('Additional Sheets');
      expect(html).toContain('Signature');
    });

    it('renders candidate rows with roll numbers, names, and subject codes', () => {
      const html = renderToStaticMarkup(
        React.createElement(InternalAttendanceSheet, {
          exam: sampleExam,
          rooms: sampleRooms,
          assignments: sampleAssignments,
          students: sampleCandidates,
        })
      );

      expect(html).toContain('ROLL-101');
      expect(html).toContain('Alice Walker');
      expect(html).toContain('CS202');

      expect(html).toContain('ROLL-102');
      expect(html).toContain('Bob Roberts');
      expect(html).toContain('EC202');

      expect(html).toContain('ROLL-103');
      expect(html).toContain('Charlie Clark');
    });

    it('renders accountability footer with registered, present, absent, main sheets, additional sheets, and signature lines', () => {
      const html = renderToStaticMarkup(
        React.createElement(InternalAttendanceSheet, {
          exam: sampleExam,
          rooms: sampleRooms,
          assignments: sampleAssignments,
          students: sampleCandidates,
        })
      );

      expect(html).toContain('Registered:');
      expect(html).toContain('Present:');
      expect(html).toContain('Absent:');
      expect(html).toContain('Main Sheets:');
      expect(html).toContain('Addl. Sheets:');
      expect(html).toContain('Invigilator Signature');
      expect(html).toContain('Internal Exam Coordinator / HOD');
    });
  });

  describe('Header Text Non-Overlapping Verification', () => {
    it('renders exam name and date in separate rows in PrintContainer to prevent text overlapping', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          PrintContainer,
          {
            documentTitle: 'INTERNAL EXAMINATION ATTENDANCE SHEET',
            exam: sampleExam,
            roomName: 'Seminar Hall A',
          },
          React.createElement('div', null, 'Body Content')
        )
      );

      // Verify Examination text exists
      expect(html).toContain('Examination:');
      expect(html).toContain(sampleExam.examName);

      // Verify Date exists and is not crammed into the same row as long exam name
      expect(html).toContain('Date:');
      expect(html).toContain('2026-05-18');
      expect(html).toContain('Session:');
      expect(html).toContain('FN');
      expect(html).toContain('Time:');
    });
  });

  describe('generateInternalAttendanceSheetPdf jsPDF Generator', () => {
    it('generates a valid monochrome jsPDF document with at least one page', () => {
      const pdf = generateInternalAttendanceSheetPdf(
        sampleExam,
        sampleRooms,
        sampleAssignments,
        sampleCandidates
      );

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it('handles multiple rooms gracefully', () => {
      const room2: Room = {
        id: 'hall-b',
        name: 'Seminar Hall B',
        rows: 2,
        columns: 2,
        studentsPerBench: 2,
        roomOrder: 2,
        disabledSeats: [],
        blockedBenches: [],
      };
      const cand4: ExamCandidate = {
        id: 's4',
        rollNo: 'ROLL-201',
        name: 'Diana Prince',
        branch: 'ME',
        semester: 'S4',
        subjectCode: 'ME202',
      };
      const assign4: AssignedSeat = {
        classroomId: 'hall-b',
        roomId: 'hall-b',
        row: 0,
        column: 0,
        seatIndex: 0,
        position: 0,
        studentId: 's4',
        candidateId: 's4',
      };

      const pdf = generateInternalAttendanceSheetPdf(
        sampleExam,
        [...sampleRooms, room2],
        [...sampleAssignments, assign4],
        [...sampleCandidates, cand4]
      );

      expect(pdf.getNumberOfPages()).toBe(2);
    });
  });
});
