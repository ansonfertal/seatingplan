import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Upload } from 'lucide-react';
import { StudentTable } from '../components/students/StudentTable';
import { BranchSummaryCard } from '../components/students/BranchSummaryCard';
import { ColumnMappingModal } from '../components/students/ColumnMappingModal';
import { StudentValidationSummary } from '../components/students/StudentValidationSummary';
import { parseCSV } from '../import/csvImporter';
import { parseExcel, getExcelSheetNames } from '../import/excelImporter';
import {
  validateStudentData,
  type ValidationReport,
  type ColumnMapping,
  type DuplicatePolicy,
} from '../import/studentValidator';
import type { StudentImportRaw } from '../models/student';

export const StudentsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { students, setStudents, setArrangement, clearAllStudentData } = useAppStore();

  const [isImporting, setIsImporting] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [rawImportData, setRawImportData] = useState<StudentImportRaw[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [activeMapping, setActiveMapping] = useState<ColumnMapping | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('reject');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentFile(file);
    setIsImporting(true);
    setValidationReport(null);

    try {
      let data: StudentImportRaw[] = [];
      let sheets: string[] = [];

      if (file.name.endsWith('.csv')) {
        data = await parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        sheets = await getExcelSheetNames(file);
        setSheetNames(sheets);
        const defaultSheet = sheets[0] || '';
        setSelectedSheet(defaultSheet);
        data = await parseExcel(file, defaultSheet);
      } else {
        alert('Unsupported file format. Please upload a .csv or .xlsx file.');
        return;
      }

      if (data.length > 0) {
        setRawImportData(data);
        setAvailableHeaders(Object.keys(data[0]));
        setIsMappingModalOpen(true);
      } else {
        alert('The uploaded spreadsheet appears to be empty or contains only blank rows.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to parse the file. Ensure it is a valid CSV or Excel file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!currentFile) return;
    try {
      setSelectedSheet(sheetName);
      const data = await parseExcel(currentFile, sheetName);
      if (data.length > 0) {
        setRawImportData(data);
        setAvailableHeaders(Object.keys(data[0]));
      }
    } catch (err) {
      console.error('Failed to change sheet', err);
    }
  };

  const handleMappingConfirm = (mapping: ColumnMapping) => {
    setIsMappingModalOpen(false);
    setActiveMapping(mapping);
    const report = validateStudentData(rawImportData, mapping, students, duplicatePolicy);
    setValidationReport(report);
  };

  const handlePolicyChange = (policy: DuplicatePolicy) => {
    setDuplicatePolicy(policy);
    if (activeMapping && rawImportData.length > 0) {
      const report = validateStudentData(rawImportData, activeMapping, students, policy);
      setValidationReport(report);
    }
  };

  const handleDiscardInvalid = () => {
    if (validationReport) {
      setValidationReport({
        ...validationReport,
        invalidRows: [],
      });
    }
  };

  const handleCommitImport = (mode: 'append' | 'replace') => {
    if (validationReport && validationReport.invalidRows.length === 0) {
      if (mode === 'replace') {
        setStudents(validationReport.validStudents);
      } else {
        setStudents([...students, ...validationReport.validStudents]);
      }

      // Candidate changes invalidate existing allocation snapshot
      setArrangement(undefined as any);
      setValidationReport(null);
      setRawImportData([]);
      setActiveMapping(null);
    }
  };

  const handleCancelImport = () => {
    setValidationReport(null);
    setRawImportData([]);
    setActiveMapping(null);
  };

  return (
    <div className="py-4 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Candidate Roster Management</h1>
        <p className="text-sm text-slate-500">
          PRD Requirement 4.2: Import student candidates with register numbers, branch, semester, and subject code.
        </p>
      </div>

      {validationReport ? (
        <StudentValidationSummary
          report={validationReport}
          onDiscardInvalid={handleDiscardInvalid}
          onCommit={handleCommitImport}
          onCancel={handleCancelImport}
          onPolicyChange={handlePolicyChange}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-2/3">
              <BranchSummaryCard students={students} />
            </div>

            <div className="w-full sm:w-1/3 flex flex-col gap-3">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                className="h-full min-h-[110px] border-dashed border-2 bg-indigo-50/40 hover:bg-indigo-50 border-indigo-200 text-indigo-700 flex-col gap-2 rounded-2xl transition-all"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isImporting}
              >
                <Upload className="w-6 h-6 text-indigo-600" />
                <span className="font-semibold text-sm">Upload Spreadsheet</span>
                <span className="text-xs font-normal text-indigo-500">
                  Accepts .xlsx, .xls, and .csv with column mapping
                </span>
              </Button>
            </div>
          </div>

          <StudentTable
            students={students}
            onAddStudent={(data) => {
              setStudents([...students, { id: crypto.randomUUID(), ...data }]);
              setArrangement(undefined as any);
            }}
            onUpdateStudent={(id, data) => {
              setStudents(students.map((s) => (s.id === id ? { ...s, ...data } : s)));
              setArrangement(undefined as any);
            }}
            onDeleteStudent={(id) => {
              setStudents(students.filter((s) => s.id !== id));
              setArrangement(undefined as any);
            }}
            onClearAll={() => {
              if (confirm('Are you sure you want to remove all candidates? This will reset any seating plan.')) {
                clearAllStudentData();
              }
            }}
          />
        </div>
      )}

      {/* Modals */}
      <ColumnMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        onConfirm={handleMappingConfirm}
        availableHeaders={availableHeaders}
        sheetNames={sheetNames}
        selectedSheet={selectedSheet}
        onSelectSheet={handleSheetChange}
      />

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-6 border-t border-slate-200">
        <Button variant="ghost" onClick={() => navigate('/exam')} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Exam Setup
        </Button>
        <Button
          onClick={() => navigate('/classrooms')}
          disabled={students.length === 0}
          className="flex items-center gap-2"
        >
          Continue to Rooms & Benches →
        </Button>
      </div>
    </div>
  );
};
