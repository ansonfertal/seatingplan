import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowRight, Upload } from 'lucide-react';
import { StudentTable } from '../components/students/StudentTable';
import { BranchSummaryCard } from '../components/students/BranchSummaryCard';
import { ColumnMappingModal } from '../components/students/ColumnMappingModal';
import { StudentValidationSummary } from '../components/students/StudentValidationSummary';
import { parseCSV } from '../import/csvImporter';
import { parseExcel } from '../import/excelImporter';
import { validateStudentData, type ValidationReport, type ColumnMapping } from '../import/studentValidator';
import type { StudentImportRaw } from '../models/student';

export const StudentsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { students, setStudents } = useAppStore();

  const [isImporting, setIsImporting] = useState(false);
  const [rawImportData, setRawImportData] = useState<StudentImportRaw[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setValidationReport(null);
    try {
      let data: StudentImportRaw[] = [];
      if (file.name.endsWith('.csv')) {
        data = await parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await parseExcel(file);
      } else {
        alert("Unsupported file format. Please upload a .csv or .xlsx file.");
        return;
      }

      if (data.length > 0) {
        setRawImportData(data);
        setAvailableHeaders(Object.keys(data[0]));
        setIsMappingModalOpen(true);
      } else {
        alert("The uploaded file appears to be empty.");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to parse the file. Ensure it is a valid CSV or Excel file.");
    } finally {
      setIsImporting(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMappingConfirm = (mapping: ColumnMapping) => {
    setIsMappingModalOpen(false);
    // Validate the mapped data
    const report = validateStudentData(rawImportData, mapping, students);
    setValidationReport(report);
  };

  const handleDiscardInvalid = () => {
    if (validationReport) {
      setValidationReport({
        ...validationReport,
        invalidRows: [],
      });
    }
  };

  const handleCommitImport = () => {
    if (validationReport && validationReport.invalidRows.length === 0) {
      // Add valid students to store
      setStudents([...students, ...validationReport.validStudents]);
      setValidationReport(null);
      setRawImportData([]);
    }
  };

  const handleCancelImport = () => {
    setValidationReport(null);
    setRawImportData([]);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Roster</h1>
        <p className="text-lg text-gray-600">
          Manage the list of students attending the examination. You can add them manually or bulk import from a spreadsheet.
        </p>
      </div>

      {/* Main Content Area */}
      {validationReport ? (
        <StudentValidationSummary 
          report={validationReport}
          onDiscardInvalid={handleDiscardInvalid}
          onCommit={handleCommitImport}
          onCancel={handleCancelImport}
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
                className="h-full min-h-[100px] border-dashed border-2 bg-indigo-50/30 hover:bg-indigo-50 border-indigo-200 text-indigo-700 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isImporting}
              >
                <Upload className="w-6 h-6 mb-1 text-indigo-500" />
                <span className="font-semibold">Import CSV / Excel</span>
                <span className="text-xs font-normal text-indigo-400">Supports .csv, .xlsx</span>
              </Button>
            </div>
          </div>

          <StudentTable 
            students={students}
            onAddStudent={(data) => setStudents([...students, { id: crypto.randomUUID(), ...data }])}
            onUpdateStudent={(id, data) => setStudents(students.map(s => s.id === id ? { ...s, ...data } : s))}
            onDeleteStudent={(id) => setStudents(students.filter(s => s.id !== id))}
            onClearAll={() => {
              if (confirm('Are you sure you want to remove all students?')) {
                setStudents([]);
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
      />

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={() => navigate('/classrooms')} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Classrooms
        </Button>
        <Button 
          onClick={() => navigate('/rules')} 
          disabled={students.length === 0}
          className="flex items-center gap-2"
        >
          Continue to Rules <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
