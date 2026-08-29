import { jsPDF } from 'jspdf';
import { buildSeatingSummaryTable } from '../algorithms/summaryGenerator';
import type { SeatingArrangement } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';

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
  pdf.rect(10, 10, 190, 18, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(title, 14, 21);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Institution: ${arrangement.exam.institutionName || 'Institution'}`, 14, 36);
  pdf.text(`Exam: ${arrangement.exam.examName}`, 14, 42);
  pdf.text(`Date: ${arrangement.exam.examDate}`, 14, 48);
  pdf.text(`Session: ${arrangement.exam.session}`, 14, 54);
}

function drawSummaryTable(pdf: jsPDF, arrangement: SeatingArrangement, summaryRows: ReturnType<typeof buildSeatingSummaryTable>['rows']) {
  const startY = 70;
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
      y = 68;
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
  const margin = 18;
  const gridLeft = margin;
  const gridTop = 70;
  const cellWidth = 24;
  const cellHeight = 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(classroom.name, 14, 64);
  pdf.setFont('helvetica', 'normal');

  for (let row = 0; row < classroom.rows; row += 1) {
    for (let col = 0; col < classroom.columns; col += 1) {
      const assignment = arrangement.assignments.find(
        (item) => item.classroomId === classroom.id && item.row === row && item.column === col
      );
      const label = getSeatLabel(assignment, studentMap);
      const x = gridLeft + col * cellWidth;
      const y = gridTop + row * cellHeight;

      pdf.rect(x, y, cellWidth, cellHeight);
      pdf.text(label, x + 2, y + 7);
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
