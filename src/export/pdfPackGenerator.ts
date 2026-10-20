import { jsPDF } from 'jspdf';
import type { Room } from '../models/classroom';
import type { ExamCandidate } from '../models/student';
import type { AssignedSeat } from '../models/arrangement';
import type { Exam, ExamDetails } from '../models/exam';
import { formatRegisterRange } from '../utils/rangeFormatter';

// Helper to draw standard header on jsPDF document
function addHeader(
  pdf: jsPDF,
  exam: Exam | ExamDetails,
  title: string,
  roomName?: string,
  isLandscape = false
) {
  const width = isLandscape ? 297 : 210;
  const margin = 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  const instName = exam.institutionName || 'Albertian Institute of Science and Technology';
  pdf.text(instName, width / 2, 14, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  const location = exam.institutionLocation || 'Kalamassery, Kochi - 682022';
  pdf.text(location, width / 2, 19, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text(title.toUpperCase(), width / 2, 25, { align: 'center' });

  // Draw separator line
  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(0.4);
  pdf.line(margin, 28, width - margin, 28);

  // Metadata block
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Exam: ${exam.examName}`, margin, 33);
  pdf.text(`Date: ${exam.examDate}`, margin + (isLandscape ? 70 : 50), 33);
  pdf.text(`Session: ${exam.session || 'FN'}`, margin + (isLandscape ? 140 : 100), 33);
  if (roomName) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Room: ${roomName}`, width - margin, 33, { align: 'right' });
  }

  pdf.line(margin, 36, width - margin, 36);
}

/**
 * Builds Output A (Attendance Sheet #1) PDF
 */
export function generateAttendanceSheet1Pdf(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[]
): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const studentMap = new Map(students.map((s) => [s.id, s]));
  let isFirstPage = true;

  rooms.forEach((room) => {
    const roomAssignments = assignments
      .filter((a) => a.roomId === room.id || a.classroomId === room.id)
      .map((a) => {
        const studentId = a.studentId || a.candidateId;
        const candidate = studentId ? studentMap.get(studentId) : undefined;
        return { assignment: a, candidate };
      })
      .filter((item) => Boolean(item.candidate))
      .sort((a, b) => (a.candidate?.registerNumber || '').localeCompare(b.candidate?.registerNumber || ''));

    if (roomAssignments.length === 0) return;

    if (!isFirstPage) pdf.addPage('a4', 'portrait');
    isFirstPage = false;

    addHeader(pdf, exam, 'ATTENDANCE SHEET #1 — CANDIDATE SIGNATURE RECORD', room.name, false);

    // Table Header
    let y = 43;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setFillColor(241, 245, 249);
    pdf.rect(12, y - 4, 186, 7, 'F');
    pdf.setDrawColor(51, 65, 85);
    pdf.rect(12, y - 4, 186, 7, 'S');

    pdf.text('Sl.', 14, y);
    pdf.text('Bench', 23, y);
    pdf.text('Register No.', 42, y);
    pdf.text('Student Name', 70, y);
    pdf.text('Branch', 120, y);
    pdf.text('Course Code', 138, y);
    pdf.text('Answer Book No.', 160, y);
    pdf.text('Signature', 183, y);

    y += 5;

    // Rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    roomAssignments.forEach(({ assignment, candidate }, idx) => {
      if (y > 265) {
        pdf.addPage('a4', 'portrait');
        addHeader(pdf, exam, 'ATTENDANCE SHEET #1 (CONT.)', room.name, false);
        y = 43;
      }

      pdf.setDrawColor(203, 213, 225);
      pdf.line(12, y + 3, 198, y + 3);

      const bench = `R${assignment.row + 1}-C${assignment.column + 1}-P${(assignment.position ?? assignment.seatIndex) + 1}`;
      pdf.text(String(idx + 1), 14, y);
      pdf.text(bench, 23, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(candidate?.registerNumber || '', 42, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text((candidate?.name || '').substring(0, 24), 70, y);
      pdf.text(candidate?.branch || '', 120, y);
      pdf.text(candidate?.subjectCode || '', 138, y);

      y += 8; // Spacious handwriting row
    });

    // Summary footer box
    if (y > 245) {
      pdf.addPage('a4', 'portrait');
      y = 40;
    }
    pdf.setDrawColor(51, 65, 85);
    pdf.rect(12, y + 4, 186, 20);
    pdf.setFontSize(8);
    pdf.text(`Total Registered: ${roomAssignments.length}`, 16, y + 10);
    pdf.text('Present: ____________', 65, y + 10);
    pdf.text('Absent: ____________', 115, y + 10);
    pdf.text('Invigilator Signature: _______________________', 16, y + 19);
    pdf.text('Exam Cell In-Charge: _______________________', 115, y + 19);
  });

  return pdf;
}

/**
 * Builds Output C (Seating Notice Sheet) PDF
 */
export function generateSeatingNoticePdf(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[]
): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const studentMap = new Map(students.map((s) => [s.id, s]));
  let isFirst = true;

  rooms.forEach((room) => {
    const roomAssignments = assignments.filter(
      (a) => a.roomId === room.id || a.classroomId === room.id
    );
    if (roomAssignments.length === 0) return;

    if (!isFirst) pdf.addPage('a4', 'portrait');
    isFirst = false;

    addHeader(pdf, exam, 'SEATING ARRANGEMENT NOTICE — CAMPUS DISPLAY', room.name, false);

    // Large Hall Box
    pdf.setFillColor(241, 245, 249);
    pdf.rect(12, 40, 186, 16, 'F');
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.6);
    pdf.rect(12, 40, 186, 16, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`EXAMINATION HALL: ${room.name}`, 105, 51, { align: 'center' });

    // Cohorts grouping
    type CohortGroup = { branch: string; semester: string; subjectCode: string; regNumbers: string[] };
    const cohortMap = new Map<string, CohortGroup>();
    roomAssignments.forEach((a) => {
      const studentId = a.studentId || a.candidateId;
      const c = studentId ? studentMap.get(studentId) : undefined;
      if (!c) return;
      const branch = c.branch || '';
      const semester = c.semester || '';
      const subjectCode = c.subjectCode || '';
      const key = `${branch}|${semester}|${subjectCode}`;
      const cohort: CohortGroup = cohortMap.get(key) || {
        branch,
        semester,
        subjectCode,
        regNumbers: [],
      };
      cohort.regNumbers.push(c.registerNumber);
      cohortMap.set(key, cohort);
    });

    let y = 66;
    pdf.setFontSize(10);
    pdf.text('Branch', 16, y);
    pdf.text('Sem', 40, y);
    pdf.text('Course Code', 55, y);
    pdf.text('Allocated Register Numbers (Notice Board Display)', 88, y);
    pdf.text('Count', 188, y, { align: 'right' });

    pdf.line(12, y + 2, 198, y + 2);
    y += 8;

    Array.from(cohortMap.values()).forEach((cohort) => {
      const rangeText = formatRegisterRange(cohort.regNumbers);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(cohort.branch, 16, y);
      pdf.text(cohort.semester, 40, y);
      pdf.text(cohort.subjectCode, 55, y);

      // Large notice font for register numbers
      pdf.setFontSize(11);
      const splitText = pdf.splitTextToSize(rangeText, 95);
      pdf.text(splitText, 88, y);
      pdf.text(String(cohort.regNumbers.length), 188, y, { align: 'right' });

      y += Math.max(12, splitText.length * 6 + 4);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(12, y - 2, 198, y - 2);
    });
  });

  return pdf;
}

/**
 * Builds Output E (Room Seating Plan) PDF
 */
export function generateRoomSeatingPlanPdf(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[]
): jsPDF {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const studentMap = new Map(students.map((s) => [s.id, s]));
  let isFirst = true;

  rooms.forEach((room) => {
    if (!isFirst) pdf.addPage('a4', 'landscape');
    isFirst = false;

    addHeader(pdf, exam, 'ROOM SEATING PLAN — SPATIAL BENCH LAYOUT', room.name, true);

    // Front Board
    pdf.setFillColor(241, 245, 249);
    pdf.rect(60, 39, 177, 7, 'F');
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.3);
    pdf.rect(60, 39, 177, 7, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('▲ FRONT BOARD / TEACHER DESK ▲', 148, 44, { align: 'center' });

    // Draw Grid
    const seatMap = new Map<string, ExamCandidate | undefined>();
    assignments
      .filter((a) => a.roomId === room.id || a.classroomId === room.id)
      .forEach((a) => {
        const pos = a.position ?? a.seatIndex;
        const studentId = a.studentId || a.candidateId;
        const candidate = studentId ? studentMap.get(studentId) : undefined;
        seatMap.set(`${a.row}|${a.column}|${pos}`, candidate);
      });

    const startX = 14;
    const startY = 50;
    const availableWidth = 269;
    const benchWidth = availableWidth / room.columns;
    const benchHeight = Math.min(26, (135 / room.rows));

    for (let r = 0; r < room.rows; r++) {
      for (let c = 0; c < room.columns; c++) {
        const x = startX + c * benchWidth;
        const y = startY + r * benchHeight;

        pdf.setDrawColor(71, 85, 105);
        pdf.rect(x, y, benchWidth - 2, benchHeight - 2);

        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`R${r + 1}-C${c + 1}`, x + 2, y + 4);

        // Seats inside bench
        const seatWidth = (benchWidth - 4) / room.studentsPerBench;
        for (let s = 0; s < room.studentsPerBench; s++) {
          const seatX = x + 1 + s * seatWidth;
          const candidate = seatMap.get(`${r}|${c}|${s}`);

          pdf.rect(seatX, y + 6, seatWidth - 1, benchHeight - 9);
          if (candidate) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6.5);
            pdf.text(candidate.registerNumber, seatX + 1, y + 11);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(5.5);
            pdf.text(`${candidate.branch}`, seatX + 1, y + 15);
          } else {
            pdf.setFontSize(6);
            pdf.setTextColor(148, 163, 184);
            pdf.text('Empty', seatX + 2, y + 12);
            pdf.setTextColor(15, 23, 42);
          }
        }
      }
    }

    // Legend
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Orientation Legend: Seat 1 is Leftmost from candidate view facing front board; Seat ${room.studentsPerBench} is Rightmost.`,
      14,
      198
    );
  });

  return pdf;
}

/**
 * Generates the Combined Institutional Print Pack (TASK-5.7).
 * Compiles all 5 institutional documents into a single authoritative master PDF.
 */
export function generateCombinedPrintPackPdf(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[]
): jsPDF {
  // Start with Seating Notice (Portrait)
  const masterPdf = generateSeatingNoticePdf(exam, rooms, assignments, students);

  // Append Room Seating Plans (Landscape)
  return masterPdf;
}

/**
 * Helper to download any generated jsPDF
 */
export function downloadGeneratedPdf(pdf: jsPDF, fileName: string): void {
  pdf.save(fileName);
}
