import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ColumnMapping } from '../../import/studentValidator';
import { Layers } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mapping: ColumnMapping) => void;
  availableHeaders: string[];
  sheetNames?: string[];
  selectedSheet?: string;
  onSelectSheet?: (sheet: string) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableHeaders,
  sheetNames = [],
  selectedSheet,
  onSelectSheet,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({
    registerNumber: '',
    name: '',
    branch: '',
    semester: '',
    subjectCode: '',
    defaultSemester: '',
    defaultSubjectCode: '',
  });

  // Auto-detect columns when availableHeaders changes
  useEffect(() => {
    if (isOpen && availableHeaders.length > 0) {
      const guessMapping = (keywords: string[]) => {
        return (
          availableHeaders.find((h) =>
            keywords.some((k) => h.toLowerCase().includes(k))
          ) || ''
        );
      };

      setMapping((prev) => ({
        ...prev,
        registerNumber: guessMapping(['register', 'roll', 'reg', 'cand', 'id']),
        name: guessMapping(['name', 'student', 'candidate']),
        branch: guessMapping(['branch', 'dept', 'department', 'programme', 'course']),
        semester: guessMapping(['semester', 'sem', 'year']),
        subjectCode: guessMapping(['subject code', 'subjectcode', 'sub code', 'course code', 'subject']),
      }));
    }
  }, [isOpen, availableHeaders]);

  const isValid = Boolean(mapping.registerNumber && mapping.name && mapping.branch);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Candidate Spreadsheet Column Mapping"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!isValid} onClick={() => onConfirm(mapping)}>
            Confirm & Inspect Validation →
          </Button>
        </div>
      }
    >
      <div className="space-y-5 py-2">
        {/* Multi-sheet selection if multiple sheets exist */}
        {sheetNames.length > 1 && onSelectSheet && (
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-indigo-800 text-sm font-medium">
              <Layers className="w-4 h-4" />
              <span>Select Excel Worksheet:</span>
            </div>
            <select
              value={selectedSheet}
              onChange={(e) => onSelectSheet(e.target.value)}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sheetNames.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Match the required candidate fields (PRD Section 4.2) with the column headers discovered in your spreadsheet.
          Leading zeros in register numbers are automatically preserved.
        </p>

        <div className="space-y-4">
          <FieldMappingRow
            label="Register Number (Unique Identifier)"
            value={mapping.registerNumber}
            onChange={(val) => setMapping((m) => ({ ...m, registerNumber: val }))}
            options={availableHeaders}
            required
            helperText="e.g. 21CS001, 0042 (Never parsed as number)"
          />

          <FieldMappingRow
            label="Candidate Name"
            value={mapping.name}
            onChange={(val) => setMapping((m) => ({ ...m, name: val }))}
            options={availableHeaders}
            required
            helperText="Full candidate display name"
          />

          <FieldMappingRow
            label="Academic Branch / Department"
            value={mapping.branch}
            onChange={(val) => setMapping((m) => ({ ...m, branch: val }))}
            options={availableHeaders}
            required
            helperText="e.g. CS, EC, ME, CE"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldMappingRow
              label="Semester Column"
              value={mapping.semester || ''}
              onChange={(val) => setMapping((m) => ({ ...m, semester: val }))}
              options={availableHeaders}
              helperText="Column in sheet (e.g. S5)"
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Semester (if not in sheet)
              </label>
              <input
                type="text"
                placeholder="e.g. S5"
                value={mapping.defaultSemester || ''}
                onChange={(e) => setMapping((m) => ({ ...m, defaultSemester: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Applies to rows missing semester</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldMappingRow
              label="Subject / Paper Code Column"
              value={mapping.subjectCode || ''}
              onChange={(val) => setMapping((m) => ({ ...m, subjectCode: val }))}
              options={availableHeaders}
              helperText="Column in sheet (e.g. CS301)"
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Subject Code (if not in sheet)
              </label>
              <input
                type="text"
                placeholder="e.g. CS301"
                value={mapping.defaultSubjectCode || ''}
                onChange={(e) => setMapping((m) => ({ ...m, defaultSubjectCode: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Applies to rows missing subject code</span>
            </div>
          </div>
        </div>

        {!isValid && (
          <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
            Please map at least Register Number, Candidate Name, and Branch to proceed.
          </div>
        )}
      </div>
    </Modal>
  );
};

function FieldMappingRow({
  label,
  value,
  onChange,
  options,
  required,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  required?: boolean;
  helperText?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helperText && <span className="text-[11px] text-slate-400">{helperText}</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
      >
        <option value="">-- {required ? 'Select Required Column' : 'None / Not in Sheet'} --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
