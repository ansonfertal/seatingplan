import { jsPDF } from 'jspdf';
import { buildSeatingSummaryTable } from '../algorithms/summaryGenerator';
import type { SeatingArrangement } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import { getClassroomColumnRows } from '../utils/capacityCalculator';

export type PdfPrintOptions = {
  orientation?: 'portrait' | 'landscape';
};

function getSeatLabel(
  assignment: SeatingArrangement['assignments'][number] | undefined,
  studentMap: Map<string, Student>
): string {
  if (!assignment) {
    return '—';
  }

  const student = studentMap.get(assignment.studentId);
  return student ? student.registerNumber : '—';
}

function drawPageHeader(pdf: jsPDF, arrangement: SeatingArrangement, title: string) {
  pdf.setFillColor(79, 70, 229);
  pdf.rect(10, 10, 190, 14, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, 14, 19);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Institution: ${arrangement.exam.institutionName || 'Institution'}`, 14, 28);
  pdf.text(`Exam: ${arrangement.exam.examName}`, 14, 34);
  pdf.text(`Date: ${arrangement.exam.examDate}`, 14, 40);
  pdf.text(`Session: ${arrangement.exam.session}`, 14, 46);
}

function drawSummaryTable(pdf: jsPDF, arrangement: SeatingArrangement, summaryRows: ReturnType<typeof buildSeatingSummaryTable>['rows']) {
  const startY = 82;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Seating Arrangement Summary', 14, startY - 6);

  let y = startY;
  const columns = [
    { x: 14, label: 'Class Room' },
    { x: 42, label: 'Branch' },
    { x: 74, label: 'Roll No. Range' },
    { x: 140, label: 'Count' },
    { x: 160, label: 'Total' },
  ];

  columns.forEach((column) => {
    pdf.text(column.label, column.x, y);
  });

  y += 7;
  pdf.setFont('helvetica', 'normal');

  summaryRows.forEach((row) => {
    if (y > 245) {
      pdf.addPage();
      drawPageHeader(pdf, arrangement, 'Seating Arrangement Summary');
      y = 80;
    }

    pdf.text(row.classroomName, 14, y);
    pdf.text(row.branch, 42, y);
    pdf.text(row.rollRange.length > 24 ? `${row.rollRange.slice(0, 23)}...` : row.rollRange, 74, y);
    pdf.text(String(row.studentCount), 140, y);
    pdf.text(String(row.studentCount), 160, y);
    y += 7;
  });

  pdf.setFont('helvetica', 'bold');
  pdf.text('Grand Total', 14, y + 7);
  pdf.text(String(summaryRows.reduce((sum, row) => sum + row.studentCount, 0)), 140, y + 7);
}

function drawRoomGrid(pdf: jsPDF, arrangement: SeatingArrangement, classroom: Classroom, studentMap: Map<string, Student>) {
  // Dynamically size the grid to better fit and be more readable when printed.
  const pageLeft = 14;
  const pageRight = 196; // 210 - 14
  const pageWidth = pageRight - pageLeft;
  const marginTop = 64;

  // Determine optimal cell size to fit columns into page width, cap to a comfortable max
  const maxCellWidth = 30;
  const computedCellWidth = Math.floor(Math.min(maxCellWidth, pageWidth / Math.max(1, classroom.columns) - 1));
  const cellWidth = Math.max(16, computedCellWidth);
  const cellHeight = Math.max(10, Math.round(cellWidth * 0.55));

  const gridWidth = cellWidth * classroom.columns;
  const columnRows = getClassroomColumnRows(classroom.rows, classroom.columns, classroom.columnRows);
  // center grid horizontally
  const gridLeft = pageLeft + Math.max(0, (pageWidth - gridWidth) / 2);
  const gridTop = marginTop;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(classroom.name, 105, 56, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  for (let row = 0; row < Math.max(...columnRows); row += 1) {
    for (let col = 0; col < classroom.columns; col += 1) {
      if (row >= columnRows[col]) continue;
      const assignment = arrangement.assignments.find(
        (item) => item.classroomId === classroom.id && item.row === row && item.column === col
      );
      const label = getSeatLabel(assignment, studentMap);
      const x = gridLeft + col * cellWidth;
      const y = gridTop + row * cellHeight;

      pdf.rect(x, y, cellWidth, cellHeight);
      // center label in the cell
      pdf.setFontSize(10);
      const tx = x + cellWidth / 2;
      const ty = y + cellHeight / 2 + 2;
      pdf.text(label, tx, ty, { align: 'center' });
    }
  }
}

function drawAttendanceTable(pdf: jsPDF, arrangement: SeatingArrangement, classroom: Classroom, studentMap: Map<string, Student>) {
  const margin = 16;
  const startY = 70;
  const columns = [
    { x: margin, label: 'Sl. No.' },
    { x: margin + 18, label: 'Roll No.' },
    { x: margin + 50, label: 'Student Name' },
    { x: margin + 103, label: 'Signature' },
  ];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`${classroom.name} Attendance Sheet`, margin, 64);

  let y = startY;
  columns.forEach((column) => {
    pdf.text(column.label, column.x, y);
  });

  y += 8;
  pdf.setFont('helvetica', 'normal');

  const roomStudents = arrangement.assignments
    .filter((assignment) => assignment.classroomId === classroom.id)
    .map((assignment) => studentMap.get(assignment.studentId))
    .filter((student): student is Student => Boolean(student))
    .sort((left, right) => left.registerNumber.localeCompare(right.registerNumber, undefined, { numeric: true }));

  roomStudents.forEach((student, index) => {
    if (y > 260) {
      pdf.addPage();
      y = 20;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${classroom.name} Attendance Sheet (Contd.)`, margin, 18);
      pdf.setFont('helvetica', 'normal');
      y += 12;
    }

    pdf.text(String(index + 1), margin, y);
    pdf.text(student.registerNumber, margin + 18, y);
    pdf.text(student.name, margin + 50, y);
    pdf.rect(margin + 103, y - 4, 42, 8);
    y += 8;
  });
}

export function createSeatingArrangementPdf(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[],
  options: PdfPrintOptions = {}
): jsPDF {
  const pdf = new jsPDF({
    orientation: options.orientation ?? 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const studentMap = new Map(students.map((student) => [student.id, student]));
  const summary = buildSeatingSummaryTable(arrangement, students, classrooms);

  drawPageHeader(pdf, arrangement, 'Seating Arrangement');
  drawSummaryTable(pdf, arrangement, summary.rows);

  classrooms.forEach((classroom, index) => {
    if (index === 0 || index > 0) {
      pdf.addPage();
    }
    drawPageHeader(pdf, arrangement, classroom.name);
    drawRoomGrid(pdf, arrangement, classroom, studentMap);
  });

  classrooms.forEach((classroom, index) => {
    pdf.addPage();
    drawPageHeader(pdf, arrangement, `${classroom.name} Attendance Sheet`);
    drawAttendanceTable(pdf, arrangement, classroom, studentMap);
    if (index < classrooms.length - 1) {
      pdf.addPage();
    }
  });

  return pdf;
}

export function createAttendanceSheetPdf(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[],
  options: PdfPrintOptions = {}
): jsPDF {
  const pdf = new jsPDF({ orientation: options.orientation ?? 'portrait', unit: 'mm', format: 'a4' });
  const studentMap = new Map(students.map((student) => [student.id, student]));

  classrooms.forEach((classroom, index) => {
    if (index > 0) {
      pdf.addPage();
    }

    // Draw a compact centered header for attendance sheet to avoid overlap
    const margin = 14;
    pdf.setFillColor(79, 70, 229);
    pdf.rect(10, 10, 190, 14, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Attendance Sheet', 105, 19, { align: 'center' });
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(arrangement.exam.institutionName || 'Institution', 105, 26, { align: 'center' });
    pdf.setFontSize(11);
    pdf.text(arrangement.exam.examName, 105, 32, { align: 'center' });

    // Draw attendance table with required columns; start below header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);

    const cols = [
      { x: margin, w: 30, label: 'Roll No.' },
      { x: margin + 32, w: 78, label: 'Name' },
      { x: margin + 112, w: 28, label: 'Main Sheets' },
      { x: margin + 142, w: 28, label: 'Additional Sheets' },
      { x: margin + 172, w: 26, label: 'Signature' },
    ];

    // place column headers safely below the drawn page header
    let y = 38;
    cols.forEach((c) => pdf.text(c.label, c.x, y));
    y += 8;

    pdf.setFont('helvetica', 'normal');
    const roomStudents = arrangement.assignments
      .filter((assignment) => assignment.classroomId === classroom.id)
      .map((assignment) => studentMap.get(assignment.studentId))
      .filter((student): student is Student => Boolean(student))
      .sort((a, b) => a.registerNumber.localeCompare(b.registerNumber, undefined, { numeric: true }));

    roomStudents.forEach((student) => {
      if (y > 250) {
        pdf.addPage();
        drawPageHeader(pdf, arrangement, `${classroom.name} Attendance Sheet (Contd.)`);
        // re-draw column headers on the new page
        y = 70;
        pdf.setFont('helvetica', 'bold');
        cols.forEach((c) => pdf.text(c.label, c.x, y));
        y += 8;
        pdf.setFont('helvetica', 'normal');
      }

      pdf.text(student.registerNumber, cols[0].x, y);
      // name wraps if long
      const name = student.name.length > 40 ? `${student.name.slice(0, 37)}...` : student.name;
      pdf.text(name, cols[1].x, y);

      // empty boxes for main and additional sheets
      pdf.rect(cols[2].x - 2, y - 5, cols[2].w, 6);
      pdf.rect(cols[3].x - 2, y - 5, cols[3].w, 6);

      // signature box
      pdf.rect(cols[4].x - 2, y - 5, cols[4].w, 6);

      y += 8;
    });

    // Bottom totals table (Total allotted / absent / present vs additional sheets)
    if (y + 60 > 280) {
      pdf.addPage();
      // draw compact header on continuation
      pdf.setFillColor(79, 70, 229);
      pdf.rect(10, 10, 190, 14, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Attendance Sheet (Contd.)', 105, 19, { align: 'center' });
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      y = 38;
    }

    y += 6;
    pdf.setFont('helvetica', 'bold');
    const tableLeft = margin;
    const rowHeight = 10;

    const totals = [
      { left: 'Total number of students allotted', right: 'Additional sheet received' },
      { left: 'Total number of students absent', right: 'Additional sheet issued' },
      { left: 'Total no. of students present', right: 'Additional sheet balance' },
    ];

    // draw rows
    totals.forEach((row, idx) => {
      const ry = y + idx * rowHeight;
      // left cell
      pdf.rect(tableLeft, ry - 6, 110, rowHeight);
      pdf.text(row.left, tableLeft + 4, ry + 2);
      // small box for left value
      pdf.rect(tableLeft + 112, ry - 6, 24, rowHeight);
      // right cell
      pdf.rect(tableLeft + 138, ry - 6, 52, rowHeight);
      pdf.text(row.right, tableLeft + 142, ry + 2);
    });

    y = y + totals.length * rowHeight + 6;

    // invigilator area
    if (y + 20 > 280) {
      pdf.addPage();
      pdf.setFillColor(79, 70, 229);
      pdf.rect(10, 10, 190, 14, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Attendance Sheet (Contd.)', 105, 19, { align: 'center' });
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      y = 38;
    }

    y += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Invigilator Name:', margin, y);
    pdf.line(margin + 38, y + 1, margin + 120, y + 1);
    pdf.text('Signature:', margin + 122, y);
    pdf.line(margin + 140, y + 1, margin + 190, y + 1);
  });

  return pdf;
}

export function buildSummaryPdf(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[],
  options: PdfPrintOptions = {}
): jsPDF {
  const pdf = new jsPDF({ orientation: options.orientation ?? 'portrait', unit: 'mm', format: 'a4' });
  const summary = buildSeatingSummaryTable(arrangement, students, classrooms);

  drawPageHeader(pdf, arrangement, 'Seating Arrangement');
  drawSummaryTable(pdf, arrangement, summary.rows);
  return pdf;
}

export function downloadPdf(fileName: string, pdf: jsPDF) {
  pdf.save(fileName);
}

export function printPdf(fileName: string, pdf: jsPDF) {
  if (typeof window !== 'undefined') {
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      });
    }
  }

  if (fileName) {
    pdf.save(fileName);
  }
}
