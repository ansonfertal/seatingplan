import React, { useMemo, useState } from 'react';
import { ArrowLeft, Redo2, Search, Undo2 } from 'lucide-react';
import { ClassroomGrid } from '../components/preview/ClassroomGrid';
import { ClassroomTabs } from '../components/preview/ClassroomTabs';
import { StudentDetailPanel } from '../components/preview/StudentDetailPanel';
import { StudentSearch } from '../components/preview/StudentSearch';
import { SwapModal } from '../components/preview/SwapModal';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAppStore } from '../store/appStore';
import type { SeatSelection } from '../store/historyManager';
import { useNavigate } from 'react-router-dom';

const isSameSeat = (left: SeatSelection, right: SeatSelection) => (
  left.classroomId === right.classroomId &&
  left.row === right.row &&
  left.column === right.column &&
  left.seatIndex === right.seatIndex
);

export const PreviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { arrangement, classrooms, students, history, future, undo, redo, applySeatSwap } = useAppStore();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | undefined>(classrooms[0]?.id);
  const [selectedSeat, setSelectedSeat] = useState<SeatSelection | undefined>();
  const [sourceSeat, setSourceSeat] = useState<SeatSelection | undefined>();
  const [targetSeat, setTargetSeat] = useState<SeatSelection | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();

  const selectedClassroom = useMemo(
    () => classrooms.find((classroom) => classroom.id === (selectedClassroomId ?? classrooms[0]?.id)),
    [classrooms, selectedClassroomId]
  );

  React.useEffect(() => {
    if (!selectedClassroomId && classrooms[0]) {
      setSelectedClassroomId(classrooms[0].id);
    }
  }, [classrooms, selectedClassroomId]);

  if (!arrangement) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>No arrangement available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">Generate a seating arrangement before trying to preview it.</p>
            <Button onClick={() => navigate('/generate')} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to generate
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const focusedSeatAssignment = arrangement.assignments.find(
    (assignment) =>
      assignment.classroomId === selectedSeat?.classroomId &&
      assignment.row === selectedSeat.row &&
      assignment.column === selectedSeat.column &&
      assignment.seatIndex === selectedSeat.seatIndex
  );

  const detailStudent = selectedStudent ?? (focusedSeatAssignment ? students.find((student) => student.id === focusedSeatAssignment.studentId) : undefined);
  const detailSeat = selectedSeat ??
    (focusedSeatAssignment
      ? {
          classroomId: focusedSeatAssignment.classroomId,
          row: focusedSeatAssignment.row,
          column: focusedSeatAssignment.column,
          seatIndex: focusedSeatAssignment.seatIndex,
        }
      : undefined);

  const classroomDetail = detailSeat
    ? classrooms.find((classroom) => classroom.id === detailSeat.classroomId)
    : undefined;

  const handleStudentSelection = (student: (typeof students)[number], classroomId: string) => {
    setSelectedClassroomId(classroomId);
    setSelectedStudentId(student.id);
    setSourceSeat(undefined);
    setTargetSeat(undefined);

    const assignment = arrangement.assignments.find(
      (item) => item.classroomId === classroomId && item.studentId === student.id
    );

    if (assignment) {
      setSelectedSeat({
        classroomId: assignment.classroomId,
        row: assignment.row,
        column: assignment.column,
        seatIndex: assignment.seatIndex,
      });
    }
  };

  const handleSeatSelection = (seat: SeatSelection) => {
    const currentSourceSeat = sourceSeat;

    if (currentSourceSeat && !isSameSeat(currentSourceSeat, seat)) {
      setTargetSeat(seat);
      setSelectedSeat(seat);
      return;
    }

    setSourceSeat(seat);
    setTargetSeat(undefined);
    setSelectedSeat(seat);
  };

  const handleSwapConfirm = () => {
    if (!sourceSeat || !targetSeat) {
      return;
    }

    applySeatSwap(sourceSeat, targetSeat);
    setSourceSeat(undefined);
    setTargetSeat(undefined);
    setSelectedSeat(undefined);
  };

  const sourceStudent = sourceSeat
    ? students.find(
        (student) =>
          arrangement.assignments.some(
            (assignment) =>
              assignment.classroomId === sourceSeat.classroomId &&
              assignment.row === sourceSeat.row &&
              assignment.column === sourceSeat.column &&
              assignment.seatIndex === sourceSeat.seatIndex &&
              assignment.studentId === student.id
          )
      )
    : undefined;

  const targetStudent = targetSeat
    ? students.find(
        (student) =>
          arrangement.assignments.some(
            (assignment) =>
              assignment.classroomId === targetSeat.classroomId &&
              assignment.row === targetSeat.row &&
              assignment.column === targetSeat.column &&
              assignment.seatIndex === targetSeat.seatIndex &&
              assignment.studentId === student.id
          )
      )
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 7</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Seating Preview</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={undo} disabled={history.length === 0} className="flex items-center gap-2">
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
          <Button variant="outline" onClick={redo} disabled={future.length === 0} className="flex items-center gap-2">
            <Redo2 className="h-4 w-4" /> Redo
          </Button>
          <Button variant="outline" onClick={() => navigate('/review')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Review
          </Button>
          <Button onClick={() => navigate('/export')} className="flex items-center gap-2">
            Proceed to Export
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Classrooms</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassroomTabs
              classrooms={classrooms}
              selectedClassroomId={selectedClassroomId}
              onSelectClassroom={setSelectedClassroomId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-600" />
              <CardTitle>Student lookup</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <StudentSearch
              students={students}
              classrooms={classrooms}
              assignments={arrangement.assignments}
              onSelectStudent={handleStudentSelection}
            />
          </CardContent>
        </Card>
      </div>

      {selectedClassroom && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <CardHeader>
              <CardTitle>{selectedClassroom.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <ClassroomGrid
                classroom={selectedClassroom}
                assignments={arrangement.assignments}
                students={students}
                selectedStudentId={selectedStudentId}
                selectedSeat={sourceSeat ?? selectedSeat}
                onSelectSeat={handleSeatSelection}
              />
            </CardContent>
          </Card>

          <StudentDetailPanel
            student={detailStudent}
            seat={
              detailSeat && classroomDetail
                ? {
                    classroomName: classroomDetail.name,
                    row: detailSeat.row,
                    column: detailSeat.column,
                    seatIndex: detailSeat.seatIndex,
                  }
                : undefined
            }
          />
        </div>
      )}

      <SwapModal
        isOpen={Boolean(sourceSeat && targetSeat)}
        sourceSeat={sourceSeat}
        targetSeat={targetSeat}
        sourceStudent={sourceStudent}
        targetStudent={targetStudent}
        onClose={() => {
          setSourceSeat(undefined);
          setTargetSeat(undefined);
        }}
        onConfirm={handleSwapConfirm}
      />
    </div>
  );
};
