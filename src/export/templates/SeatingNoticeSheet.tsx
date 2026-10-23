import React from 'react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';
import type { Exam, ExamDetails } from '../../models/exam';
import { PrintContainer } from './PrintContainer';
import { formatRegisterRange } from '../../utils/rangeFormatter';

export type SeatingNoticeSheetProps = {
  exam: Exam | ExamDetails;
  rooms: Room[];
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  targetRoomId?: string;
};

/**
 * Seating Arrangement Notice Sheet (Strictly Monochrome Black & White)
 * Official high-contrast campus notice board display with zero overlap.
 */
export const SeatingNoticeSheet: React.FC<SeatingNoticeSheetProps> = ({
  exam,
  rooms,
  assignments,
  students,
  targetRoomId,
}) => {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const activeRooms = targetRoomId ? rooms.filter((r) => r.id === targetRoomId) : rooms;

  return (
    <div className="space-y-8 bg-white">
      {activeRooms.map((room) => {
        const roomAssignments = assignments.filter(
          (a) => a.roomId === room.id || a.classroomId === room.id
        );
        if (roomAssignments.length === 0) return null;

        type NoticeCohort = { branch: string; semester: string; subjectCode: string; regNumbers: string[] };
        const cohortMap = new Map<string, NoticeCohort>();

        roomAssignments.forEach((a) => {
          const studentId = a.studentId || a.candidateId;
          const candidate = studentId ? studentMap.get(studentId) : undefined;
          if (!candidate) return;

          const branch = candidate.branch || '';
          const semester = candidate.semester || '';
          const subjectCode = candidate.subjectCode || '';
          const key = `${branch}|${semester}|${subjectCode}`;
          const cohort: NoticeCohort = cohortMap.get(key) || {
            branch,
            semester,
            subjectCode,
            regNumbers: [],
          };
          cohort.regNumbers.push(candidate.registerNumber);
          cohortMap.set(key, cohort);
        });

        const cohorts = Array.from(cohortMap.values()).sort((a, b) =>
          a.branch.localeCompare(b.branch) || a.semester.localeCompare(b.semester)
        );

        return (
          <PrintContainer
            key={`${room.id}-notice`}
            orientation="portrait"
            documentTitle="SEATING ARRANGEMENT NOTICE"
            documentSubtitle={`NOTICE BOARD DISPLAY — ${room.name.toUpperCase()}`}
            exam={exam}
            roomName={room.name}
            className="notice-board-sheet bg-white text-black"
            footerContent={
              <div className="border border-black bg-white p-3 text-xs font-medium text-black">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-black">Total Seated in {room.name}: {roomAssignments.length} Candidates</p>
                    <p className="text-[11px] text-black mt-0.5">
                      Candidates must occupy their designated seats 15 minutes before the exam commencement.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">Controller of Examinations / Exam Cell</p>
                    <p className="text-[10px] text-black">Official Campus Display Copy</p>
                  </div>
                </div>
              </div>
            }
          >
            {/* Prominent Hall Banner - Strictly Monochrome */}
            <div className="mb-4 rounded-xl border-2 border-black bg-white p-3 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-black">
                EXAMINATION HALL / ROOM
              </span>
              <p className="text-3xl font-black tracking-tight text-black uppercase mt-0.5">
                {room.name}
              </p>
            </div>

            {/* High-Contrast Roll Number Notice Table - Fixed Layout, Zero Overlap */}
            <div className="space-y-4 bg-white">
              <table className="w-full text-left border-2 border-black border-collapse table-fixed bg-white">
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '42%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-white text-black border-b-2 border-black">
                    <th className="py-2 px-2.5 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                      Branch
                    </th>
                    <th className="py-2 px-2.5 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                      Sem
                    </th>
                    <th className="py-2 px-2.5 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                      Course Code
                    </th>
                    <th className="py-2 px-2.5 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                      Allocated Register Number Range(s)
                    </th>
                    <th className="py-2 px-2.5 text-xs font-bold uppercase tracking-wider text-center text-black">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((cohort, idx) => {
                    const rangeText = formatRegisterRange(cohort.regNumbers);

                    return (
                      <tr key={idx} className="border-b border-black bg-white">
                        <td className="py-2 px-2.5 font-bold text-sm text-black border-r border-black truncate">
                          {cohort.branch}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-sm text-black border-r border-black truncate">
                          {cohort.semester}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-sm text-black border-r border-black truncate">
                          {cohort.subjectCode}
                        </td>
                        <td className="py-2 px-3 border-r border-black break-words">
                          <p className="font-mono text-sm sm:text-base font-bold tracking-wide text-black leading-relaxed">
                            {rangeText}
                          </p>
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold text-base text-black">
                          {cohort.regNumbers.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PrintContainer>
        );
      })}
    </div>
  );
};
