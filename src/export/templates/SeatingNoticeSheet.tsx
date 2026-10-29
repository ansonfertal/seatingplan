import React, { useMemo } from 'react';
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

export type NoticeCohort = {
  branch: string;
  semester: string;
  subjectCode: string;
  regNumbers: string[];
  rangeText: string;
  estimatedHeightMm: number;
};

export type RoomNoticeData = {
  room: Room;
  cohorts: NoticeCohort[];
  totalCandidates: number;
  estimatedHeightMm: number;
};

export type NoticePage = {
  rooms: RoomNoticeData[];
  totalCandidates: number;
};

/**
 * Seating Arrangement Notice Sheet (Strictly Monochrome Black & White)
 * Official high-contrast campus notice board display with zero overlap.
 * Packs as many classrooms as possible on a single sheet using available free space,
 * moving to the next page only when whole room details cannot fit.
 */
export const SeatingNoticeSheet: React.FC<SeatingNoticeSheetProps> = ({
  exam,
  rooms,
  assignments,
  students,
  targetRoomId,
}) => {
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const activeRooms = useMemo(
    () => (targetRoomId ? rooms.filter((r) => r.id === targetRoomId) : rooms),
    [targetRoomId, rooms]
  );

  // 1. Process and compute layout dimensions for each active room
  const roomsData = useMemo(() => {
    const list: RoomNoticeData[] = [];

    activeRooms.forEach((room) => {
      const roomAssignments = assignments.filter(
        (a) => a.roomId === room.id || a.classroomId === room.id
      );
      if (roomAssignments.length === 0) return;

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
          rangeText: '',
          estimatedHeightMm: 0,
        };
        cohort.regNumbers.push(candidate.registerNumber);
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
        // Monospace roll numbers column (~78mm width, ~36 chars/line)
        const lines = Math.max(1, Math.ceil(cohort.rangeText.length / 36));
        cohort.estimatedHeightMm = 8 + (lines - 1) * 4.5;
      });

      // Total estimated height for this hall block (banner: ~14mm, table header: ~7mm, rows, gap: ~6mm)
      const cohortsHeight = cohorts.reduce((sum, c) => sum + c.estimatedHeightMm, 0);
      const estimatedHeightMm = 14 + 2 + 7 + cohortsHeight + 6;

      list.push({
        room,
        cohorts,
        totalCandidates: roomAssignments.length,
        estimatedHeightMm,
      });
    });

    return list;
  }, [activeRooms, assignments, studentMap]);

  // 2. Pack rooms into pages using greedy bin-packing
  // Max available vertical space on an A4 sheet for content (between header and footer)
  const MAX_PAGE_HEIGHT_MM = 215;

  const pages = useMemo(() => {
    const pageList: NoticePage[] = [];
    let currentPageRooms: RoomNoticeData[] = [];
    let currentPageHeight = 0;

    roomsData.forEach((roomData) => {
      if (currentPageRooms.length === 0) {
        currentPageRooms.push(roomData);
        currentPageHeight = roomData.estimatedHeightMm;
      } else if (currentPageHeight + roomData.estimatedHeightMm <= MAX_PAGE_HEIGHT_MM) {
        // Fits in free space below on this sheet!
        currentPageRooms.push(roomData);
        currentPageHeight += roomData.estimatedHeightMm;
      } else {
        // Whole details do not fit on current sheet: go to next page!
        pageList.push({
          rooms: currentPageRooms,
          totalCandidates: currentPageRooms.reduce((sum, r) => sum + r.totalCandidates, 0),
        });
        currentPageRooms = [roomData];
        currentPageHeight = roomData.estimatedHeightMm;
      }
    });

    if (currentPageRooms.length > 0) {
      pageList.push({
        rooms: currentPageRooms,
        totalCandidates: currentPageRooms.reduce((sum, r) => sum + r.totalCandidates, 0),
      });
    }

    return pageList;
  }, [roomsData]);

  if (pages.length === 0) {
    return (
      <PrintContainer
        orientation="portrait"
        documentTitle="SEATING ARRANGEMENT NOTICE"
        documentSubtitle="CAMPUS NOTICE BOARD DISPLAY"
        exam={exam}
        className="notice-board-sheet bg-white text-black"
        compactHeader={true}
      >
        <div className="p-8 text-center border-2 border-black">
          <p className="font-bold text-base text-black">No candidates allocated to display.</p>
        </div>
      </PrintContainer>
    );
  }

  return (
    <div className="space-y-8 bg-white">
      {pages.map((page, pageIndex) => {
        const roomNames = page.rooms.map((r) => r.room.name).join(', ');
        const isSingleRoom = page.rooms.length === 1;

        return (
          <PrintContainer
            key={`notice-page-${pageIndex}`}
            orientation="portrait"
            documentTitle="SEATING ARRANGEMENT NOTICE"
            documentSubtitle={
              isSingleRoom
                ? `NOTICE BOARD DISPLAY — ${page.rooms[0].room.name.toUpperCase()}`
                : `CAMPUS NOTICE BOARD DISPLAY — ${roomNames}`
            }
            exam={exam}
            roomName={isSingleRoom ? page.rooms[0].room.name : roomNames}
            pageNumber={pageIndex + 1}
            totalPages={pages.length}
            compactHeader={true}
            className="notice-board-sheet bg-white text-black"
            footerContent={
              <div className="border border-black bg-white p-2.5 text-xs font-medium text-black">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-black">
                      Total Seated on this Sheet: {page.totalCandidates} Candidates | Halls:{' '}
                      {page.rooms.map((r) => `${r.room.name} (${r.totalCandidates})`).join(' • ')}
                    </p>
                    <p className="text-[10.5px] text-black mt-0.5">
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
            <div className="space-y-4 bg-white">
              {page.rooms.map((roomData) => {
                const { room, cohorts, totalCandidates } = roomData;

                return (
                  <div
                    key={`${room.id}-notice-block`}
                    className="avoid-break space-y-2 border-b-2 border-black pb-3 last:border-b-0 last:pb-0"
                  >
                    {/* Prominent Hall Banner - Strictly Monochrome */}
                    <div className="border-2 border-black bg-white px-3 py-1.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black block">
                          EXAMINATION HALL / ROOM
                        </span>
                        <p className="text-xl sm:text-2xl font-black tracking-tight text-black uppercase mt-0.5">
                          {room.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block border border-black px-2.5 py-1 text-xs font-bold text-black uppercase">
                          Total Candidates: {totalCandidates}
                        </span>
                      </div>
                    </div>

                    {/* High-Contrast Roll Number Notice Table - Fixed Layout, Zero Overlap */}
                    <table className="w-full text-left border-2 border-black border-collapse table-fixed bg-white">
                      <colgroup>
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '44%' }} />
                        <col style={{ width: '12%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-white text-black border-b-2 border-black">
                          <th className="py-1.5 px-2.5 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                            Branch
                          </th>
                          <th className="py-1.5 px-2 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                            Sem
                          </th>
                          <th className="py-1.5 px-2.5 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                            Course Code
                          </th>
                          <th className="py-1.5 px-2.5 text-xs font-bold uppercase tracking-wider text-black border-r border-black">
                            Allocated Register Number Range(s)
                          </th>
                          <th className="py-1.5 px-2.5 text-xs font-bold uppercase tracking-wider text-center text-black">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohorts.map((cohort, idx) => (
                          <tr key={idx} className="border-b border-black bg-white">
                            <td className="py-1.5 px-2.5 font-bold text-sm text-black border-r border-black truncate">
                              {cohort.branch}
                            </td>
                            <td className="py-1.5 px-2 font-bold text-sm text-black border-r border-black truncate">
                              {cohort.semester}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-sm text-black border-r border-black truncate">
                              {cohort.subjectCode}
                            </td>
                            <td className="py-1.5 px-3 border-r border-black break-words">
                              <p className="font-mono text-sm sm:text-base font-bold tracking-wide text-black leading-snug">
                                {cohort.rangeText}
                              </p>
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-bold text-base text-black">
                              {cohort.regNumbers.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </PrintContainer>
        );
      })}
    </div>
  );
};

