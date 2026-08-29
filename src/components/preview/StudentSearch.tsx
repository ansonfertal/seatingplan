import React from 'react';
import { Search } from 'lucide-react';
import type { AssignedSeat } from '../../models/arrangement';
import type { Classroom } from '../../models/classroom';
import type { Student } from '../../models/student';
import { Input } from '../ui/Input';

export type StudentSearchProps = {
  students: Student[];
  classrooms: Classroom[];
  assignments: AssignedSeat[];
  onSelectStudent: (student: Student, classroomId: string) => void;
};

export const StudentSearch: React.FC<StudentSearchProps> = ({
  students,
  classrooms,
  assignments,
  onSelectStudent,
}) => {
  const [query, setQuery] = React.useState('');

  const assignmentMap = React.useMemo(() => {
    const map = new Map<string, string>();

    assignments.forEach((assignment) => {
      map.set(assignment.studentId, assignment.classroomId);
    });

    return map;
  }, [assignments]);

  const matches = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return students.filter((student) => {
      const registerNumber = student.registerNumber.toLowerCase();
      const name = student.name.toLowerCase();
      return registerNumber.includes(normalized) || name.includes(normalized);
    }).slice(0, 8);
  }, [query, students]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          aria-label="Search students"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by register number or student name"
          className="pl-9"
        />
      </div>

      {matches.length > 0 && (
        <div className="rounded border border-slate-200 bg-white p-2 shadow-sm">
          <ul className="space-y-1">
            {matches.map((student) => {
              const classroomId = assignmentMap.get(student.id) ?? classrooms[0]?.id;
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStudent(student, classroomId ?? '')}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <span>
                      <span className="font-medium text-slate-900">{student.name}</span>
                      <span className="ml-2 text-slate-500">{student.registerNumber}</span>
                    </span>
                    <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {student.branch}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
