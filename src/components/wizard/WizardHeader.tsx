import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { Badge } from '../ui/Badge';
import { ProgressIndicator } from './ProgressIndicator';
import { Calendar, Users, Grid, Sliders, PlayCircle, Eye, Printer, Check, ShieldCheck } from 'lucide-react';

export const WizardHeader: React.FC = () => {
  const location = useLocation();
  const { exam, students, classrooms, arrangement, allocationVersions, activeVersionId } = useAppStore();

  const activeVersion = allocationVersions.find((v) => v.id === activeVersionId);

  const steps = [
    {
      id: 1,
      label: 'Exam Setup',
      path: '/exam',
      icon: Calendar,
      complete: Boolean(exam?.examName && exam?.examDate),
      active: location.pathname === '/exam',
      disabled: false,
    },
    {
      id: 2,
      label: 'Students',
      path: '/students',
      icon: Users,
      complete: students.length > 0,
      active: location.pathname === '/students',
      disabled: !exam?.examName,
    },
    {
      id: 3,
      label: 'Rooms & Benches',
      path: '/classrooms',
      icon: Grid,
      complete: classrooms.length > 0,
      active: location.pathname === '/classrooms',
      disabled: !exam?.examName,
    },
    {
      id: 4,
      label: 'Rules & Readiness',
      path: '/rules',
      icon: Sliders,
      complete: classrooms.length > 0 && students.length > 0,
      active: location.pathname === '/rules',
      disabled: classrooms.length === 0 || students.length === 0,
    },
    {
      id: 5,
      label: 'Generate',
      path: '/generate',
      icon: PlayCircle,
      complete: Boolean(arrangement),
      active: location.pathname === '/generate',
      disabled: classrooms.length === 0 || students.length === 0,
    },
    {
      id: 6,
      label: 'Review & Finalize',
      path: '/review',
      icon: Eye,
      complete: activeVersion?.status === 'finalized',
      active: location.pathname === '/review' || location.pathname === '/preview',
      disabled: !arrangement,
    },
    {
      id: 7,
      label: 'Print Pack',
      path: '/export',
      icon: Printer,
      complete: false,
      active: location.pathname === '/export',
      disabled: !arrangement,
    },
  ];

  // If on dashboard, don't show the wizard header
  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return null;
  }

  const currentStepIndex = steps.findIndex((s) => s.active);
  const currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'archived':
        return <Badge variant="default">Archived</Badge>;
      default:
        return <Badge variant="warning">Draft</Badge>;
    }
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Exam Context Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-xs font-semibold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            ← All Exams
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-semibold text-slate-800">
            {exam?.examName || 'Untitled Examination'}
          </span>
          {exam && getStatusBadge(exam.status)}
          {activeVersion && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              v{activeVersion.versionNumber} ({activeVersion.status})
            </span>
          )}
        </div>

        <div className="w-48 sm:w-64">
          <ProgressIndicator currentStep={currentStepNumber} totalSteps={7} />
        </div>
      </div>

      {/* Step Navigation Bar */}
      <nav aria-label="Creation Wizard Progress" className="flex overflow-x-auto py-2 px-3 gap-1 scrollbar-none">
        {steps.map((step) => {
          const StepIcon = step.icon;
          const isCurrent = step.active;
          const isDone = step.complete;

          const content = (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDone
                  ? 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-600'
              } ${step.disabled ? 'pointer-events-none opacity-40' : ''}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isCurrent
                    ? 'bg-white text-indigo-600'
                    : isDone
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'border border-current'
                }`}
              >
                {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
              </span>
              <StepIcon className="w-3.5 h-3.5" />
              <span>{step.label}</span>
            </div>
          );

          if (step.disabled) {
            return (
              <div key={step.path} className="cursor-not-allowed">
                {content}
              </div>
            );
          }

          return (
            <Link key={step.path} to={step.path} className="block focus:outline-none">
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
