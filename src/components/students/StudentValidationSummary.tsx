import React from 'react';
import type { ValidationReport } from '../../import/studentValidator';
import { Button } from '../ui/Button';
import { AlertCircle, CheckCircle2, FileWarning } from 'lucide-react';

interface StudentValidationSummaryProps {
  report: ValidationReport | null;
  onDiscardInvalid: () => void;
  onCommit: () => void;
  onCancel: () => void;
}

export const StudentValidationSummary: React.FC<StudentValidationSummaryProps> = ({
  report,
  onDiscardInvalid,
  onCommit,
  onCancel,
}) => {
  if (!report) return null;

  const hasErrors = report.invalidRows.length > 0;
  const isCommitable = report.validStudents.length > 0 && !hasErrors;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Import Validation Report</h3>
        {hasErrors ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-4 h-4" /> Issues Found
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-4 h-4" /> All Valid
          </span>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="Total Processed" value={report.validStudents.length + report.invalidRows.length} />
          <StatBox label="Valid Records" value={report.validStudents.length} valueClass="text-green-600" />
          <StatBox label="Duplicates Found" value={report.duplicateCount} valueClass={report.duplicateCount > 0 ? "text-red-600" : ""} />
          <StatBox label="Missing Fields" value={report.invalidRows.length - report.duplicateCount} valueClass={report.invalidRows.length - report.duplicateCount > 0 ? "text-amber-600" : ""} />
        </div>

        {hasErrors && (
          <div className="mb-6 border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-50 px-4 py-3 flex items-start gap-3">
              <FileWarning className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Invalid Records Detected</h4>
                <p className="text-sm text-red-700 mt-1">
                  We found {report.invalidRows.length} records that cannot be imported. You can discard them to proceed with the valid ones.
                </p>
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                className="ml-auto flex-shrink-0"
                onClick={onDiscardInvalid}
              >
                Discard Invalid Rows
              </Button>
            </div>
            
            <div className="max-h-60 overflow-y-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Row Data (Preview)</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.invalidRows.map((invalid, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 truncate max-w-[200px]">
                        {JSON.stringify(invalid.row)}
                      </td>
                      <td className="px-4 py-2 text-red-600">
                        <ul className="list-disc list-inside">
                          {invalid.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={onCancel}>Cancel Import</Button>
          <Button 
            disabled={!isCommitable} 
            onClick={onCommit}
            className="min-w-[150px]"
          >
            {hasErrors ? 'Resolve Issues to Proceed' : `Import ${report.validStudents.length} Students`}
          </Button>
        </div>
      </div>
    </div>
  );
};

function StatBox({ label, value, valueClass = "" }: { label: string; value: number; valueClass?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-center">
      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-2xl font-bold text-gray-900 ${valueClass}`}>{value}</span>
    </div>
  );
}
