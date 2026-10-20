import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  ArrowLeft,
  Lock,
  AlertTriangle,
  Scan,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAppStore } from '../store/appStore';
import { AttendanceSheet1 } from '../export/templates/AttendanceSheet1';
import { AttendanceSheet2 } from '../export/templates/AttendanceSheet2';
import { SeatingNoticeSheet } from '../export/templates/SeatingNoticeSheet';
import { DailyAttendanceSheet } from '../export/templates/DailyAttendanceSheet';
import { RoomSeatingPlanSheet } from '../export/templates/RoomSeatingPlanSheet';
import {
  downloadAllocationCsv,
  downloadAllocationExcel,
  buildAllocationExportRows,
} from '../export/csvAllocationExporter';
import {
  generateAttendanceSheet1Pdf,
  generateSeatingNoticePdf,
  generateRoomSeatingPlanPdf,
  downloadGeneratedPdf,
} from '../export/pdfPackGenerator';
import { TemplateCustomizerModal } from '../components/export/TemplateCustomizerModal';
import { BarcodeScannerModal } from '../components/attendance/BarcodeScannerModal';
import { DEFAULT_TEMPLATE_CONFIG, type PrintTemplateCustomization } from '../models/templateConfig';
import { Sparkles } from 'lucide-react';
import '../styles/printEngine.css';

export type TemplateTab =
  | 'attendance_1'
  | 'attendance_2'
  | 'seating_notice'
  | 'daily_attendance'
  | 'room_seating_plan'
  | 'raw_data';

export const ExportScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    arrangement,
    classrooms,
    students,
    exam,
    allocationVersions,
    activeVersionId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TemplateTab>('seating_notice');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<PrintTemplateCustomization>(DEFAULT_TEMPLATE_CONFIG);

  const activeVersion = useMemo(
    () => allocationVersions.find((v) => v.id === activeVersionId) || allocationVersions[allocationVersions.length - 1],
    [allocationVersions, activeVersionId]
  );

  const isFinalized = activeVersion?.status === 'finalized';
  const isSuperseded = activeVersion?.status === 'superseded';

  if (!arrangement || !exam) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="space-y-4 p-8 text-center">
            <Layers className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-900">No Seating Plan Generated</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Please complete the allocation engine and review steps before generating print documents.
            </p>
            <Button onClick={() => navigate('/generate')} className="mx-auto flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Go to Generation Screen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const effectiveRoomId = selectedRoomId === 'all' ? undefined : selectedRoomId;
  const currentAssignments = arrangement.assignments;

  // Print handler: activates browser print dialog with printEngine.css
  const handlePrint = () => {
    window.print();
  };

  // PDF Download Handler based on active template
  const handleDownloadActivePdf = () => {
    const examCleanName = exam.examName.replace(/\s+/g, '_');
    const examDate = exam.examDate;

    if (activeTab === 'attendance_1') {
      const pdf = generateAttendanceSheet1Pdf(exam, classrooms, currentAssignments, students);
      downloadGeneratedPdf(pdf, `Attendance_Sheet_1_${examCleanName}_${examDate}.pdf`);
    } else if (activeTab === 'seating_notice') {
      const pdf = generateSeatingNoticePdf(exam, classrooms, currentAssignments, students);
      downloadGeneratedPdf(pdf, `Seating_Notice_${examCleanName}_${examDate}.pdf`);
    } else if (activeTab === 'room_seating_plan') {
      const pdf = generateRoomSeatingPlanPdf(exam, classrooms, currentAssignments, students);
      downloadGeneratedPdf(pdf, `Room_Seating_Plan_${examCleanName}_${examDate}.pdf`);
    } else {
      // Fallback: print document via browser print
      window.print();
    }
  };

  const handleDownloadExcel = () => {
    downloadAllocationExcel(exam, classrooms, currentAssignments, students);
  };

  const handleDownloadCsv = () => {
    downloadAllocationCsv(exam, classrooms, currentAssignments, students);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Version Status Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <span>Step 7 of 7</span>
            <span>•</span>
            <span>Five Print Templates & Document Pack</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Institutional Print Pack & Export Center
          </h1>
          <p className="text-sm text-slate-500">
            All five official documents derive strictly from the same finalized snapshot (PRD Section 4.7).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/review')} className="flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Review
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsCustomizerOpen(true)} className="flex items-center gap-1.5 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700">
            <Sparkles className="h-4 w-4 text-purple-600" /> Customize Templates
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsScannerOpen(true)} className="flex items-center gap-1.5 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700">
            <Scan className="h-4 w-4 text-blue-600" /> Barcode Verifier
          </Button>

          <Button variant="secondary" size="sm" onClick={handleDownloadExcel} className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
          </Button>

          <Button variant="secondary" size="sm" onClick={handleDownloadCsv} className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-600" /> Export CSV
          </Button>

          <Button size="sm" onClick={handleDownloadActivePdf} className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800">
            <Download className="h-4 w-4" /> Download PDF
          </Button>

          <Button size="sm" onClick={handlePrint} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Printer className="h-4 w-4" /> Print Document
          </Button>
        </div>
      </div>

      {/* Warnings & Notices */}
      {isSuperseded && (
        <div className="no-print rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-0.5">
            <p className="font-bold text-sm">Warning: This print pack is based on a superseded allocation!</p>
            <p>
              Version v{activeVersion?.versionNumber} has been superseded by a newer finalized snapshot. Printing from this version will result in stale notices and attendance sheets.
            </p>
          </div>
        </div>
      )}

      {isFinalized && (
        <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Authoritative Finalized Snapshot: Version v{activeVersion?.versionNumber}</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">
            Timestamp: {new Date(activeVersion.finalizedAt || activeVersion.generatedAt).toLocaleString()}
          </span>
        </div>
      )}

      {/* Template Switcher Tabs & Hall Filter Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
        {/* Document Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('seating_notice')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'seating_notice'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Output C: Seating Notice (Campus Board)
          </button>

          <button
            onClick={() => setActiveTab('room_seating_plan')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'room_seating_plan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Output E: Room Seating Plan (Door Diagram)
          </button>

          <button
            onClick={() => setActiveTab('attendance_1')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'attendance_1'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Output A: Attendance Sheet #1 (Signatures)
          </button>

          <button
            onClick={() => setActiveTab('attendance_2')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'attendance_2'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Output B: Attendance Sheet #2 (Booklets)
          </button>

          <button
            onClick={() => setActiveTab('daily_attendance')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'daily_attendance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Output D: Daily Attendance (Summary)
          </button>

          <button
            onClick={() => setActiveTab('raw_data')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'raw_data'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Raw Allocation Data (Table)
          </button>
        </div>

        {/* Hall Filter (for room-specific templates) */}
        {activeTab !== 'daily_attendance' && activeTab !== 'raw_data' && (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-xs font-semibold text-slate-500">Hall:</span>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Examination Halls ({classrooms.length})</option>
              {classrooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Live Paper Preview Canvas (PRD Section 4.7) */}
      <div className="print-paper-container rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
        {activeTab === 'attendance_1' && (
          <AttendanceSheet1
            exam={exam}
            rooms={classrooms}
            assignments={currentAssignments}
            students={students}
            targetRoomId={effectiveRoomId}
          />
        )}

        {activeTab === 'attendance_2' && (
          <AttendanceSheet2
            exam={exam}
            rooms={classrooms}
            assignments={currentAssignments}
            students={students}
            targetRoomId={effectiveRoomId}
          />
        )}

        {activeTab === 'seating_notice' && (
          <SeatingNoticeSheet
            exam={exam}
            rooms={classrooms}
            assignments={currentAssignments}
            students={students}
            targetRoomId={effectiveRoomId}
          />
        )}

        {activeTab === 'daily_attendance' && (
          <DailyAttendanceSheet
            exam={exam}
            rooms={classrooms}
            assignments={currentAssignments}
            students={students}
          />
        )}

        {activeTab === 'room_seating_plan' && (
          <RoomSeatingPlanSheet
            exam={exam}
            rooms={classrooms}
            assignments={currentAssignments}
            students={students}
            targetRoomId={effectiveRoomId}
          />
        )}

        {activeTab === 'raw_data' && (
          <div className="w-full max-w-5xl bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Complete Allocation Dataset</h3>
                <p className="text-xs text-slate-500">Exportable as CSV or Excel XLSX for institutional ERP imports.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadExcel}>
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Export Excel
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadCsv}>
                  <FileText className="w-3.5 h-3.5 mr-1 text-slate-600" /> Export CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 border">Room</th>
                    <th className="p-2 border">Bench</th>
                    <th className="p-2 border">Pos</th>
                    <th className="p-2 border">Register No.</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Branch</th>
                    <th className="p-2 border">Sem</th>
                    <th className="p-2 border">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {buildAllocationExportRows(exam, classrooms, currentAssignments, students).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border font-bold">{row.Room}</td>
                      <td className="p-2 border text-center font-mono">R{row['Bench Row']}-C{row['Bench Column']}</td>
                      <td className="p-2 border text-center font-bold">P{row['Seat Position']}</td>
                      <td className="p-2 border font-mono font-bold text-indigo-700">{row['Register Number']}</td>
                      <td className="p-2 border">{row['Candidate Name']}</td>
                      <td className="p-2 border">{row.Branch}</td>
                      <td className="p-2 border text-center">{row.Semester}</td>
                      <td className="p-2 border font-mono">{row['Subject Code']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <TemplateCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={templateConfig}
        onSave={(newConfig) => setTemplateConfig(newConfig)}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        assignments={currentAssignments}
        students={students}
        rooms={classrooms}
      />
    </div>
  );
};
