import React from 'react';
import { Search } from 'lucide-react';
import type { Classroom } from '../../models/classroom';
import { Input } from '../ui/Input';

export type ClassroomTabsProps = {
  classrooms: Classroom[];
  selectedClassroomId?: string;
  onSelectClassroom: (classroomId: string) => void;
};

export const ClassroomTabs: React.FC<ClassroomTabsProps> = ({
  classrooms,
  selectedClassroomId,
  onSelectClassroom,
}) => {
  const [query, setQuery] = React.useState('');

  const filteredRooms = classrooms.filter((classroom) =>
    classroom.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          aria-label="Search classrooms"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Quick jump to a room"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filteredRooms.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
            No matching room found.
          </div>
        ) : (
          filteredRooms.map((classroom) => {
            const isActive = classroom.id === selectedClassroomId;

            return (
              <button
                key={classroom.id}
                type="button"
                onClick={() => onSelectClassroom(classroom.id)}
                className={[
                  'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700',
                ].join(' ')}
              >
                {classroom.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
