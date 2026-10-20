import React from 'react';
import type { InvigilatorRosterResult } from '../../algorithms/invigilatorRostering';
import { Shield, UserCheck, AlertCircle, Printer } from 'lucide-react';
import { Button } from '../ui/Button';

export type InvigilatorDutyChartProps = {
  roster: InvigilatorRosterResult;
};

export const InvigilatorDutyChart: React.FC<InvigilatorDutyChartProps> = ({ roster }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
      {/* Header and Print action */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Institutional Examination Cell
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Automated Roster
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Invigilator Duty Chart</h2>
          <p className="text-xs text-slate-500">
            {roster.examName} — {roster.date} (Session: {roster.session})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs no-print"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Duty Chart</span>
          </Button>
        </div>
      </div>

      {/* Chief Superintendent Callout */}
      {roster.chiefSuperintendent && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600 p-2 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Chief Superintendent / Squad In-Charge
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {roster.chiefSuperintendent.name}
              </p>
              <p className="text-xs text-slate-600">
                {roster.chiefSuperintendent.designation} — Department of {roster.chiefSuperintendent.department}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-slate-500">Duty Balance:</span>
            <p className="font-bold text-slate-800">
              {roster.chiefSuperintendent.assignedDutiesCount} / {roster.chiefSuperintendent.maxDuties}
            </p>
          </div>
        </div>
      )}

      {/* Warnings if any */}
      {roster.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
          {roster.warnings.map((w, idx) => (
            <div key={`warn-${idx}`} className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Room Duty Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Room / Hall</th>
              <th className="py-3 px-3">Candidates</th>
              <th className="py-3 px-3">Required</th>
              <th className="py-3 px-3">Assigned Faculty Invigilator(s)</th>
              <th className="py-3 px-3">Department</th>
              <th className="py-3 px-3 text-center">Invigilator Signature</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {roster.roomAssignments.map((assignment) => (
              <tr key={assignment.roomId} className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-slate-900">
                  {assignment.roomName}
                </td>
                <td className="py-3 px-3 font-semibold text-slate-700">
                  {assignment.assignedStudentCount}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {assignment.requiredInvigilatorsCount}
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1">
                    {assignment.assignedInvigilators.map((invig) => (
                      <div key={invig.id} className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{invig.name}</span>
                        <span className="text-[10px] text-slate-500">({invig.designation})</span>
                      </div>
                    ))}
                    {assignment.departmentClashes.length > 0 && (
                      <div className="text-[10px] text-amber-700 mt-1">
                        ⚠️ {assignment.departmentClashes.join(' ')}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {assignment.assignedInvigilators.map((i) => i.department).join(', ')}
                </td>
                <td className="py-3 px-3 border border-dashed border-slate-300 w-36 text-center text-slate-300 italic">
                  (Signature on duty entry)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
