import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Printer,
  ShieldCheck,
  ShieldAlert,
  ArrowLeftRight,
  History,
  FileCheck,
  Layers,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAppStore } from '../store/appStore';
import { RoomVisualReview } from '../components/review/RoomVisualReview';
import { CandidateSearchBar, type CandidateSearchSelection } from '../components/review/CandidateSearchBar';
import { ManualSwapModal } from '../components/review/ManualSwapModal';
import type { SeatPositionRef } from '../algorithms/swapValidator';
import { getLatestFinalizedVersion } from '../store/versionManager';

export const ReviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    arrangement,
    validation,
    allocationVersions,
    activeVersionId,
    classrooms,
    students,
    rules,
    exam,
    finalizeActiveVersion,
    setActiveVersionId,
    applyValidatedSwap,
  } = useAppStore();

  const [activeRoomId, setActiveRoomId] = useState<string | undefined>(classrooms[0]?.id);
  const [highlightedSeat, setHighlightedSeat] = useState<
    { roomId: string; row: number; column: number; seatIndex: number } | undefined
  >();
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapFromSeat, setSwapFromSeat] = useState<SeatPositionRef | undefined>();
  const [swapToSeat, setSwapToSeat] = useState<SeatPositionRef | undefined>();
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Active version record
  const activeVersion = useMemo(
    () => allocationVersions.find((v) => v.id === activeVersionId) || allocationVersions[allocationVersions.length - 1],
    [allocationVersions, activeVersionId]
  );

  const isFinalized = activeVersion?.status === 'finalized';
  const isSuperseded = activeVersion?.status === 'superseded';

  const latestFinalizedVersion = useMemo(
    () => getLatestFinalizedVersion(allocationVersions, exam?.id),
    [allocationVersions, exam?.id]
  );

  const highestVersionNumber = useMemo(
    () => allocationVersions.reduce((max, v) => Math.max(max, v.versionNumber), 0),
    [allocationVersions]
  );

  // Fallback if no arrangement exists
  if (!arrangement || !validation) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Layers className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">No arrangement generated yet</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Please run the deterministic allocation engine before reviewing the room seating plan.
            </p>
            <Button onClick={() => navigate('/generate')} className="mx-auto flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Go to Generation Engine
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = validation.summary;
  const currentAssignments = arrangement.assignments;

  // Handle candidate search selection
  const handleSelectCandidate = (selection: CandidateSearchSelection) => {
    if (selection.roomId) {
      setActiveRoomId(selection.roomId);
      if (selection.row != null && selection.column != null && selection.seatIndex != null) {
        setHighlightedSeat({
          roomId: selection.roomId,
          row: selection.row,
          column: selection.column,
          seatIndex: selection.seatIndex,
        });
      }
    }
  };

  // Handle click-to-swap from RoomVisualReview
  const handleInitiateSwapWithSeats = (fromSeat: SeatPositionRef, toSeat: SeatPositionRef) => {
    setSwapFromSeat(fromSeat);
    setSwapToSeat(toSeat);
    setIsSwapModalOpen(true);
  };

  // Confirming a validated swap
  const handleConfirmSwap = (result: {
    simulatedAssignments: typeof currentAssignments;
    validationReport: typeof validation;
  }) => {
    applyValidatedSwap(result.simulatedAssignments, result.validationReport);
    setHighlightedSeat(undefined);
  };

  // Finalize version handler
  const handleFinalize = () => {
    finalizeActiveVersion();
    setShowFinalizeConfirm(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Step Header & Version Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <span>Step 6 of 7</span>
            <span>•</span>
            <span>Review, Swaps & Finalization</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Room Seating Plan & Allocation Review
          </h1>
          <p className="text-sm text-slate-500">
            Inspect room bench layout, find candidates, perform validator-guarded moves, and lock the final snapshot.
          </p>
        </div>

        {/* Action Controls & Version Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Version Dropdown Selector */}
          {allocationVersions.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <History className="h-4 w-4 text-slate-400" />
              <select
                value={activeVersion?.id || activeVersionId}
                onChange={(e) => setActiveVersionId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {allocationVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    Version v{v.versionNumber} ({v.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Version Status Badge */}
          {isFinalized && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200">
              <Lock className="w-3.5 h-3.5" /> Finalized & Locked
            </span>
          )}
          {isSuperseded && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" /> Superseded
            </span>
          )}
          {!isFinalized && !isSuperseded && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              <FileCheck className="w-3.5 h-3.5" /> Working Draft
            </span>
          )}

          {/* Regenerate Button */}
          <Button variant="outline" size="sm" onClick={() => navigate('/generate')} className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </Button>

          {/* Finalize Button */}
          {!isFinalized && (
            <Button
              size="sm"
              disabled={validation.status === 'Invalid'}
              onClick={() => setShowFinalizeConfirm(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Lock className="h-3.5 w-3.5" /> Finalize Snapshot
            </Button>
          )}

          {/* Proceed to Print Pack */}
          <Button
            size="sm"
            onClick={() => navigate('/export')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" /> Proceed to Print Pack
          </Button>
        </div>
      </div>

      {/* Superseded Warning Banner (TASK-4.4) */}
      {isSuperseded && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-amber-900">
                Stale Allocation Warning: Version v{activeVersion?.versionNumber} has been superseded!
              </p>
              <p className="text-xs text-amber-800">
                A newer finalized allocation snapshot exists (Version v{latestFinalizedVersion?.versionNumber || highestVersionNumber}).
                Generating print documents from this version will result in stale, non-authoritative notices and attendance sheets.
              </p>
              {latestFinalizedVersion && (
                <button
                  onClick={() => setActiveVersionId(latestFinalizedVersion.id)}
                  className="mt-1 text-xs font-bold text-indigo-700 underline hover:text-indigo-900"
                >
                  Switch to Latest Finalized Version (v{latestFinalizedVersion.versionNumber}) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finalized Snapshot Locked Banner (TASK-4.4) */}
      {isFinalized && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-emerald-900">
                  Version v{activeVersion?.versionNumber} is Finalized & Locked (PRD Section 4.6)
                </p>
                <p className="text-xs text-emerald-700">
                  Immutable record finalized on {new Date(activeVersion.finalizedAt || activeVersion.generatedAt).toLocaleString()}.
                  All 5 institutional print templates in Step 7 will strictly derive from this snapshot.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
              Seed: {activeVersion.seed}
            </span>
          </div>
        </div>
      )}

      {/* Summary KPI & Quality Banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Validator Status</p>
            <div className="mt-1.5 flex items-center gap-2">
              {validation.status === 'Valid' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-lg">100% Compliant</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <span className="font-bold text-red-700 text-lg">{validation.status}</span>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Hard constraints C1–C5 verified</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Quality Score</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{summary.qualityScore}%</p>
            <p className="mt-1 text-[11px] text-slate-500">Separation & cohort balance</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Assigned Candidates</p>
            <p className="mt-1.5 text-2xl font-bold text-emerald-700">
              {summary.assignedStudents} <span className="text-xs font-normal text-slate-500">/ {summary.totalStudents}</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {summary.unassignedStudents === 0 ? '0 unassigned' : `${summary.unassignedStudents} unassigned!`}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Physical Capacity</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">
              {summary.totalAvailableSeats} <span className="text-xs font-normal text-slate-500">seats</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{summary.unusedSeats} empty seats available</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Exam Session</p>
            <p className="mt-1.5 text-sm font-bold text-slate-900 truncate">{exam?.examName || 'Exam'}</p>
            <p className="mt-1 text-[11px] text-slate-500">{exam?.examDate} ({exam?.session || 'FN'})</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Candidate Search & Quick Swap Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[280px]">
          <CandidateSearchBar
            candidates={students}
            rooms={classrooms}
            assignments={currentAssignments}
            onSelectCandidate={handleSelectCandidate}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSwapFromSeat(undefined);
              setSwapToSeat(undefined);
              setIsSwapModalOpen(true);
            }}
            className="flex items-center gap-2 text-xs"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
            <span>Open Move / Swap Modal</span>
          </Button>
        </div>
      </div>

      {/* Interactive Room Visual Seating Grid (TASK-4.1) */}
      <RoomVisualReview
        rooms={classrooms}
        assignments={currentAssignments}
        students={students}
        activeRoomId={activeRoomId}
        onActiveRoomChange={(id) => setActiveRoomId(id)}
        highlightedSeat={highlightedSeat}
        onInitiateSwapWithSeats={handleInitiateSwapWithSeats}
        isLocked={false}
      />

      {/* Manual Swap & Move Modal (TASK-4.3) */}
      <ManualSwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        assignments={currentAssignments}
        students={students}
        classrooms={classrooms}
        rules={rules}
        initialSourceSeat={swapFromSeat}
        initialTargetSeat={swapToSeat}
        isVersionFinalized={isFinalized}
        nextVersionNumber={highestVersionNumber + 1}
        onConfirmSwap={handleConfirmSwap}
      />

      {/* Finalize Confirmation Dialog */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-700">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Finalize Seating Allocation?</h3>
                <p className="text-xs text-slate-500">Lock Version v{activeVersion?.versionNumber}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Finalizing locks this seating arrangement as the authoritative institutional snapshot. All five print documents (Attendance Sheets, Notice Board, and Seating Plan) will strictly derive from this version.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Candidates:</span>
                <strong className="text-slate-900">{summary.assignedStudents}</strong>
              </div>
              <div className="flex justify-between">
                <span>Active Rooms:</span>
                <strong className="text-slate-900">{classrooms.length} halls</strong>
              </div>
              <div className="flex justify-between">
                <span>Hard Constraints:</span>
                <strong className="text-emerald-700">100% Passed (C1–C5)</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowFinalizeConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFinalize}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" /> Confirm & Lock Version
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
