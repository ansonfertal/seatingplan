import React, { useState } from 'react';
import type { TimetableClashReport } from '../../algorithms/timetableClashDetector';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export type TimetableClashBannerProps = {
  report: TimetableClashReport;
};

export const TimetableClashBanner: React.FC<TimetableClashBannerProps> = ({ report }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!report.hasClashes && report.validMultiSittings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {report.hasClashes ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                {report.hasClashes
                  ? `Timetable Clash Warning: ${report.totalClashesCount} candidate(s) scheduled for overlapping session papers!`
                  : `Multi-Sitting Rostering Verified: ${report.validMultiSittings.length} candidate(s) writing morning & afternoon papers`}
              </h4>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  report.hasClashes
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {report.hasClashes ? 'Action Required' : 'Verified'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {report.hasClashes
                ? 'Candidates are scheduled for multiple different subject papers in the exact same sitting session. Resolve clashes prior to seating plan generation.'
                : 'All multi-sitting candidates are scheduled across distinct non-overlapping sessions (FN vs AN).'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-amber-100/60 transition-colors"
        >
          <span>{isExpanded ? 'Hide Details' : 'View Clash List'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-amber-200 space-y-3 animate-in fade-in duration-150">
          {report.criticalClashes.map((clash, idx) => (
            <div
              key={`clash-${idx}`}
              className="rounded-xl border border-red-200 bg-white p-3 text-xs space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-red-700">{clash.registerNumber}</span>
                  <span className="font-semibold text-slate-800">{clash.studentName}</span>
                </div>
                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-mono font-semibold text-[10px]">
                  {clash.date} — Session {clash.session}
                </span>
              </div>
              <div className="text-slate-600">
                <p className="font-medium text-[11px] text-slate-700">Conflicting Papers:</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {clash.papers.map((p, pIdx) => (
                    <span
                      key={`p-${pIdx}`}
                      className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono text-[10px] text-slate-700"
                    >
                      {p.subjectCode} ({p.branch})
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                💡 {clash.resolutionRecommendation}
              </p>
            </div>
          ))}

          {report.validMultiSittings.map((sitting, idx) => (
            <div
              key={`sitting-${idx}`}
              className="rounded-xl border border-emerald-200 bg-white p-3 text-xs space-y-1.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono font-bold text-slate-900">{sitting.registerNumber}</span>
                  <span className="text-slate-700">{sitting.studentName}</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                  {sitting.date} ({sitting.session})
                </span>
              </div>
              <div className="flex gap-2">
                {sitting.papers.map((p, pIdx) => (
                  <span
                    key={`p-${pIdx}`}
                    className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-mono text-[10px]"
                  >
                    {p.subjectCode}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
