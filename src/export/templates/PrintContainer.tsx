import React from 'react';
import type { Exam, ExamDetails } from '../../models/exam';
import '../../styles/printEngine.css';

export type PrintContainerProps = {
  orientation?: 'portrait' | 'landscape';
  documentTitle: string;
  documentSubtitle?: string;
  documentCode?: string;
  exam: Exam | ExamDetails;
  pageNumber?: number;
  totalPages?: number;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  roomName?: string;
  className?: string;
  compactHeader?: boolean;
  hideStandardFooter?: boolean;
  fitSinglePage?: boolean;
};

export const PrintContainer: React.FC<PrintContainerProps> = ({
  orientation = 'portrait',
  documentTitle,
  documentSubtitle,
  documentCode,
  exam,
  pageNumber,
  totalPages,
  children,
  footerContent,
  roomName,
  className = '',
  compactHeader,
  hideStandardFooter,
  fitSinglePage,
}) => {
  const institutionName = exam.institutionName || 'Albertian Institute of Science and Technology';
  const institutionLocation = exam.institutionLocation || 'Kalamassery, Kochi - 682022';
  const effectiveDocCode = documentCode || exam.documentCode || 'EXAM/FORM/2026/REV1';
  const useCompactHeader = compactHeader ?? (orientation === 'landscape');

  return (
    <div className={`print-sheet ${orientation} ${fitSinglePage ? 'fit-single-page' : ''} ${className} bg-white text-black`}>
      {/* Institutional Header (PRD Section 4.7) - Strictly Monochrome */}
      {useCompactHeader ? (
        <div className="border-b-2 border-black pb-1.5 mb-1.5 avoid-break shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black truncate">
                {institutionName}
              </h1>
              <span className="text-[10px] text-black font-medium hidden md:inline truncate">
                ({institutionLocation})
              </span>
            </div>
            <div className="inline-block border-y border-black py-0.5 px-2.5 shrink-0 text-center bg-white">
              <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-black leading-tight">
                {documentTitle}
              </h2>
              {documentSubtitle && (
                <p className="text-[9px] font-semibold text-black leading-none mt-0.5">
                  {documentSubtitle}
                </p>
              )}
            </div>
            {effectiveDocCode && (
              <span className="text-[9px] font-mono text-black shrink-0">{effectiveDocCode}</span>
            )}
          </div>

          {/* Compact 1-line metadata bar */}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 text-[10.5px] border border-black bg-white px-2 py-0.5 font-medium text-black">
            <div>
              <span className="text-black font-normal">Exam: </span>
              <strong className="text-black font-bold">{exam.examName}</strong>
            </div>
            <div>
              <span className="text-black font-normal">Date: </span>
              <strong className="text-black font-bold">{exam.examDate}</strong>
            </div>
            <div>
              <span className="text-black font-normal">Session: </span>
              <strong className="text-black font-bold">
                {exam.session || 'FN'} {exam.startTime && exam.endTime ? `(${exam.startTime} - ${exam.endTime})` : ''}
              </strong>
            </div>
            <div>
              <span className="text-black font-normal">Hall: </span>
              <strong className="text-black font-bold">{roomName || 'All Halls'}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b-2 border-black pb-3 mb-4 avoid-break bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 text-center">
              <h1 className="text-base font-bold uppercase tracking-wider text-black">
                {institutionName}
              </h1>
              <p className="text-xs text-black font-medium">{institutionLocation}</p>
              <div className="mt-1.5 inline-block border-y border-black py-0.5 px-3 bg-white">
                <h2 className="text-sm font-bold uppercase tracking-widest text-black">
                  {documentTitle}
                </h2>
              </div>
              {documentSubtitle && (
                <p className="text-xs font-semibold text-black mt-0.5">{documentSubtitle}</p>
              )}
            </div>
            {effectiveDocCode && (
              <div className="text-right text-[10px] font-mono text-black shrink-0">
                <span>{effectiveDocCode}</span>
              </div>
            )}
          </div>

          {/* Exam Metadata Grid */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-black bg-white p-2 font-medium text-black">
            <div>
              <span className="text-black font-normal">Examination: </span>
              <strong className="text-black font-bold">{exam.examName}</strong>
            </div>
            <div>
              <span className="text-black font-normal">Date: </span>
              <strong className="text-black font-bold">{exam.examDate}</strong>
            </div>
            <div>
              <span className="text-black font-normal">Session: </span>
              <strong className="text-black font-bold">
                {exam.session || 'FN'} {exam.startTime && exam.endTime ? `(${exam.startTime} - ${exam.endTime})` : ''}
              </strong>
            </div>
            <div>
              <span className="text-black font-normal">Hall / Room: </span>
              <strong className="text-black font-bold">{roomName || 'All Halls'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Template Content */}
      <div className={`print-content ${fitSinglePage ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'flex-1'}`}>
        {children}
      </div>

      {/* Standard Footer */}
      {!hideStandardFooter && (
        <div className="mt-4 pt-2 border-t border-black text-[10px] text-black flex items-center justify-between avoid-break shrink-0">
          <div>
            <span>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="mx-2">•</span>
            <span>Official Institutional Examination Record</span>
          </div>
          {pageNumber && totalPages && (
            <div className="font-semibold text-black">
              Page {pageNumber} of {totalPages}
            </div>
          )}
        </div>
      )}

      {/* Optional Custom Footer / Signatures */}
      {footerContent && (
        <div className={`${hideStandardFooter ? 'mt-1' : 'mt-2'} avoid-break shrink-0`}>
          {footerContent}
        </div>
      )}
    </div>
  );
};
