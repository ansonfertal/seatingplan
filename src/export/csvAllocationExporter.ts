import * as XLSX from 'xlsx';
import type { Room } from '../models/classroom';
import type { ExamCandidate } from '../models/student';
import type { AssignedSeat } from '../models/arrangement';
import type { Exam, ExamDetails } from '../models/exam';

export type AllocationExportRow = {
  'Exam Name': string;
  'Exam Date': string;
  'Session': string;
  'Room': string;
  'Bench Row': number;
  'Bench Column': number;
  'Seat Position': number;
  'Register Number': string;
  'Candidate Name': string;
  'Branch': string;
  'Semester': string;
  'Subject Code': string;
};

/**
 * Generates structured row objects for every assigned candidate conforming to PRD Section 4.7.
 */
export function buildAllocationExportRows(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[]
): AllocationExportRow[] {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // Sort assignments logically by room order, row, col, seat position
  const sorted = [...assignments].sort((a, b) => {
    const roomA = roomMap.get(a.roomId || a.classroomId);
    const roomB = roomMap.get(b.roomId || b.classroomId);
    const orderA = roomA?.roomOrder ?? 0;
    const orderB = roomB?.roomOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    if (a.row !== b.row) return a.row - b.row;
    if (a.column !== b.column) return a.column - b.column;
    const posA = a.position ?? a.seatIndex;
    const posB = b.position ?? b.seatIndex;
    return posA - posB;
  });

  return sorted.map((a) => {
    const rId = a.roomId || a.classroomId;
    const room = roomMap.get(rId);
    const sId = a.studentId || a.candidateId;
    const candidate = sId ? studentMap.get(sId) : undefined;
    const pos = (a.position ?? a.seatIndex) + 1;

    return {
      'Exam Name': exam.examName,
      'Exam Date': exam.examDate,
      'Session': exam.session || 'FN',
      'Room': room?.name || rId,
      'Bench Row': a.row + 1,
      'Bench Column': a.column + 1,
      'Seat Position': pos,
      'Register Number': candidate?.registerNumber || '',
      'Candidate Name': candidate?.name || '',
      'Branch': candidate?.branch || '',
      'Semester': candidate?.semester || '',
      'Subject Code': candidate?.subjectCode || '',
    };
  });
}

/**
 * Downloads allocation data as CSV.
 */
export function downloadAllocationCsv(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[],
  fileName?: string
): void {
  const rows = buildAllocationExportRows(exam, rooms, assignments, students);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]) as (keyof AllocationExportRow)[];
  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(',')
    ),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || `Allocation_${exam.examName.replace(/\s+/g, '_')}_${exam.examDate}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Downloads allocation data as Excel XLSX.
 */
export function downloadAllocationExcel(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[],
  fileName?: string
): void {
  const rows = buildAllocationExportRows(exam, rooms, assignments, students);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seating Allocation');

  const defaultName = fileName || `Allocation_${exam.examName.replace(/\s+/g, '_')}_${exam.examDate}.xlsx`;
  XLSX.writeFile(workbook, defaultName);
}
