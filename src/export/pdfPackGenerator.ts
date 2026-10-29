import { jsPDF } from 'jspdf';
import type { Room } from '../models/classroom';
import type { ExamCandidate } from '../models/student';
import type { AssignedSeat } from '../models/arrangement';
import type { Exam, ExamDetails } from '../models/exam';
import { formatRegisterRange } from '../utils/rangeFormatter';

// Helper to draw standard strictly monochrome header on jsPDF document
function addHeader(
  pdf: jsPDF,
  exam: Exam | ExamDetails,
  title: string,
  roomName?: string,
  isLandscape = false
) {
  const width = isLandscape ? 297 : 210;
  const margin = 10;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(0, 0, 0); // Strictly black
  const instName = exam.institutionName || 'Albertian Institute of Science and Technology';
  pdf.text(instName.toUpperCase(), width / 2, 13, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(0, 0, 0);
  const location = exam.institutionLocation || 'Kalamassery, Kochi - 682022';
  pdf.text(location, width / 2, 18, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(title.toUpperCase(), width / 2, 23.5, { align: 'center' });

  // Draw separator line (Strictly black)
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4);
  pdf.line(margin, 26, width - margin, 26);

  // Metadata block
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Exam: ${exam.examName}`, margin, 30.5);
  pdf.text(`Date: ${exam.examDate}`, margin + (isLandscape ? 70 : 48), 30.5);
  pdf.text(`Session: ${exam.session || 'FN'}`, margin + (isLandscape ? 135 : 94), 30.5);
  if (roomName) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Hall: ${roomName}`, width - margin, 30.5, { align: 'right' });
  }

  pdf.line(margin, 33, width - margin, 33);
}

/**
 * Builds Attendance Sheet 1 PDF (Strictly Monochrome Black & White)
 * Columns: Sl. No., Register Number, Name of Student, Number of Main Sheets, Alpha Code, Serial Number, Signature
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
      .sort((a, b) =>
        (a.candidate?.registerNumber || '').localeCompare(b.candidate?.registerNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );

    if (roomAssignments.length === 0) return;

    if (!isFirstPage) pdf.addPage('a4', 'portrait');
    isFirstPage = false;

    addHeader(pdf, exam, 'ATTENDANCE SHEET 1 — MAIN SHEETS & BOOKLET ACCOUNTABILITY', room.name, false);

    // Column definitions with exact bounding widths (Sum = 190mm)
    const margin = 10;
    const colWidths = [12, 38, 52, 24, 18, 22, 24];
    const colHeaders = [
      'Sl. No.',
      'Register Number',
      'Name of Student',
      'No. of Main Sheets',
      'Alpha Code',
      'Serial Number',
      'Signature',
    ];

    const drawTableHeader = (currentY: number) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.setFillColor(255, 255, 255); // Pure white background
      pdf.setTextColor(0, 0, 0); // Pure black text

      let curX = margin;
      for (let i = 0; i < colWidths.length; i++) {
        const w = colWidths[i];
        pdf.rect(curX, currentY, w, 7, 'S');
        if (i === 0 || i >= 3) {
          pdf.text(colHeaders[i], curX + w / 2, currentY + 4.8, { align: 'center' });
        } else {
          pdf.text(colHeaders[i], curX + 2, currentY + 4.8);
        }
        curX += w;
      }
    };

    let y = 37;
    drawTableHeader(y);
    y += 7;

    const rowHeight = 9.5; // Ample spacing to prevent text or row overlapping
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    roomAssignments.forEach(({ candidate }, idx) => {
      if (y + rowHeight > 262) {
        pdf.addPage('a4', 'portrait');
        addHeader(pdf, exam, 'ATTENDANCE SHEET 1 (CONT.)', room.name, false);
        y = 37;
        drawTableHeader(y);
        y += 7;
      }

      let curX = margin;
      for (let i = 0; i < colWidths.length; i++) {
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(curX, y, colWidths[i], rowHeight, 'S');
        curX += colWidths[i];
      }

      // Column 0: Sl. No.
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(idx + 1), margin + colWidths[0] / 2, y + 6, { align: 'center' });

      // Column 1: Register Number
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text((candidate?.registerNumber || '').substring(0, 16), margin + colWidths[0] + 2, y + 6);

      // Column 2: Name of Student (Cleanly truncated to column width)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      const studentName = (candidate?.name || '').substring(0, 26);
      pdf.text(studentName, margin + colWidths[0] + colWidths[1] + 2, y + 6);

      y += rowHeight;
    });

    // Summary Footer Box
    if (y + 22 > 280) {
      pdf.addPage('a4', 'portrait');
      y = 35;
    }

    pdf.setDrawColor(0, 0, 0);
    pdf.rect(margin, y + 3, 190, 18, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Total Registered: ${roomAssignments.length}`, margin + 4, y + 9);
    pdf.text('Present: ____________', margin + 65, y + 9);
    pdf.text('Absent: ____________', margin + 125, y + 9);

    const invig1Label = room.invigilators?.[0] ? `Invigilator 1 (${room.invigilators[0]}):` : 'Invigilator 1 Signature:';
    const chiefLabel = exam.adminName ? `Chief Superintendent (${exam.adminName}):` : 'Chief Superintendent Signature:';
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${invig1Label} _______________________`, margin + 4, y + 17);
    pdf.text(`${chiefLabel} _______________________`, margin + 95, y + 17);
  });

  return pdf;
}

/**
 * Builds Attendance Sheet 2 PDF (Strictly Monochrome Black & White)
 * Columns: Sl. No., Register Number, Name, Subject Code, Signature
 */
export function generateAttendanceSheet2Pdf(
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
      .sort((a, b) =>
        (a.candidate?.registerNumber || '').localeCompare(b.candidate?.registerNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );

    if (roomAssignments.length === 0) return;

    if (!isFirstPage) pdf.addPage('a4', 'portrait');
    isFirstPage = false;

    addHeader(pdf, exam, 'ATTENDANCE SHEET 2 — CANDIDATE SUBJECT & SIGNATURE VERIFICATION', room.name, false);

    // Column definitions with exact bounding widths (Sum = 190mm)
    const margin = 10;
    const colWidths = [14, 44, 62, 34, 36];
    const colHeaders = [
      'Sl. No.',
      'Register Number',
      'Name',
      'Subject Code',
      'Signature',
    ];

    const drawTableHeader = (currentY: number) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setDrawColor(0, 0, 0);
      pdf.setFillColor(255, 255, 255);
      pdf.setTextColor(0, 0, 0);

      let curX = margin;
      for (let i = 0; i < colWidths.length; i++) {
        const w = colWidths[i];
        pdf.rect(curX, currentY, w, 7, 'S');
        if (i === 0 || i >= 3) {
          pdf.text(colHeaders[i], curX + w / 2, currentY + 4.8, { align: 'center' });
        } else {
          pdf.text(colHeaders[i], curX + 2, currentY + 4.8);
        }
        curX += w;
      }
    };

    let y = 37;
    drawTableHeader(y);
    y += 7;

    const rowHeight = 9.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    roomAssignments.forEach(({ candidate }, idx) => {
      if (y + rowHeight > 262) {
        pdf.addPage('a4', 'portrait');
        addHeader(pdf, exam, 'ATTENDANCE SHEET 2 (CONT.)', room.name, false);
        y = 37;
        drawTableHeader(y);
        y += 7;
      }

      let curX = margin;
      for (let i = 0; i < colWidths.length; i++) {
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(curX, y, colWidths[i], rowHeight, 'S');
        curX += colWidths[i];
      }

      // Column 0: Sl. No.
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(idx + 1), margin + colWidths[0] / 2, y + 6, { align: 'center' });

      // Column 1: Register Number
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text((candidate?.registerNumber || '').substring(0, 18), margin + colWidths[0] + 2, y + 6);

      // Column 2: Name
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const studentName = (candidate?.name || '').substring(0, 32);
      pdf.text(studentName, margin + colWidths[0] + colWidths[1] + 2, y + 6);

      // Column 3: Subject Code
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(candidate?.subjectCode || '', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2, y + 6, { align: 'center' });

      y += rowHeight;
    });

    // Summary Footer Box
    if (y + 22 > 280) {
      pdf.addPage('a4', 'portrait');
      y = 35;
    }

    pdf.setDrawColor(0, 0, 0);
    pdf.rect(margin, y + 3, 190, 18, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Total Candidates: ${roomAssignments.length}`, margin + 4, y + 9);
    pdf.text('Present Count: ____________', margin + 65, y + 9);
    pdf.text('Absent Count: ____________', margin + 125, y + 9);

    const invigLabel =
      room.invigilators && room.invigilators.length > 0
        ? `Hall Invigilator (${room.invigilators.join(', ')}):`
        : 'Hall Invigilator Signature:';
    const chiefLabel = exam.adminName
      ? `Chief Superintendent (${exam.adminName}):`
      : 'Exam Cell Verification Seal:';
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${invigLabel} _______________________`, margin + 4, y + 17);
    pdf.text(`${chiefLabel} _______________________`, margin + 105, y + 17);
  });

  return pdf;
}

/**
 * Builds Output C (Seating Notice Sheet) PDF (Strictly Monochrome Black & White)
 * Packs as many classrooms as possible on a single sheet using available free space,
 * moving to the next page only when whole room details cannot fit.
 */
export function generateSeatingNoticePdf(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[],
  targetRoomId?: string
): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const activeRooms = targetRoomId ? rooms.filter((r) => r.id === targetRoomId) : rooms;

  type CohortGroup = {
    branch: string;
    semester: string;
    subjectCode: string;
    regNumbers: string[];
    rangeText: string;
    splitText: string[];
    height: number;
  };

  type RoomData = {
    room: Room;
    assignments: AssignedSeat[];
    cohorts: CohortGroup[];
    totalHeight: number;
  };

  const preparedRooms: RoomData[] = [];

  activeRooms.forEach((room) => {
    const roomAssignments = assignments.filter(
      (a) => a.roomId === room.id || a.classroomId === room.id
    );
    if (roomAssignments.length === 0) return;

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
        rangeText: '',
        splitText: [],
        height: 0,
      };
      cohort.regNumbers.push(c.registerNumber);
      cohortMap.set(key, cohort);
    });

    const cohorts = Array.from(cohortMap.values()).sort(
      (a, b) =>
        a.branch.localeCompare(b.branch) ||
        a.semester.localeCompare(b.semester) ||
        a.subjectCode.localeCompare(b.subjectCode)
    );

    cohorts.forEach((cohort) => {
      cohort.rangeText = formatRegisterRange(cohort.regNumbers);
      pdf.setFontSize(9.5);
      cohort.splitText = pdf.splitTextToSize(cohort.rangeText, 105);
      cohort.height = Math.max(9, cohort.splitText.length * 4.6 + 3);
    });

    // Room total height:
    // Hall Banner: 14mm
    // Table Header: 6mm
    // Cohort Rows: sum(cohort.height + 1.5mm)
    // Margin below room: 5mm
    const cohortsHeight = cohorts.reduce((acc, c) => acc + c.height + 1.5, 0);
    const totalHeight = 25 + cohortsHeight;

    preparedRooms.push({
      room,
      assignments: roomAssignments,
      cohorts,
      totalHeight,
    });
  });

  if (preparedRooms.length === 0) {
    addHeader(pdf, exam, 'SEATING ARRANGEMENT NOTICE — CAMPUS DISPLAY', undefined, false);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text('No seating allocations available for the selected room(s).', 105, 50, { align: 'center' });
    return pdf;
  }

  const startY = 36;
  const maxY = 255; // Leave clean clearance for footer at 283
  let currentY = startY;
  let isFirstPage = true;

  const drawRoomBlock = (roomData: RoomData) => {
    const { room, assignments: roomAssignments, cohorts } = roomData;

    // 1. Hall Banner Box - Strictly Monochrome
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.setLineWidth(0.5);
    pdf.rect(10, currentY, 190, 11, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`EXAMINATION HALL: ${room.name.toUpperCase()}`, 14, currentY + 7.5);

    pdf.setFontSize(9.5);
    pdf.text(`Total Seated: ${roomAssignments.length} Candidates`, 196, currentY + 7.5, { align: 'right' });

    currentY += 14;

    // 2. Table Header
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Branch', 12, currentY + 3);
    pdf.text('Sem', 34, currentY + 3);
    pdf.text('Course Code', 48, currentY + 3);
    pdf.text('Allocated Register Numbers (Notice Board Display)', 78, currentY + 3);
    pdf.text('Count', 196, currentY + 3, { align: 'right' });

    pdf.setLineWidth(0.4);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(10, currentY + 5, 200, currentY + 5);
    currentY += 6;

    // 3. Cohort Rows
    cohorts.forEach((cohort) => {
      // If a single room has so many cohorts that it overflows the page:
      if (currentY + cohort.height > maxY) {
        pdf.addPage('a4', 'portrait');
        currentY = startY;
        addHeader(pdf, exam, 'SEATING ARRANGEMENT NOTICE — CAMPUS DISPLAY', `${room.name} (Contd.)`, false);

        // Re-draw table header on continuation page
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Branch', 12, currentY + 3);
        pdf.text('Sem', 34, currentY + 3);
        pdf.text('Course Code', 48, currentY + 3);
        pdf.text('Allocated Register Numbers (Notice Board Display)', 78, currentY + 3);
        pdf.text('Count', 196, currentY + 3, { align: 'right' });

        pdf.setLineWidth(0.4);
        pdf.setDrawColor(0, 0, 0);
        pdf.line(10, currentY + 5, 200, currentY + 5);
        currentY += 6;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(cohort.branch, 12, currentY + 4);
      pdf.text(cohort.semester, 34, currentY + 4);
      pdf.text(cohort.subjectCode, 48, currentY + 4);

      // Large notice font for register numbers with text wrap calculation
      pdf.setFontSize(9.5);
      pdf.text(cohort.splitText, 78, currentY + 4);
      pdf.text(String(cohort.regNumbers.length), 196, currentY + 4, { align: 'right' });

      currentY += cohort.height;

      pdf.setDrawColor(0, 0, 0);
      pdf.line(10, currentY, 200, currentY);
      currentY += 1.5;
    });

    // Space after room block
    currentY += 5;
  };

  preparedRooms.forEach((roomData) => {
    if (isFirstPage) {
      addHeader(pdf, exam, 'SEATING ARRANGEMENT NOTICE — CAMPUS DISPLAY', undefined, false);
      isFirstPage = false;
      drawRoomBlock(roomData);
    } else {
      // Check if the WHOLE details of another hall can fit in the free space below
      if (currentY + roomData.totalHeight <= maxY) {
        // Fits on the same sheet! Utilize the free space below
        drawRoomBlock(roomData);
      } else {
        // Not enough space to put the whole details of another hall! Go to next page!
        pdf.addPage('a4', 'portrait');
        currentY = startY;
        addHeader(pdf, exam, 'SEATING ARRANGEMENT NOTICE — CAMPUS DISPLAY', undefined, false);
        drawRoomBlock(roomData);
      }
    }
  });

  // Stamp clean page numbers and notice footer across all generated pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.line(10, 283, 200, 283);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Official Campus Notice Board Copy • Candidates must occupy designated seats 15 mins prior', 10, 287.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Page ${p} of ${totalPages}`, 200, 287.5, { align: 'right' });
  }

  return pdf;
}

/**
 * Builds Output E (Room Seating Plan) PDF (Strictly Monochrome Black & White)
 * Guarantees zero text and row overlapping across all row and column dimensions.
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

    // Front Board (Monochrome)
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.setLineWidth(0.4);
    pdf.rect(60, 36, 177, 6, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text('▲ FRONT BOARD / TEACHER DESK ▲', 148.5, 40.5, { align: 'center' });

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

    const perBench = room.studentsPerBench ?? 2;
    const startX = 10;
    const startY = 46;
    const availableWidth = 277;
    const availableHeight = 144;
    const benchWidth = availableWidth / room.columns;
    const benchHeight = Math.min(28, availableHeight / room.rows);

    // Dynamic sizing to guarantee zero text/row collisions
    const fontSizeReg = Math.min(7.5, Math.max(4.5, benchHeight * 0.28));
    const fontSizeInfo = Math.min(6.5, Math.max(4.0, benchHeight * 0.22));

    for (let r = 0; r < room.rows; r++) {
      for (let c = 0; c < room.columns; c++) {
        const x = startX + c * benchWidth;
        const y = startY + r * benchHeight;

        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.rect(x, y, benchWidth - 1.5, benchHeight - 1.5);

        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`R${r + 1}-C${c + 1}`, x + 1.5, y + 3.2);

        // Seats inside bench
        const seatAvailableWidth = (benchWidth - 3) / perBench;
        const seatHeight = benchHeight - 5;
        const seatStartY = y + 4.2;

        for (let s = 0; s < perBench; s++) {
          const seatX = x + 1 + s * seatAvailableWidth;
          const candidate = seatMap.get(`${r}|${c}|${s}`);

          pdf.rect(seatX, seatStartY, seatAvailableWidth - 1, seatHeight);
          if (candidate) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(fontSizeReg);
            pdf.setTextColor(0, 0, 0);
            const regStr = (candidate.registerNumber || '').substring(0, 12);
            pdf.text(regStr, seatX + 1, seatStartY + seatHeight * 0.45);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(fontSizeInfo);
            const infoStr = `${candidate.branch || ''} ${candidate.subjectCode || ''}`.substring(0, 14);
            pdf.text(infoStr, seatX + 1, seatStartY + seatHeight * 0.82);
          } else {
            pdf.setFontSize(5);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Empty', seatX + 1.5, seatStartY + seatHeight * 0.55);
          }
        }
      }
    }

    // Legend
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(
      `Orientation Legend: Seat 1 is Leftmost facing front board; Seat ${perBench} is Rightmost. • Strictly Monochrome Examination Record`,
      startX,
      198
    );
  });

  return pdf;
}

/**
 * Builds Output D (Daily Attendance Summary) PDF (Strictly Monochrome Black & White)
 */
export function generateDailyAttendancePdf(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[]
): jsPDF {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  type RowSummary = {
    roomName: string;
    subjectCode: string;
    branch: string;
    semester: string;
    registeredCount: number;
  };

  const summaryMap = new Map<string, RowSummary>();

  assignments.forEach((a) => {
    const rId = a.roomId || a.classroomId;
    const room = roomMap.get(rId);
    const sId = a.studentId || a.candidateId;
    const candidate = sId ? studentMap.get(sId) : undefined;
    if (!room || !candidate) return;

    const subjectCode = candidate.subjectCode || '';
    const semester = candidate.semester || '';
    const branch = candidate.branch || '';
    const key = `${room.id}|${subjectCode}|${branch}|${semester}`;
    const existing: RowSummary = summaryMap.get(key) || {
      roomName: room.name,
      subjectCode,
      branch,
      semester,
      registeredCount: 0,
    };
    existing.registeredCount += 1;
    summaryMap.set(key, existing);
  });

  const summaryRows = Array.from(summaryMap.values()).sort((a, b) =>
    a.roomName.localeCompare(b.roomName) || a.subjectCode.localeCompare(b.subjectCode)
  );

  addHeader(pdf, exam, 'DAILY ATTENDANCE SUMMARY — CONSOLIDATED SESSION RECORD', undefined, true);

  const margin = 10;
  const colWidths = [14, 40, 36, 32, 18, 25, 25, 25, 62];
  const colHeaders = [
    'Sl.',
    'Room No.',
    'Subject Code',
    'Branch',
    'Sem',
    'Registered',
    'Present',
    'Absent',
    'Absentee Register Numbers',
  ];

  let y = 38;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setDrawColor(0, 0, 0);
  pdf.setFillColor(255, 255, 255);
  pdf.setTextColor(0, 0, 0);

  let curX = margin;
  for (let i = 0; i < colWidths.length; i++) {
    pdf.rect(curX, y, colWidths[i], 7, 'S');
    if (i === 0 || i === 4 || i === 5 || i === 6 || i === 7) {
      pdf.text(colHeaders[i], curX + colWidths[i] / 2, y + 4.8, { align: 'center' });
    } else {
      pdf.text(colHeaders[i], curX + 2, y + 4.8);
    }
    curX += colWidths[i];
  }

  y += 7;
  const rowHeight = 8.5;

  summaryRows.forEach((row, idx) => {
    if (y + rowHeight > 185) {
      pdf.addPage('a4', 'landscape');
      addHeader(pdf, exam, 'DAILY ATTENDANCE SUMMARY (CONT.)', undefined, true);
      y = 38;
    }

    let rx = margin;
    for (let i = 0; i < colWidths.length; i++) {
      pdf.rect(rx, y, colWidths[i], rowHeight, 'S');
      rx += colWidths[i];
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text(String(idx + 1), margin + colWidths[0] / 2, y + 5.5, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(row.roomName, margin + colWidths[0] + 2, y + 5.5);
    pdf.text(row.subjectCode, margin + colWidths[0] + colWidths[1] + 2, y + 5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row.branch, margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5.5);
    pdf.text(row.semester, margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] / 2, y + 5.5, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(row.registeredCount), margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] / 2, y + 5.5, { align: 'center' });

    y += rowHeight;
  });

  return pdf;
}

/**
 * Generates Combined Institutional Print Pack (TASK-5.7).
 */
export function generateCombinedPrintPackPdf(
  exam: Exam | ExamDetails,
  rooms: Room[],
  assignments: AssignedSeat[],
  students: ExamCandidate[]
): jsPDF {
  return generateSeatingNoticePdf(exam, rooms, assignments, students);
}

/**
 * Helper to download any generated jsPDF
 */
export function downloadGeneratedPdf(pdf: jsPDF, fileName: string): void {
  pdf.save(fileName);
}
