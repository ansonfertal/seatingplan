import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, MapPin, AlertCircle } from 'lucide-react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';

export type CandidateSearchSelection = {
  candidateId: string;
  roomId?: string;
  row?: number;
  column?: number;
  seatIndex?: number;
};

export type CandidateSearchBarProps = {
  candidates: ExamCandidate[];
  rooms: Room[];
  assignments: AssignedSeat[];
  onSelectCandidate: (selection: CandidateSearchSelection) => void;
};

export const CandidateSearchBar: React.FC<CandidateSearchBarProps> = ({
  candidates,
  rooms,
  assignments,
  onSelectCandidate,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Map studentId -> AssignedSeat
  const assignmentMap = useMemo(() => {
    const map = new Map<string, AssignedSeat>();
    assignments.forEach((a) => {
      const id = a.studentId || a.candidateId;
      if (id) map.set(id, a);
    });
    return map;
  }, [assignments]);

  // Filter candidates matching query
  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    return candidates
      .filter(
        (c) =>
          c.registerNumber.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.branch.toLowerCase().includes(q) ||
          (c.subjectCode || '').toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [candidates, query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (candidate: ExamCandidate) => {
    const assignment = assignmentMap.get(candidate.id);
    if (assignment) {
      const roomId = assignment.roomId || assignment.classroomId;
      const seatIndex = assignment.position ?? assignment.seatIndex;
      onSelectCandidate({
        candidateId: candidate.id,
        roomId,
        row: assignment.row,
        column: assignment.column,
        seatIndex,
      });
    } else {
      onSelectCandidate({
        candidateId: candidate.id,
      });
    }
    setIsOpen(false);
    setQuery(`${candidate.registerNumber} - ${candidate.name}`);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Find candidate by Roll No, Name, or Subject..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filteredCandidates.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No matching candidates found for "{query}".
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 py-1">
              {filteredCandidates.map((candidate) => {
                const assignment = assignmentMap.get(candidate.id);
                const room = assignment ? roomMap.get(assignment.roomId || assignment.classroomId) : undefined;
                const pos = assignment ? (assignment.position ?? assignment.seatIndex) + 1 : undefined;

                return (
                  <li
                    key={candidate.id}
                    onClick={() => handleSelect(candidate)}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-indigo-50/60 cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {candidate.registerNumber}
                        </span>
                        <span className="text-xs font-medium text-slate-700">
                          {candidate.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{candidate.branch} ({candidate.semester})</span>
                        <span>•</span>
                        <span className="font-mono font-semibold text-indigo-600">{candidate.subjectCode}</span>
                      </div>
                    </div>

                    <div className="text-right pl-3 shrink-0">
                      {assignment && room ? (
                        <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {room.name} (R{assignment.row + 1}, C{assignment.column + 1}, Pos {pos})
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Unassigned
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
