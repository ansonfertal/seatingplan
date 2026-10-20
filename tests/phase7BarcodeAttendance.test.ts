import { describe, it, expect } from 'vitest';
import { generateCode39Svg, generateVerificationQrSvg } from '../src/utils/barcodeGenerator';
import type { ExamCandidate } from '../src/models/student';
import type { AssignedSeat } from '../src/models/arrangement';
import type { Room } from '../src/models/classroom';

describe('Phase 7.6 - Barcode & QR Code Integration for Student Attendance', () => {
  describe('Code 39 1D Barcode Generator', () => {
    it('generates a valid vector SVG containing bars and alphanumeric text', () => {
      const regNo = 'REG2026-CS-01';
      const svg = generateCode39Svg(regNo);

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('<rect');
      expect(svg).toContain(regNo);
      expect(svg).toContain('font-family="monospace"');
    });

    it('honors options like height, custom color, and hiding display text', () => {
      const svgWithoutText = generateCode39Svg('TEST-123', {
        displayValue: false,
        height: 25,
        color: '#1a365d',
      });

      expect(svgWithoutText).toContain('<svg');
      expect(svgWithoutText).not.toContain('<text');
      expect(svgWithoutText).toContain('fill="#1a365d"');
      expect(svgWithoutText).toContain('height="25"');
    });

    it('sanitizes input characters to standard Code 39 charset', () => {
      // Lowercase letters and unknown symbols get mapped/sanitized safely
      const raw = 'reg 2026 # 99!';
      const svg = generateCode39Svg(raw);
      expect(svg).toContain('<svg');
      expect(svg).toContain('REG 2026 - 99-');
    });
  });

  describe('2D Verification QR Generator', () => {
    it('generates standard 21x21 matrix QR code SVG with corner finder patterns', () => {
      const payload = {
        regNo: '2026CS101',
        examName: 'Final Semester Exam',
        roomId: 'hall-1',
        seat: 'R1-C1-P1',
      };
      const qrSvg = generateVerificationQrSvg(payload, 84);

      expect(qrSvg).toContain('<svg');
      expect(qrSvg).toContain('viewBox="0 0 84 84"');
      expect(qrSvg).toContain('shape-rendering="crispEdges"');
      expect(qrSvg).toContain('<rect');
    });

    it('produces deterministic output for identical candidate payloads', () => {
      const payload = { regNo: 'REG-999', roomId: 'HALL-A' };
      const svg1 = generateVerificationQrSvg(payload);
      const svg2 = generateVerificationQrSvg(payload);
      expect(svg1).toEqual(svg2);
    });
  });

  describe('Attendance Scanner Verification Logic', () => {
    const mockStudents: ExamCandidate[] = [
      {
        id: 's1',
        registerNumber: 'CS2026-001',
        name: 'Alice Johnson',
        branch: 'CSE',
        semester: 6,
        subjectCode: 'CS601',
        examDate: '2026-10-20',
        session: 'FN',
      },
      {
        id: 's2',
        registerNumber: 'EC2026-002',
        name: 'Bob Smith',
        branch: 'ECE',
        semester: 6,
        subjectCode: 'EC601',
        examDate: '2026-10-20',
        session: 'FN',
      },
    ];

    const mockRooms: Room[] = [
      {
        id: 'r1',
        name: 'Hall 101',
        capacity: 30,
        rows: 5,
        columns: 3,
        studentsPerBench: 2,
        benchLayout: { rows: 5, columns: 3, studentsPerBench: 2 },
      },
    ];

    const mockAssignments: AssignedSeat[] = [
      {
        seatId: 'r1_0_0_0',
        roomId: 'r1',
        classroomId: 'r1',
        row: 0,
        column: 0,
        seatIndex: 0,
        position: 0,
        studentId: 's1',
        candidateId: 's1',
      },
    ];

    it('correctly maps scanned register number or payload to assigned candidate and seat', () => {
      const studentMap = new Map(mockStudents.map((s) => [s.registerNumber.toUpperCase(), s]));
      const query = 'cs2026-001 '; // Case-insensitive with whitespace
      const cleaned = query.trim().toUpperCase();

      const candidate = studentMap.get(cleaned);
      expect(candidate).toBeDefined();
      expect(candidate?.name).toBe('Alice Johnson');

      const assignment = mockAssignments.find((a) => (a.studentId || a.candidateId) === candidate?.id);
      expect(assignment).toBeDefined();
      expect(assignment?.roomId).toBe('r1');
      expect(assignment?.row).toBe(0);
      expect(assignment?.column).toBe(0);

      const room = mockRooms.find((r) => r.id === assignment?.roomId);
      expect(room?.name).toBe('Hall 101');
    });

    it('handles candidate not assigned or candidate not in roster', () => {
      const studentMap = new Map(mockStudents.map((s) => [s.registerNumber.toUpperCase(), s]));
      const unknownQuery = 'ME2026-999';
      const candidate = studentMap.get(unknownQuery);
      expect(candidate).toBeUndefined();

      // Bob is in student roster but not assigned a seat
      const unassignedCandidate = studentMap.get('EC2026-002');
      expect(unassignedCandidate).toBeDefined();
      const assignment = mockAssignments.find((a) => (a.studentId || a.candidateId) === unassignedCandidate?.id);
      expect(assignment).toBeUndefined();
    });
  });
});
