import React, { useState, useEffect, useRef } from 'react';
import type { AssignedSeat } from '../../models/arrangement';
import type { ExamCandidate } from '../../models/student';
import type { Room } from '../../models/classroom';
import { Button } from '../ui/Button';
import { QrCode, Scan, CheckCircle, XCircle, Search, Clock, X, User } from 'lucide-react';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export type CandidateAttendanceRecord = {
  candidateId: string;
  registerNumber: string;
  name: string;
  branch: string;
  roomName: string;
  benchCoordinate: string;
  seatPosition: number;
  status: AttendanceStatus;
  markedAt: string;
};

export type BarcodeScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  rooms: Room[];
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  assignments,
  students,
  rooms,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [records, setRecords] = useState<Map<string, CandidateAttendanceRecord>>(new Map());
  const [activeCandidate, setActiveCandidate] = useState<CandidateAttendanceRecord | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const studentMap = useRef(new Map(students.map((s) => [s.registerNumber.toUpperCase(), s])));
  const roomMap = useRef(new Map(rooms.map((r) => [r.id, r])));

  useEffect(() => {
    studentMap.current = new Map(students.map((s) => [s.registerNumber.toUpperCase(), s]));
    roomMap.current = new Map(rooms.map((r) => [r.id, r]));
  }, [students, rooms]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = (rawQuery: string) => {
    const query = rawQuery.trim().toUpperCase().replace(/[*]/g, '');
    if (!query) return;

    // Check if query is JSON QR payload
    let regNo = query;
    try {
      if (query.startsWith('{') && query.endsWith('}')) {
        const parsed = JSON.parse(query);
        if (parsed.regNo) regNo = parsed.regNo.toUpperCase();
      }
    } catch {
      // Use raw query
    }

    const candidate = studentMap.current.get(regNo);

    if (!candidate) {
      setFeedback({ message: `Candidate with Register No. "${regNo}" not found in roster.`, type: 'error' });
      setActiveCandidate(null);
      return;
    }

    // Find assignment
    const assignment = assignments.find(
      (a) => (a.studentId || a.candidateId) === candidate.id
    );

    const room = assignment ? roomMap.current.get(assignment.roomId || assignment.classroomId) : undefined;
    const benchCoord = assignment ? `R${assignment.row + 1}-C${assignment.column + 1}` : 'Unassigned';
    const seatPos = assignment ? (assignment.position ?? assignment.seatIndex) + 1 : 0;

    const existing = records.get(candidate.id);
    const candidateRecord: CandidateAttendanceRecord = existing || {
      candidateId: candidate.id,
      registerNumber: candidate.registerNumber,
      name: candidate.name,
      branch: candidate.branch,
      roomName: room?.name || 'General Hall',
      benchCoordinate: benchCoord,
      seatPosition: seatPos,
      status: 'PRESENT',
      markedAt: new Date().toLocaleTimeString(),
    };

    setActiveCandidate(candidateRecord);
    setFeedback({
      message: `Verified: ${candidate.name} (${candidate.registerNumber}) located at ${room?.name || 'Hall'}, Bench ${benchCoord}, Seat #${seatPos}`,
      type: 'success',
    });
    setInputVal('');
  };

  const handleMarkStatus = (status: AttendanceStatus) => {
    if (!activeCandidate) return;

    const updated: CandidateAttendanceRecord = {
      ...activeCandidate,
      status,
      markedAt: new Date().toLocaleTimeString(),
    };

    const next = new Map(records);
    next.set(activeCandidate.candidateId, updated);
    setRecords(next);
    setActiveCandidate(updated);
    setFeedback({
      message: `Status marked as ${status} for ${activeCandidate.registerNumber} at ${updated.markedAt}`,
      type: 'info',
    });
    inputRef.current?.focus();
  };

  const presentCount = Array.from(records.values()).filter((r) => r.status === 'PRESENT').length;
  const absentCount = Array.from(records.values()).filter((r) => r.status === 'ABSENT').length;
  const lateCount = Array.from(records.values()).filter((r) => r.status === 'LATE').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Barcode & QR Attendance Scanner / Hall Verifier
              </h3>
              <p className="text-xs text-slate-500">
                Supports USB handheld laser scanners, barcode readers, and manual register numbers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Bar & Tally */}
        <div className="p-6 space-y-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLookup(inputVal);
                  }
                }}
                placeholder="Scan student barcode or enter register number (e.g. 2024CS001)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button size="sm" onClick={() => handleLookup(inputVal)} className="flex items-center gap-1.5">
              <Scan className="w-4 h-4" /> Verify
            </Button>
          </div>

          {/* Quick Attendance Tally */}
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Verified</span>
              <p className="text-lg font-bold text-slate-900">{records.size}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold">Present</span>
              <p className="text-lg font-bold text-emerald-700">{presentCount}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-2.5">
              <span className="text-[10px] text-red-700 uppercase font-semibold">Absent</span>
              <p className="text-lg font-bold text-red-700">{absentCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
              <span className="text-[10px] text-amber-700 uppercase font-semibold">Late</span>
              <p className="text-lg font-bold text-amber-700">{lateCount}</p>
            </div>
          </div>
        </div>

        {/* Candidate Detail Card & Action Buttons */}
        <div className="overflow-y-auto p-6 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : feedback.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {activeCandidate && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{activeCandidate.name}</h4>
                    <p className="font-mono text-xs font-bold text-indigo-700">
                      {activeCandidate.registerNumber} • {activeCandidate.branch}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    activeCandidate.status === 'PRESENT'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : activeCandidate.status === 'ABSENT'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {activeCandidate.status}
                </span>
              </div>

              {/* Spatial Seat Locator */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl bg-white border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Room / Hall</span>
                  <p className="font-bold text-slate-900">{activeCandidate.roomName}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Bench Coordinate</span>
                  <p className="font-bold font-mono text-indigo-600">{activeCandidate.benchCoordinate}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Seat Slot</span>
                  <p className="font-bold font-mono text-purple-600">Position #{activeCandidate.seatPosition}</p>
                </div>
              </div>

              {/* Action Buttons for Invigilator */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleMarkStatus('PRESENT')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkStatus('LATE')}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50 flex items-center gap-1.5 text-xs"
                >
                  <Clock className="w-4 h-4" /> Late Entry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkStatus('ABSENT')}
                  className="text-red-700 border-red-300 hover:bg-red-50 flex items-center gap-1.5 text-xs"
                >
                  <XCircle className="w-4 h-4" /> Mark Absent
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Ready for handheld USB scanner inputs</span>
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close Verifier
          </Button>
        </div>
      </div>
    </div>
  );
};
