import React, { useState } from 'react';
import type { ValidationReport, DuplicatePolicy } from '../../import/studentValidator';
import { downloadErrorReportCSV } from '../../import/studentValidator';
import { Button } from '../ui/Button';
import { AlertCircle, CheckCircle2, Download, Trash2, UserCheck, ShieldAlert } from 'lucide-react';

interface StudentValidationSummaryProps {
  report: ValidationReport | null;
  onDiscardInvalid: () => void;
  onCommit: (importMode: 'append' | 'replace') => void;
  onCancel: () => void;
  onPolicyChange?: (policy: DuplicatePolicy) => void;
}

export const StudentValidationSummary: React.FC<StudentValidationSummaryProps> = ({
  report,
  onDiscardInvalid,
  onCommit,
  onCancel,
  onPolicyChange,
}) => {
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  if (!report) return null;

  const hasErrors = report.invalidRows.length > 0;
  const isCommitable = report.validStudents.length > 0 && !hasErrors;

  const handleDownloadErrors = () => {
    downloadErrorReportCSV(report.invalidRows);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Import Validation & Normalization Report</h3>
          <p className="text-xs text-slate-500">
            PRD Section 4.2: Missing values, duplicate register numbers, and data normalization review
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasErrors ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600" /> {report.invalidRows.length} Issues Detected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All Records Valid
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Total Processed" value={report.validStudents.length + report.invalidRows.length} />
          <StatBox label="Valid Candidates" value={report.validStudents.length} valueClass="text-emerald-600" />
          <StatBox
            label="Duplicate Reg Nos"
            value={report.duplicateCount}
            valueClass={report.duplicateCount > 0 ? 'text-red-600' : ''}
          />
          <StatBox
            label="Missing Fields"
            value={report.missingBranchCount + report.missingSemesterCount + report.missingSubjectCount}
            valueClass={
              report.missingBranchCount + report.missingSemesterCount + report.missingSubjectCount > 0
                ? 'text-amber-600'
                : ''
            }
          />
        </div>

        {/* Duplicate Policy Selector if duplicates exist */}
        {report.duplicateCount > 0 && onPolicyChange && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>Duplicate Policy:</span>
            </div>
            <select
              value={report.duplicatePolicy}
              onChange={(e) => onPolicyChange(e.target.value as DuplicatePolicy)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            >
              <option value="reject">Reject all duplicates (Require correction)</option>
              <option value="keepFirst">Keep first instance (Skip subsequent)</option>
              <option value="overwrite">Overwrite with latest row in spreadsheet</option>
            </select>
          </div>
        )}

        {/* Invalid Rows Table */}
        {hasErrors && (
          <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-red-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-red-200">
              <div className="flex items-center gap-2 text-red-900 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>{report.invalidRows.length} Invalid Candidate Records</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrors}
                  className="flex items-center gap-1.5 text-xs border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Error Report (.csv)
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={onDiscardInvalid}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard Invalid Rows
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 sticky top-0 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left w-16">Row #</th>
                    <th className="px-4 py-2 text-left">Candidate Info</th>
                    <th className="px-4 py-2 text-left">Detected Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.invalidRows.map((invalid, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-500 font-mono">Row {invalid.rowIndex}</td>
                      <td className="px-4 py-2 font-mono text-slate-700 max-w-[320px] truncate">
                        {String(invalid.row['Register No'] || invalid.row['Register Number'] || invalid.row['Roll No'] || '—')} / {String(invalid.row['Name'] || invalid.row['Student Name'] || '—')}
                      </td>
                      <td className="px-4 py-2 text-red-600 font-medium">
                        {invalid.issues.join('; ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Mode (Append vs Replace) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs text-slate-700">
            <span className="font-semibold">Import Mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>Append to existing roster</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>Replace entire roster</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Cancel Import
            </Button>
            <Button
              disabled={!isCommitable}
              onClick={() => onCommit(importMode)}
              className="flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {hasErrors ? 'Resolve Issues to Proceed' : `Commit ${report.validStudents.length} Candidates`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatBox({ label, value, valueClass = '' }: { label: string; value: number; valueClass?: string }) {
  return (
    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200 text-center">
      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-2xl font-bold text-slate-900 ${valueClass}`}>{value}</span>
    </div>
  );
}
