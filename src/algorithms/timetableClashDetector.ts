import type { ExamCandidate } from '../models/student';
import { normalizeCode } from '../models/student';

export type CandidateExamPaperSitting = {
  examId: string;
  examName: string;
  date: string;
  session: string; // e.g. 'FN' | 'AN'
  candidate: ExamCandidate;
};

export type TimetableClash = {
  candidateId: string;
  registerNumber: string;
  studentName: string;
  date: string;
  session: string;
  papers: Array<{
    examId: string;
    examName: string;
    subjectCode: string;
    branch: string;
  }>;
  severity: 'CRITICAL_CLASH' | 'MULTIPLE_SITTING_OK';
  resolutionRecommendation: string;
};

export type TimetableClashReport = {
  hasClashes: boolean;
  totalClashesCount: number;
  criticalClashes: TimetableClash[];
  validMultiSittings: TimetableClash[];
};

/**
 * Detects timetable clashes and verifies multi-sitting examination rosters (PRD Section 4.2 & Phase 7).
 * - Flags candidates registered for multiple distinct papers in the same date and session as CRITICAL_CLASH.
 * - Identifies valid multi-sitting candidates (e.g. FN paper and AN paper on same date).
 */
export function detectTimetableClashes(
  sittings: CandidateExamPaperSitting[]
): TimetableClashReport {
  // Map: `${regNo}|${date}|${session}` -> array of papers
  const sessionSlots = new Map<string, CandidateExamPaperSitting[]>();
  // Map: `${regNo}|${date}` -> array of papers
  const dateSlots = new Map<string, CandidateExamPaperSitting[]>();

  sittings.forEach((sitting) => {
    const regKey = normalizeCode(sitting.candidate.registerNumber);
    const dateKey = sitting.date.trim();
    const sessionKey = sitting.session.trim().toUpperCase();

    const sessionSlotKey = `${regKey}|${dateKey}|${sessionKey}`;
    const dateSlotKey = `${regKey}|${dateKey}`;

    const sessionList = sessionSlots.get(sessionSlotKey) || [];
    sessionList.push(sitting);
    sessionSlots.set(sessionSlotKey, sessionList);

    const dateList = dateSlots.get(dateSlotKey) || [];
    dateList.push(sitting);
    dateSlots.set(dateSlotKey, dateList);
  });

  const criticalClashes: TimetableClash[] = [];
  const validMultiSittings: TimetableClash[] = [];

  // Check critical same-session overlaps
  sessionSlots.forEach((slotSittings, slotKey) => {
    // If more than 1 sitting for same candidate in exact same session
    if (slotSittings.length > 1) {
      const [, date, session] = slotKey.split('|');
      const first = slotSittings[0];

      // Collect distinct subject papers
      const papers = slotSittings.map((s) => ({
        examId: s.examId,
        examName: s.examName,
        subjectCode: s.candidate.subjectCode || 'N/A',
        branch: s.candidate.branch,
      }));

      criticalClashes.push({
        candidateId: first.candidate.id,
        registerNumber: first.candidate.registerNumber,
        studentName: first.candidate.name,
        date,
        session,
        papers,
        severity: 'CRITICAL_CLASH',
        resolutionRecommendation: `Timetable conflict: Candidate ${first.candidate.registerNumber} cannot sit for ${papers.length} simultaneous papers (${papers.map((p) => p.subjectCode).join(', ')}) in ${session} session on ${date}. Reschedule one paper to Afternoon (AN) or alternate exam date.`,
      });
    }
  });

  // Check valid multi-sitting on same date (e.g., FN paper and AN paper)
  dateSlots.forEach((dateSittings, dateKey) => {
    const [, date] = dateKey.split('|');
    const sessions = new Set(dateSittings.map((s) => s.session.trim().toUpperCase()));

    // If candidate has papers in multiple different sessions on same day
    if (sessions.size > 1) {
      const first = dateSittings[0];
      const papers = dateSittings.map((s) => ({
        examId: s.examId,
        examName: s.examName,
        subjectCode: s.candidate.subjectCode || 'N/A',
        branch: s.candidate.branch,
      }));

      validMultiSittings.push({
        candidateId: first.candidate.id,
        registerNumber: first.candidate.registerNumber,
        studentName: first.candidate.name,
        date,
        session: Array.from(sessions).join(' & '),
        papers,
        severity: 'MULTIPLE_SITTING_OK',
        resolutionRecommendation: `Multi-sitting roster confirmed: Candidate ${first.candidate.registerNumber} has distinct morning and afternoon papers on ${date}. Ensure invigilators are notified for lunch interval rest period.`,
      });
    }
  });

  return {
    hasClashes: criticalClashes.length > 0,
    totalClashesCount: criticalClashes.length,
    criticalClashes,
    validMultiSittings,
  };
}
