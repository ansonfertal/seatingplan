import { describe, expect, it } from 'vitest';
import {
  detectTimetableClashes,
  type CandidateExamPaperSitting,
} from '../src/algorithms/timetableClashDetector';

describe('TASK-7.3: Timetable Clash Detection & Multi-Sitting Exam Rostering Engine', () => {
  it('detects critical clashes when a candidate is scheduled for two different papers in the same session', () => {
    const sittings: CandidateExamPaperSitting[] = [
      {
        examId: 'exam-1',
        examName: 'Morning CS Theory',
        date: '2026-10-25',
        session: 'FN',
        candidate: {
          id: 'c-1',
          registerNumber: '2024CS001',
          name: 'Arthur Pendelton',
          branch: 'CSE',
          semester: '5',
          subjectCode: 'CS501',
        },
      },
      {
        examId: 'exam-2',
        examName: 'Morning Math Elective',
        date: '2026-10-25',
        session: 'FN',
        candidate: {
          id: 'c-1-dup',
          registerNumber: '2024CS001',
          name: 'Arthur Pendelton',
          branch: 'CSE',
          semester: '5',
          subjectCode: 'MA501',
        },
      },
      {
        examId: 'exam-1',
        examName: 'Morning CS Theory',
        date: '2026-10-25',
        session: 'FN',
        candidate: {
          id: 'c-2',
          registerNumber: '2024CS002',
          name: 'Bethany Clark',
          branch: 'CSE',
          semester: '5',
          subjectCode: 'CS501',
        },
      },
    ];

    const report = detectTimetableClashes(sittings);

    expect(report.hasClashes).toBe(true);
    expect(report.totalClashesCount).toBe(1);

    const clash = report.criticalClashes[0];
    expect(clash.registerNumber).toBe('2024CS001');
    expect(clash.date).toBe('2026-10-25');
    expect(clash.session).toBe('FN');
    expect(clash.papers).toHaveLength(2);
    expect(clash.papers.map((p) => p.subjectCode)).toEqual(['CS501', 'MA501']);
    expect(clash.resolutionRecommendation).toContain('Reschedule one paper to Afternoon (AN)');
  });

  it('verifies legitimate multi-sitting candidates who have distinct morning and afternoon papers on the same date', () => {
    const sittings: CandidateExamPaperSitting[] = [
      {
        examId: 'exam-morning',
        examName: 'Data Structures',
        date: '2026-10-28',
        session: 'FN',
        candidate: {
          id: 'c-10',
          registerNumber: '2024CS010',
          name: 'Carlos Mendez',
          branch: 'CSE',
          semester: '3',
          subjectCode: 'CS301',
        },
      },
      {
        examId: 'exam-afternoon',
        examName: 'Digital Logic Lab',
        date: '2026-10-28',
        session: 'AN',
        candidate: {
          id: 'c-10-lab',
          registerNumber: '2024CS010',
          name: 'Carlos Mendez',
          branch: 'CSE',
          semester: '3',
          subjectCode: 'CS302',
        },
      },
    ];

    const report = detectTimetableClashes(sittings);

    // No critical same-session clash
    expect(report.hasClashes).toBe(false);
    expect(report.criticalClashes).toHaveLength(0);

    // Identified as valid multi-sitting
    expect(report.validMultiSittings).toHaveLength(1);
    const multi = report.validMultiSittings[0];
    expect(multi.registerNumber).toBe('2024CS010');
    expect(multi.papers).toHaveLength(2);
    expect(multi.resolutionRecommendation).toContain('Multi-sitting roster confirmed');
  });

  it('returns clean report with zero clashes when all candidates have single non-overlapping exams', () => {
    const sittings: CandidateExamPaperSitting[] = [
      {
        examId: 'exam-a',
        examName: 'Physics',
        date: '2026-11-01',
        session: 'FN',
        candidate: {
          id: 'c-1',
          registerNumber: 'REG101',
          name: 'Student One',
          branch: 'PHY',
          semester: '1',
          subjectCode: 'PH101',
        },
      },
      {
        examId: 'exam-a',
        examName: 'Physics',
        date: '2026-11-01',
        session: 'FN',
        candidate: {
          id: 'c-2',
          registerNumber: 'REG102',
          name: 'Student Two',
          branch: 'PHY',
          semester: '1',
          subjectCode: 'PH101',
        },
      },
    ];

    const report = detectTimetableClashes(sittings);

    expect(report.hasClashes).toBe(false);
    expect(report.criticalClashes).toHaveLength(0);
    expect(report.validMultiSittings).toHaveLength(0);
  });
});
