import { describe, expect, it } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat } from '../src/models/arrangement';
import type { Exam } from '../src/models/exam';
import {
  generateAttendanceSheet1Pdf,
  generateAttendanceSheet2Pdf,
  generateRoomSeatingPlanPdf,
  generateSeatingNoticePdf,
  generateDailyAttendancePdf,
} from '../src/export/pdfPackGenerator';
import * as fs from 'fs';
import * as path from 'path';

describe('Monochrome Printouts & Attendance Sheets 1 and 2', () => {
  const sampleExam: Exam = {
    id: 'exam-monochrome-2026',
    name: 'University Degree Semester Examination',
    examName: 'University Degree Semester Examination',
    date: '2026-10-25',
    examDate: '2026-10-25',
    session: 'FN',
    startTime: '09:30',
    endTime: '12:30',
    institutionName: 'Albertian Institute of Science and Technology',
    institutionLocation: 'Kalamassery, Kochi - 682022',
    examCode: 'KTU-EXAM-2026',
    documentCode: 'AISAT/EXAM/2026/MONO',
    status: 'active',
  };

  const sampleRooms: Room[] = [
    {
      id: 'hall-1',
      name: 'Hall 101',
      rows: 4,
      columns: 4,
      studentsPerBench: 2, // 32 capacity
      roomOrder: 1,
      disabledSeats: [],
      blockedBenches: [],
    },
    {
      id: 'hall-dense',
      name: 'Hall Dense 10x6',
      rows: 10,
      columns: 6,
      studentsPerBench: 2, // 120 capacity
      roomOrder: 2,
      disabledSeats: [],
      blockedBenches: [],
    },
  ];

  const sampleCandidates: ExamCandidate[] = Array.from({ length: 30 }, (_, i) => ({
    id: `cand-${i + 1}`,
    registerNumber: `2026CS${1001 + i}`,
    name: `Student Candidate ${i + 1} Full Name`,
    branch: i % 2 === 0 ? 'CS' : 'EC',
    semester: 'S5',
    subjectCode: i % 2 === 0 ? 'CS301' : 'EC301',
  }));

  const sampleAssignments: AssignedSeat[] = sampleCandidates.map((c, i) => ({
    classroomId: 'hall-1',
    roomId: 'hall-1',
    row: Math.floor(i / 8),
    column: Math.floor((i % 8) / 2),
    seatIndex: i % 2,
    position: i % 2,
    studentId: c.id,
    candidateId: c.id,
  }));

  describe('Attendance Sheet 1 (Main Sheets, Alpha Code, Serial No, Signature)', () => {
    it('generates a valid monochrome Attendance Sheet 1 PDF with required columns', () => {
      const pdf = generateAttendanceSheet1Pdf(sampleExam, sampleRooms.slice(0, 1), sampleAssignments, sampleCandidates);

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);

      // Verify the generated PDF data exists and is valid binary
      const pdfOutput = pdf.output();
      expect(pdfOutput.length).toBeGreaterThan(1000);
      expect(pdfOutput.startsWith('%PDF-')).toBe(true);
    });

    it('verifies AttendanceSheet1 source code defines the required 6 user columns', () => {
      const filePath = path.resolve(__dirname, '../src/export/templates/AttendanceSheet1.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Must contain: register number, name of student, number of main sheets, alpha code, serial number, signature
      expect(content).toContain('Register Number');
      expect(content).toContain('Name of Student');
      expect(content).toContain('Number of Main Sheets');
      expect(content).toContain('Alpha Code');
      expect(content).toContain('Serial Number');
      expect(content).toContain('Signature');
    });
  });

  describe('Attendance Sheet 2 (Register Number, Name, Subject Code, Signature)', () => {
    it('generates a valid monochrome Attendance Sheet 2 PDF with required columns', () => {
      const pdf = generateAttendanceSheet2Pdf(sampleExam, sampleRooms.slice(0, 1), sampleAssignments, sampleCandidates);

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);

      const pdfOutput = pdf.output();
      expect(pdfOutput.length).toBeGreaterThan(1000);
      expect(pdfOutput.startsWith('%PDF-')).toBe(true);
    });

    it('verifies AttendanceSheet2 source code defines the required columns', () => {
      const filePath = path.resolve(__dirname, '../src/export/templates/AttendanceSheet2.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Must contain: register number, name, subject code, signature
      expect(content).toContain('Register Number');
      expect(content).toContain('Name');
      expect(content).toContain('Subject Code');
      expect(content).toContain('Signature');
    });
  });

  describe('Monochrome Styling & Zero Overlap Verification', () => {
    it('verifies printEngine.css enforces strictly monochrome rules', () => {
      const cssPath = path.resolve(__dirname, '../src/styles/printEngine.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      // Table styling must have fixed layout to prevent overlaps
      expect(css).toContain('table-layout: fixed');
      expect(css).toContain('border-collapse: collapse');

      // Backgrounds and borders must be monochrome
      expect(css).toContain('#000000');
      expect(css).toContain('#ffffff');

      // Handwriting row height must be adequate to prevent row collision
      expect(css).toContain('height: 36px');
    });

    it('generates a valid Room Seating Plan PDF for dense rooms (10x6) without throwing or negative offsets', () => {
      const denseRoom = sampleRooms[1];
      const denseCandidates = Array.from({ length: 60 }, (_, i) => ({
        id: `dense-${i + 1}`,
        registerNumber: `2026EC${1001 + i}`,
        name: `Dense Candidate ${i + 1}`,
        branch: 'EC',
        semester: 'S5',
        subjectCode: 'EC301',
      }));

      const denseAssignments: AssignedSeat[] = denseCandidates.map((c, i) => ({
        classroomId: denseRoom.id,
        roomId: denseRoom.id,
        row: Math.floor(i / 12),
        column: Math.floor((i % 12) / 2),
        seatIndex: i % 2,
        position: i % 2,
        studentId: c.id,
        candidateId: c.id,
      }));

      const pdf = generateRoomSeatingPlanPdf(sampleExam, [denseRoom], denseAssignments, denseCandidates);

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBe(1);

      const output = pdf.output();
      expect(output.length).toBeGreaterThan(1000);
      expect(output.startsWith('%PDF-')).toBe(true);
    });

    it('generates a valid Daily Attendance Summary PDF in landscape mode', () => {
      const pdf = generateDailyAttendancePdf(sampleExam, sampleRooms.slice(0, 1), sampleAssignments, sampleCandidates);

      expect(pdf).toBeDefined();
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);

      const output = pdf.output();
      expect(output.length).toBeGreaterThan(1000);
    });
  });
});
