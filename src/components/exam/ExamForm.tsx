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
import { Copy, Archive, CheckCircle2, AlertTriangle, Clock, Building2, Calendar, FileText, Users, UserPlus, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getUserDisplayName, getUserPost } from '../../models/user';

export const ExamForm: React.FC = () => {
  const navigate = useNavigate();
  const { exam, setExamDetails, duplicateExam, archiveExam } = useAppStore();
  const { users, addUser } = useAuthStore();

  const [newInvigName, setNewInvigName] = React.useState('');
  const [newInvigDept, setNewInvigDept] = React.useState('');
  const [showAddInvigInline, setShowAddInvigInline] = React.useState(false);

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
    coordinatorId: exam?.coordinatorId || '',
    coordinatorName: exam?.coordinatorName || '',
    adminId: exam?.adminId || '',
    adminName: exam?.adminName || '',
    invigilatorIds: exam?.invigilatorIds || [],
    invigilatorNames: exam?.invigilatorNames || [],
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
  const selectedInvigilatorNames = watch('invigilatorNames') || [];
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

          {/* Examination Officials & Invigilators Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Examination Officials & Invigilation Panel</span>
              </div>
              <span className="text-xs text-slate-400">Select authorized personnel for this examination</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Exam Coordinator Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exam Coordinator *
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  value={watch('coordinatorName') || ''}
                  onChange={(e) => {
                    const selName = e.target.value;
                    const matched = users.find((u) => getUserDisplayName(u) === selName || u.name === selName);
                    setValue('coordinatorName', selName, { shouldValidate: true, shouldDirty: true });
                    setValue('coordinatorId', matched?.id || '', { shouldValidate: true, shouldDirty: true });
                  }}
                >
                  <option value="">-- Select Exam Coordinator --</option>
                  {users.map((u) => (
                    <option key={u.id} value={getUserDisplayName(u)}>
                      {getUserDisplayName(u)} ({getUserPost(u)})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Lead faculty member responsible for overall seating & timetable planning.
                </span>
              </div>

              {/* Chief Superintendent / Admin Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chief Superintendent / Controller
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  value={watch('adminName') || ''}
                  onChange={(e) => {
                    const selName = e.target.value;
                    const matched = users.find((u) => getUserDisplayName(u) === selName || u.name === selName);
                    setValue('adminName', selName, { shouldValidate: true, shouldDirty: true });
                    setValue('adminId', matched?.id || '', { shouldValidate: true, shouldDirty: true });
                  }}
                >
                  <option value="">-- Select Chief Superintendent / Controller --</option>
                  {users.map((u) => (
                    <option key={u.id} value={getUserDisplayName(u)}>
                      {getUserDisplayName(u)} ({getUserPost(u)})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Official signing off on attendance and final institutional reports.
                </span>
              </div>
            </div>

            {/* Multiple Invigilators Selection */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-800">
                      Examination Invigilators ({selectedInvigilatorNames.length} Selected)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select multiple invigilators for this examination. These will be assignable to specific classrooms.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddInvigInline(!showAddInvigInline)}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                  + Add New Invigilator
                </Button>
              </div>

              {/* Inline Add Invigilator Form */}
              {showAddInvigInline && (
                <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-xs space-y-2 animate-in fade-in duration-100">
                  <p className="text-xs font-semibold text-indigo-900">Add & Assign New Faculty Invigilator</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Faculty Full Name (e.g. Dr. Robert Chen)"
                      value={newInvigName}
                      onChange={(e) => setNewInvigName(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Department (e.g. Mechanical Engg)"
                      value={newInvigDept}
                      onChange={(e) => setNewInvigDept(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddInvigInline(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!newInvigName.trim()) return;
                        const addedUser = addUser({
                          name: newInvigName.trim(),
                          post: 'Hall Invigilator',
                          role: 'invigilator',
                          department: newInvigDept.trim() || 'Academic Affairs',
                        });
                        const displayName = getUserDisplayName(addedUser);
                        const currentList = watch('invigilatorNames') || [];
                        const currentIds = watch('invigilatorIds') || [];
                        setValue('invigilatorNames', [...currentList, displayName], {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setValue('invigilatorIds', [...currentIds, addedUser.id], {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setNewInvigName('');
                        setNewInvigDept('');
                        setShowAddInvigInline(false);
                      }}
                      disabled={!newInvigName.trim()}
                      className="text-xs"
                    >
                      Add & Select Invigilator
                    </Button>
                  </div>
                </div>
              )}

              {/* Invigilators Choice Pills / Checkboxes */}
              {users.length === 0 ? (
                <div className="text-center py-4 bg-white rounded-lg border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">No invigilators or faculty registered yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click "+ Add New Invigilator" above to add faculty members for this exam.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {users.map((u) => {
                    const name = getUserDisplayName(u);
                    const isChecked = selectedInvigilatorNames.includes(name);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const currentList = watch('invigilatorNames') || [];
                            const currentIds = watch('invigilatorIds') || [];
                            if (currentList.includes(name)) {
                              setValue(
                                'invigilatorNames',
                                currentList.filter((n) => n !== name),
                                { shouldValidate: true, shouldDirty: true }
                              );
                              setValue(
                                'invigilatorIds',
                                currentIds.filter((id) => id !== u.id),
                                { shouldValidate: true, shouldDirty: true }
                              );
                            } else {
                              setValue('invigilatorNames', [...currentList, name], {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                              setValue('invigilatorIds', [...currentIds, u.id], {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }
                          }}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">{name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate mt-0.5">
                            <span className="font-medium text-emerald-700">{getUserPost(u)}</span>
                            {u.department && <span>• {u.department}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
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
