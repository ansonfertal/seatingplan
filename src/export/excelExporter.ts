import * as XLSX from 'xlsx';
import type { SeatingArrangement } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import { getClassroomColumnRows } from '../utils/capacityCalculator';
import { buildSeatingSummaryTable } from '../algorithms/summaryGenerator';
import { applySheetDefaults, defaultBodyStyle, defaultHeaderStyle } from './excelFormatter';

export type ExcelExportWorkbook = {
  workbook: XLSX.WorkBook;
  fileName: string;
};

function getSeatStudent(
  assignment: SeatingArrangement['assignments'][number],
  students: Map<string, Student>
): Student | undefined {
  return students.get(assignment.studentId);
}

export function generateSummarySheet(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[]
): XLSX.WorkSheet {
  const summary = buildSeatingSummaryTable(arrangement, students, classrooms);
  const sheet: XLSX.WorkSheet = {};

  const headerRow: Array<string | number> = ['Date and Time', 'Class Room No.', 'Branch', 'Roll No. Range', 'No. of Students', 'Total Room Count'];
  const rows: Array<Array<string | number>> = [headerRow];

  summary.rows.forEach((row) => {
    rows.push([
      arrangement.exam.examDate,
      row.classroomName,
      row.branch,
      row.rollRange,
      row.studentCount,
      row.totalRoomCount,
    ]);
  });

  rows.push(['', '', '', 'Grand Total', summary.totalStudents, summary.totalRoomCount]);

  XLSX.utils.sheet_add_aoa(sheet, rows);
  applySheetDefaults(sheet);

  const headerRange = 'A1:F1';
  const headerStart = XLSX.utils.decode_range(headerRange);
  for (let row = headerStart.s.r; row <= headerStart.e.r; row += 1) {
    for (let col = headerStart.s.c; col <= headerStart.e.c; col += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      sheet[cellAddress] = {
        ...sheet[cellAddress],
        t: 's',
        v: rows[row][col],
        s: defaultHeaderStyle,
      };
    }
  }

  for (let row = 2; row <= rows.length; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
      const value = rows[row - 1][col];
      sheet[cellAddress] = {
        ...sheet[cellAddress],
        v: value,
        s: defaultBodyStyle,
      };
    }
  }

  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  return sheet;
}

export function generateRoomsSheet(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[]
): XLSX.WorkSheet {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const sheet: XLSX.WorkSheet = {};
  let cursorRow = 0;

  classrooms.forEach((classroom) => {
    const headerRow = [classroom.name, '', '', '', '', ''];
    XLSX.utils.sheet_add_aoa(sheet, [headerRow], { origin: `A${cursorRow + 1}` });
    cursorRow += 2;

    const columnRows = getClassroomColumnRows(classroom.rows, classroom.columns, classroom.columnRows);
    for (let row = 0; row < Math.max(...columnRows); row += 1) {
      const rowValues: Array<string | number> = [];
      for (let col = 0; col < classroom.columns; col += 1) {
        if (row >= columnRows[col]) {
          rowValues.push('');
          continue;
        }
        const cellValues: Array<string> = [];
        for (let seatIndex = 0; seatIndex < classroom.studentsPerBench; seatIndex += 1) {
          const assignment = arrangement.assignments.find(
            (item) =>
              item.classroomId === classroom.id &&
              item.row === row &&
              item.column === col &&
              item.seatIndex === seatIndex
          );

          const student = assignment ? getSeatStudent(assignment, studentMap) : undefined;
          const seatValue = student ? `${student.registerNumber}` : '—';
          cellValues.push(seatValue);
        }

        const joined = cellValues.join('\n');
        rowValues.push(joined);
      }

      XLSX.utils.sheet_add_aoa(sheet, [rowValues], { origin: `A${cursorRow + 1}` });
      cursorRow += 1;
    }

    cursorRow += 2;
  });

  applySheetDefaults(sheet);
  return sheet;
}

export function generateAttendanceSheet(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[]
): XLSX.WorkSheet {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const sheet: XLSX.WorkSheet = {};
  const rows: Array<Array<string | number>> = [
    ['Hall No', 'Date', 'Sl. No.', 'Roll No.', 'Student Name', 'Main Sheets', 'Additional Sheets', 'Total Additional', 'Signature'],
  ];

  classrooms.forEach((classroom) => {
    rows.push(['', classroom.name, '', '', '', '', '', '', '']);

    const classroomAssignments = arrangement.assignments
      .filter((assignment) => assignment.classroomId === classroom.id)
      .map((assignment) => ({
        assignment,
        student: studentMap.get(assignment.studentId),
      }))
      .filter((entry): entry is { assignment: typeof entry.assignment; student: Student } => Boolean(entry.student))
      .sort((left, right) => left.student.registerNumber.localeCompare(right.student.registerNumber, undefined, { numeric: true }));

    classroomAssignments.forEach((entry, index) => {
      rows.push([
        classroom.name,
        arrangement.exam.examDate,
        index + 1,
        entry.student.registerNumber,
        entry.student.name,
        '',
        '',
        '',
        '',
      ]);
    });

    rows.push(['', '', '', '', '', '', '', '', '']);
  });

  XLSX.utils.sheet_add_aoa(sheet, rows);
  applySheetDefaults(sheet);
  return sheet;
}

export function createExcelWorkbook(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[]
): ExcelExportWorkbook {
  const workbook = XLSX.utils.book_new();
  const summarySheet = generateSummarySheet(arrangement, students, classrooms);
  const roomSheet = generateRoomsSheet(arrangement, students, classrooms);
  const attendanceSheet = generateAttendanceSheet(arrangement, students, classrooms);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Seating Arrangement');
  XLSX.utils.book_append_sheet(workbook, roomSheet, 'rooms');
  XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance sheet');

  return {
    workbook,
    fileName: `Seating_Arrangement_${arrangement.exam.examName}_${arrangement.exam.examDate}.xlsx`,
  };
}
