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
    <div className="space-y-8">
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
            className="notice-board-sheet"
            footerContent={
              <div className="border border-slate-900 bg-slate-50 p-4 text-xs font-medium">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Total Seated in {room.name}: {roomAssignments.length} Candidates</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Candidates must occupy their designated seats 15 minutes before the exam commencement.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">Controller of Examinations / Exam Cell</p>
                    <p className="text-[10px] text-slate-500">Official Campus Display Copy</p>
                  </div>
                </div>
              </div>
            }
          >
            {/* Prominent Hall Banner for quick recognition */}
            <div className="mb-6 rounded-xl border-2 border-slate-900 bg-slate-100 p-4 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                EXAMINATION HALL / ROOM
              </span>
              <p className="text-3xl font-black tracking-tight text-slate-950 uppercase mt-0.5">
                {room.name}
              </p>
            </div>

            {/* High-Contrast Roll Number Notice Table */}
            <div className="space-y-4">
              <table className="w-full text-left border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-2.5 px-3 text-sm font-bold uppercase tracking-wider w-28 bg-slate-900 text-white border-slate-900">
                      Branch
                    </th>
                    <th className="py-2.5 px-3 text-sm font-bold uppercase tracking-wider w-20 bg-slate-900 text-white border-slate-900">
                      Sem
                    </th>
                    <th className="py-2.5 px-3 text-sm font-bold uppercase tracking-wider w-28 bg-slate-900 text-white border-slate-900">
                      Course Code
                    </th>
                    <th className="py-2.5 px-3 text-sm font-bold uppercase tracking-wider bg-slate-900 text-white border-slate-900">
                      Allocated Register Number Range(s)
                    </th>
                    <th className="py-2.5 px-3 text-sm font-bold uppercase tracking-wider w-20 text-center bg-slate-900 text-white border-slate-900">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-800">
                  {cohorts.map((cohort, idx) => {
                    const rangeText = formatRegisterRange(cohort.regNumbers);

                    return (
                      <tr key={idx} className="border-b-2 border-slate-700">
                        <td className="py-3 px-3 font-bold text-base text-slate-950 border-r border-slate-700">
                          {cohort.branch}
                        </td>
                        <td className="py-3 px-3 font-bold text-base text-slate-900 border-r border-slate-700">
                          {cohort.semester}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-sm text-slate-900 border-r border-slate-700">
                          {cohort.subjectCode}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-700">
                          {/* Large high-contrast typography conforming to PRD 4.7 */}
                          <p className="font-mono text-base sm:text-lg font-black tracking-wide text-slate-950 leading-relaxed">
                            {rangeText}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-lg text-slate-950">
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
