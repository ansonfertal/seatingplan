import type { ExamDetails } from '../models/exam';
import type { Student } from '../models/student';

export function selectExamStudents(students: Student[], exam: ExamDetails): Student[] {
  const semesters = exam.selectedSemesters ?? [];
  const subjectCodes = exam.selectedSubjectCodes ?? [];

  return students.filter((student) => {
    const matchesSemester = semesters.length === 0 || semesters.includes(student.semester ?? '');
    const matchesSubject = subjectCodes.length === 0 || subjectCodes.includes(student.subjectCode ?? '');
    return matchesSemester && matchesSubject;
  });
}
