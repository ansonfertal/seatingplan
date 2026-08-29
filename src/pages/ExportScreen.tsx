import React from 'react';
import * as XLSX from 'xlsx';
import { buildSeatingSummaryTable } from '../algorithms/summaryGenerator';
import { SummaryView } from '../components/preview/SummaryView';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { createExcelWorkbook } from '../export/excelExporter';
import { downloadClassroomSeatingImage } from '../export/classroomImageExporter';
import { createSeatingArrangementPdf, downloadPdf, printPdf } from '../export/pdfExporter';
import { useAppStore } from '../store/appStore';

export const ExportScreen: React.FC = () => {
  const { arrangement, classrooms, students, exam } = useAppStore();

  const handleDownloadExcel = () => {
    if (!arrangement) {
      return;
    }

    const workbookData = createExcelWorkbook(arrangement, students, classrooms);
    XLSX.writeFile(workbookData.workbook, workbookData.fileName);
  };

  const handleDownloadPdf = () => {
    if (!arrangement) {
      return;
    }

    const pdf = createSeatingArrangementPdf(arrangement, students, classrooms);
    const fileName = `Seating_Arrangement_${arrangement.exam.examName}.pdf`;
    downloadPdf(fileName, pdf);
  };

  const handlePrintPdf = () => {
    if (!arrangement) {
      return;
    }

    const pdf = createSeatingArrangementPdf(arrangement, students, classrooms);
    const fileName = `Seating_Arrangement_${arrangement.exam.examName}.pdf`;
    printPdf(fileName, pdf);
  };

  const handleDownloadSeatingImage = async () => {
    if (!arrangement) {
      return;
    }

    const fileName = `Classroom_Seating_${arrangement.exam.examName}.png`;
    await downloadClassroomSeatingImage(arrangement, students, classrooms, fileName);
  };

  if (!arrangement || !exam) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Export & Print</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">Generate a seating arrangement before exporting the summary or print layouts.</p>
            <Button onClick={() => window.history.back()}>Go back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = buildSeatingSummaryTable(arrangement, students, classrooms);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 export-screen">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Phase 13</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Export & Print</h1>
        </div>
        <div className="export-screen-actions flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleDownloadExcel}>Download Excel</Button>
          <Button onClick={handleDownloadPdf}>Download PDF</Button>
          <Button variant="secondary" onClick={handlePrintPdf}>Print Seating Plan</Button>
          <Button variant="secondary" onClick={handleDownloadSeatingImage}>Download Classroom Image</Button>
        </div>
      </div>

      <SummaryView
        rows={summary.rows}
        totalRoomCount={summary.totalRoomCount}
        totalStudents={summary.totalStudents}
        examName={exam.examName}
        examDate={exam.examDate}
        session={exam.session}
      />
    </div>
  );
};
