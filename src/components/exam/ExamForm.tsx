import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  type ExamDetails,
  examDetailsSchema,
  validateExamTimes,
  calculateDurationMinutes,
  calculateEndTimeFromDuration,
} from '../../models/exam';
import { useAppStore } from '../../store/appStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Copy, Archive, CheckCircle2, AlertTriangle, Clock, Building2, Calendar, FileText } from 'lucide-react';

export const ExamForm: React.FC = () => {
  const navigate = useNavigate();
  const { exam, setExamDetails, duplicateExam, archiveExam } = useAppStore();

  const defaultExamValues: ExamDetails = {
    examName: exam?.examName || exam?.name || '',
    name: exam?.name || exam?.examName || '',
    examDate: exam?.examDate || exam?.date || new Date().toISOString().split('T')[0],
    date: exam?.date || exam?.examDate || new Date().toISOString().split('T')[0],
    session: exam?.session || 'FN',
    startTime: exam?.startTime || '09:30',
    endTime: exam?.endTime || '12:30',
    durationMinutes: exam?.durationMinutes || 180,
    isOvernight: exam?.isOvernight || false,
    timezone: exam?.timezone || 'Asia/Kolkata',
    academicYear: exam?.academicYear || '2026-27',
    semester: exam?.semester || 'S5',
    selectedSemesters: exam?.selectedSemesters || [],
    selectedSubjectCodes: exam?.selectedSubjectCodes || [],
    institutionName: exam?.institutionName || 'ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY',
    institutionDepartment: exam?.institutionDepartment || 'Department of Computer Science & Engineering',
    institutionLocation: exam?.institutionLocation || 'KALAMASSERY',
    examCode: exam?.examCode || 'KTU-S5-2026',
    documentCode: exam?.documentCode || 'AISAT/Form/QPM17/F4',
    status: exam?.status || 'draft',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<ExamDetails>({
    resolver: zodResolver(examDetailsSchema) as any,
    defaultValues: defaultExamValues,
    mode: 'onChange',
  });

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const durationMinutes = watch('durationMinutes');
  const isOvernight = watch('isOvernight');
  const examStatus = watch('status') || 'draft';

  // Synchronize duration when start and end times change
  useEffect(() => {
    if (startTime && endTime) {
      const calculatedDuration = calculateDurationMinutes(startTime, endTime, isOvernight);
      if (calculatedDuration != null && calculatedDuration !== durationMinutes) {
        setValue('durationMinutes', calculatedDuration, { shouldValidate: true });
      }
    }
  }, [startTime, endTime, isOvernight, durationMinutes, setValue]);

  // Handle duration changes to update end time
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setValue('durationMinutes', val, { shouldValidate: true });
    if (!isNaN(val) && val > 0 && startTime) {
      const computedEnd = calculateEndTimeFromDuration(startTime, val);
      if (computedEnd) {
        setValue('endTime', computedEnd, { shouldValidate: true });
      }
    }
  };

  const timeValidation = validateExamTimes(startTime, endTime, isOvernight);

  const onSubmit = (data: ExamDetails) => {
    setExamDetails({
      ...data,
      name: data.examName,
      date: data.examDate,
    });
    // In PRD Section 3 Workflow: Step 1: Exam setup -> Step 2: Students import
    navigate('/students');
  };

  const handleDuplicate = () => {
    const cloned = duplicateExam();
    setValue('examName', cloned.examName);
    setValue('name', cloned.name);
    setValue('status', 'draft');
  };

  const handleArchive = () => {
    archiveExam();
    setValue('status', 'archived');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active Exam</Badge>;
      case 'archived':
        return <Badge variant="default">Archived</Badge>;
      default:
        return <Badge variant="warning">Draft Setup</Badge>;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {watch('examName') || 'New Examination Setup'}
            </h1>
            <p className="text-xs text-slate-500">
              PRD Functional Requirement 4.1: Examination metadata, duration & timing validation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge(examStatus)}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            title="Duplicate this exam configuration"
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <Copy className="w-4 h-4 text-slate-500" />
            Duplicate
          </Button>

          {examStatus !== 'archived' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              title="Archive this exam"
              className="flex items-center gap-1.5 text-xs text-amber-700 hover:bg-amber-50"
            >
              <Archive className="w-4 h-4 text-amber-600" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-indigo-600">
            <FileText className="w-5 h-5" />
            <CardTitle>Session & Schedule Details</CardTitle>
          </div>
          <p className="text-sm text-slate-500">
            Configure examination timing, session, and institutional parameters according to the official timetable.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Exam Name & Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Input
                label="Examination Title *"
                placeholder="e.g. B.Tech S5 Regular & Supplementary Examination"
                {...register('examName')}
                error={errors.examName?.message}
              />
            </div>

            <Input
              label="Examination Date *"
              type="date"
              {...register('examDate')}
              error={errors.examDate?.message}
            />
          </div>

          {/* Timing, Duration & Overnight Controls */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Time Scheduling & Duration (Institutional Timezone: Asia/Kolkata)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Session *
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  aria-label="Examination Session"
                  {...register('session')}
                >
                  <option value="FN">FN — Forenoon</option>
                  <option value="AN">AN — Afternoon</option>
                </select>
                {errors.session?.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.session.message}</p>
                )}
              </div>

              <Input
                label="Start Time *"
                type="time"
                {...register('startTime')}
                error={errors.startTime?.message}
              />

              <Input
                label="End Time *"
                type="time"
                {...register('endTime')}
                error={errors.endTime?.message || (!timeValidation.isValid ? timeValidation.error : undefined)}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  value={durationMinutes || ''}
                  onChange={handleDurationChange}
                  placeholder="e.g. 180"
                />
              </div>
            </div>

            {/* Overnight Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  {...register('isOvernight')}
                />
                <span className="font-medium">Overnight Examination Session</span>
                <span className="text-xs text-slate-500">(Enable if the exam session extends past midnight)</span>
              </label>

              {timeValidation.isValid ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Time validation passed ({durationMinutes} mins)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {timeValidation.error}
                </span>
              )}
            </div>
          </div>

          {/* Academic & Institution Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Institutional Metadata & Form Codes</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Institution Name"
                placeholder="e.g. ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY"
                {...register('institutionName')}
                error={errors.institutionName?.message}
              />

              <Input
                label="Department / Unit"
                placeholder="e.g. Department of Computer Science & Engineering"
                {...register('institutionDepartment')}
                error={errors.institutionDepartment?.message}
              />

              <Input
                label="Location / Campus"
                placeholder="e.g. KALAMASSERY, KOCHI"
                {...register('institutionLocation')}
                error={errors.institutionLocation?.message}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Academic Year"
                  placeholder="e.g. 2026-27"
                  {...register('academicYear')}
                  error={errors.academicYear?.message}
                />
                <Input
                  label="Semester"
                  placeholder="e.g. S5"
                  {...register('semester')}
                  error={errors.semester?.message}
                />
              </div>

              <Input
                label="Examination Code"
                placeholder="e.g. KTU-EXAM-S5-2026"
                {...register('examCode')}
                error={errors.examCode?.message}
              />

              <Input
                label="Document Quality Code"
                placeholder="e.g. AISAT/Form/QPM17/F4"
                {...register('documentCode')}
                error={errors.documentCode?.message}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-between border-t border-slate-100 pt-6">
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-xs text-slate-500">Unsaved changes in draft</span>
            )}
            <Button
              type="submit"
              disabled={!isValid || !timeValidation.isValid}
              aria-label="Save and continue to student import"
            >
              Save & Continue to Students →
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
};
