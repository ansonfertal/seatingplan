import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { InfeasibilityReport } from '../../algorithms/infeasibilityAnalyzer';
import { AlertTriangle, Lightbulb, Users, ArrowRight } from 'lucide-react';

interface InfeasibilityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: InfeasibilityReport;
  onProceedToReview: () => void;
  onAdjustRooms: () => void;
}

export const InfeasibilityReportModal: React.FC<InfeasibilityReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onProceedToReview,
  onAdjustRooms,
}) => {
  if (!report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seating Allocation Diagnosis & Infeasibility Report"
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onAdjustRooms}>
            ← Adjust Rooms / Benches
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Dismiss
            </Button>
            <Button onClick={onProceedToReview} className="flex items-center gap-1.5">
              <span>Inspect Review Map</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        {/* Diagnosis Header Card */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3.5">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">{report.title}</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">{report.explanation}</p>
          </div>
        </div>

        {/* Actionable Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Lightbulb className="w-4 h-4 text-indigo-600" />
              <span>Recommended Resolution Actions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <h5 className="text-xs font-bold text-slate-800">{rec.title}</h5>
                  <p className="text-[11px] text-slate-600 leading-normal">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unassigned Candidates List */}
        {report.unassignedCandidates.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Unassigned Candidates ({report.unassignedCandidates.length})</span>
              </span>
              <span className="text-slate-500">PRD Constraint C4 Tracking</span>
            </div>

            <div className="max-h-56 overflow-y-auto bg-white">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 sticky top-0 font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Reg No</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Branch / Sem</th>
                    <th className="px-4 py-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.unassignedCandidates.map((u) => (
                    <tr key={u.candidateId} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono font-semibold text-slate-800">{u.registerNumber}</td>
                      <td className="px-4 py-2 text-slate-700">{u.name}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {u.branch} {u.semester}
                      </td>
                      <td className="px-4 py-2 text-amber-700 font-medium">{u.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
