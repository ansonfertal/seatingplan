import React from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';

const statusStyles = {
  Valid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'Review Recommended': 'border-amber-200 bg-amber-50 text-amber-800',
  Invalid: 'border-red-200 bg-red-50 text-red-800',
} as const;

export const ReviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { arrangement, validation } = useAppStore();

  if (!arrangement || !validation) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>No arrangement generated yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Generate a seating plan from the readiness screen before reviewing the result.
            </p>
            <Button onClick={() => navigate('/generate')} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Go to generation screen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = validation.summary;
  const statusTone = statusStyles[validation.status] ?? statusStyles.Invalid;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 6</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Review Seating Arrangement</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/generate')}>Regenerate</Button>
          <Button onClick={() => navigate('/preview')}>Proceed to Preview</Button>
        </div>
      </div>

      <div className={`mb-6 rounded-xl border p-4 ${statusTone}`}>
        <div className="flex items-center gap-3">
          {validation.status === 'Valid' && <CheckCircle2 className="h-5 w-5" />}
          {validation.status === 'Review Recommended' && <AlertTriangle className="h-5 w-5" />}
          {validation.status === 'Invalid' && <CircleSlash className="h-5 w-5" />}
          <div>
            <p className="font-semibold">{validation.status}</p>
            <p className="text-sm opacity-80">
              {validation.status === 'Valid'
                ? 'Arrangement valid with no same-branch conflicts.'
                : validation.status === 'Review Recommended'
                  ? 'Conflicts remain and should be reviewed before final publishing.'
                  : 'The arrangement is invalid due to unassigned students or a failed validation.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quality Score</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{summary.qualityScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Conflicts</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{summary.totalConflicts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{summary.assignedStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Unused Seats</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{summary.unusedSeats}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-slate-700" />
              <CardTitle>Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex justify-between gap-4 border-b pb-2">
                <span>Total students</span>
                <strong>{summary.totalStudents}</strong>
              </div>
              <div className="flex justify-between gap-4 border-b pb-2">
                <span>Unassigned students</span>
                <strong>{summary.unassignedStudents}</strong>
              </div>
              <div className="flex justify-between gap-4 border-b pb-2">
                <span>Available seats</span>
                <strong>{summary.totalAvailableSeats}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Generated</span>
                <strong>{new Date(arrangement.generatedAt).toLocaleString()}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conflict list</CardTitle>
          </CardHeader>
          <CardContent>
            {validation.conflicts.length === 0 ? (
              <p className="text-sm text-slate-600">No same-branch adjacency conflicts were detected in this arrangement.</p>
            ) : (
              <ul className="space-y-3 text-sm text-slate-700">
                {validation.conflicts.slice(0, 10).map((conflict, index) => (
                  <li key={`${conflict.classroomId}-${index}`} className="rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="font-medium text-slate-900">{conflict.branch} branch conflict</p>
                    <p>Room: {conflict.classroomId}</p>
                    <p>Seats: {conflict.seatA.row + 1},{conflict.seatA.column + 1} and {conflict.seatB.row + 1},{conflict.seatB.column + 1}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
