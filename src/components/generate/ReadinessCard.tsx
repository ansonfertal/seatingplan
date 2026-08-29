import React from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import type { CapacityValidationResult } from '../../algorithms/capacityValidator';

interface ReadinessCardProps {
  ready: boolean;
  capacity: CapacityValidationResult;
  warnings: string[];
}

export const ReadinessCard: React.FC<ReadinessCardProps> = ({ ready, capacity, warnings }) => {
  const occupancyRatio = capacity.totalAvailableSeats === 0
    ? 0
    : Math.round((capacity.totalValidStudents / capacity.totalAvailableSeats) * 100);

  return (
    <div className={`rounded-xl border p-5 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Readiness</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            {ready ? 'All prerequisites passed' : 'Needs attention before generation'}
          </h3>
        </div>
        {ready ? (
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        ) : (
          <CircleAlert className="h-7 w-7 text-amber-600" />
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Students" value={capacity.totalValidStudents} />
        <Stat label="Available Seats" value={capacity.totalAvailableSeats} />
        <Stat label="Capacity Gap" value={capacity.capacityDifference} />
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
        <AlertTriangle className="h-4 w-4 text-slate-500" />
        <span>
          Active usage: <strong>{occupancyRatio}%</strong> of the configured room capacity.
        </span>
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-sm text-amber-800"
            >
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
