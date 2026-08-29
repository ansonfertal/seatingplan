import html2canvas from 'html2canvas';
import type { SeatingArrangement } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';

export async function downloadClassroomSeatingImage(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[],
  fileName = `Classroom_Seating_${Date.now()}.png`
): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }

  const studentMap = new Map(students.map((student) => [student.id, student]));

  const exportRoot = document.createElement('div');
  exportRoot.style.position = 'fixed';
  exportRoot.style.left = '-10000px';
  exportRoot.style.top = '0';
  exportRoot.style.width = '1200px';
  exportRoot.style.padding = '24px';
  exportRoot.style.background = '#ffffff';
  exportRoot.style.color = '#0f172a';
  exportRoot.style.fontFamily = 'Arial, sans-serif';
  exportRoot.style.boxSizing = 'border-box';

  const title = document.createElement('h1');
  title.textContent = `${arrangement.exam.examName} - Seating Plan`;
  title.style.margin = '0 0 16px';
  title.style.fontSize = '28px';
  title.style.fontWeight = '700';
  exportRoot.appendChild(title);

  const meta = document.createElement('div');
  meta.style.display = 'flex';
  meta.style.gap = '16px';
  meta.style.flexWrap = 'wrap';
  meta.style.marginBottom = '20px';
  meta.style.fontSize = '14px';
  meta.innerHTML = `
    <span><strong>Date:</strong> ${arrangement.exam.examDate}</span>
    <span><strong>Session:</strong> ${arrangement.exam.session}</span>
    <span><strong>Institution:</strong> ${arrangement.exam.institutionName}</span>
  `;
  exportRoot.appendChild(meta);

  const classroomGrid = document.createElement('div');
  classroomGrid.style.display = 'grid';
  classroomGrid.style.gridTemplateColumns = 'repeat(2, minmax(320px, 1fr))';
  classroomGrid.style.gap = '20px';
  exportRoot.appendChild(classroomGrid);

  classrooms.forEach((classroom) => {
    const roomCard = document.createElement('div');
    roomCard.style.border = '1px solid #e2e8f0';
    roomCard.style.borderRadius = '12px';
    roomCard.style.padding = '14px';
    roomCard.style.background = '#f8fafc';

    const heading = document.createElement('h2');
    heading.textContent = classroom.name;
    heading.style.margin = '0 0 12px';
    heading.style.fontSize = '20px';
    heading.style.fontWeight = '700';
    roomCard.appendChild(heading);

    const seatWrapper = document.createElement('div');
    seatWrapper.style.display = 'grid';
    seatWrapper.style.gridTemplateColumns = `repeat(${classroom.columns}, minmax(64px, 1fr))`;
    seatWrapper.style.gap = '8px';

    for (let row = 0; row < classroom.rows; row += 1) {
      for (let column = 0; column < classroom.columns; column += 1) {
        for (let seatIndex = 0; seatIndex < classroom.studentsPerBench; seatIndex += 1) {
          const assignment = arrangement.assignments.find(
            (item) =>
              item.classroomId === classroom.id &&
              item.row === row &&
              item.column === column &&
              item.seatIndex === seatIndex
          );

          const student = assignment ? studentMap.get(assignment.studentId) : undefined;
          const isDisabled = classroom.disabledSeats.some(
            (seat) =>
              seat.row === row &&
              seat.column === column &&
              seat.seatIndex === seatIndex
          );

          const seatCell = document.createElement('div');
          seatCell.style.display = 'flex';
          seatCell.style.flexDirection = 'column';
          seatCell.style.alignItems = 'center';
          seatCell.style.justifyContent = 'center';
          seatCell.style.minHeight = '70px';
          seatCell.style.padding = '6px 4px';
          seatCell.style.borderRadius = '8px';
          seatCell.style.border = '1px solid #cbd5e1';
          seatCell.style.background = isDisabled ? '#e2e8f0' : student ? '#e0e7ff' : '#ffffff';
          seatCell.style.color = isDisabled ? '#64748b' : student ? '#1e1b4b' : '#475569';
          seatCell.style.fontSize = '9px';
          seatCell.style.fontWeight = '600';
          seatCell.style.textAlign = 'center';
          seatCell.style.overflow = 'hidden';

          if (isDisabled) {
            seatCell.textContent = 'Disabled';
          } else if (student) {
            seatCell.innerHTML = `<div>${student.registerNumber}</div><div style="font-size: 8px; opacity: 0.8; margin-top: 2px;">${student.branch}</div>`;
          } else {
            seatCell.textContent = 'Open';
          }

          seatWrapper.appendChild(seatCell);
        }
      }
    }

    roomCard.appendChild(seatWrapper);
    classroomGrid.appendChild(roomCard);
  });

  document.body.appendChild(exportRoot);

  try {
    const canvas = await html2canvas(exportRoot, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 1200,
    });

    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    exportRoot.remove();
  }
}
