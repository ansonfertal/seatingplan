import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Classroom } from '../../models/classroom';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { calculateUsableCapacityForClassroom } from '../../utils/capacityCalculator';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getUserDisplayName } from '../../models/user';
import { Users, UserCheck, Plus, Minus, X, SlidersHorizontal, LayoutGrid } from 'lucide-react';

const classroomSchema = z
  .object({
    name: z.string().min(1, 'Room name/number is required'),
    rows: z.number().min(1, 'At least 1 row required'),
    columns: z.number().min(1, 'At least 1 column required'),
    columnRows: z.array(z.number().min(1)).optional().default([]),
    studentsPerBench: z.number().min(1, 'Min 1 student').max(10, 'Max 10 students per bench'),
    maxCapacity: z.number().int().positive().optional().nullable(),
    roomOrder: z.number().int().min(1).optional().nullable(),
    active: z.boolean().default(true),
    displayColumns: z.array(z.enum(['rollNo', 'name', 'branch', 'semester'])).default(['rollNo', 'name', 'branch', 'semester']),
  })
  .superRefine((data, ctx) => {
    const totalBenches =
      data.columnRows && data.columnRows.length === data.columns
        ? data.columnRows.reduce((a, b) => a + b, 0)
        : data.rows * data.columns;
    const totalSlots = totalBenches * data.studentsPerBench;
    if (data.maxCapacity != null && data.maxCapacity > totalSlots) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Configured maximum capacity (${data.maxCapacity}) cannot exceed physical capacity (${totalSlots})`,
        path: ['maxCapacity'],
      });
    }
  });

type ClassroomFormData = z.infer<typeof classroomSchema>;

interface ClassroomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classroom: Classroom) => void;
  initialData?: Classroom;
}

export const ClassroomFormModal: React.FC<ClassroomFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { users } = useAuthStore();
  const exam = useAppStore((state) => state.exam);
  const [selectedInvigilators, setSelectedInvigilators] = useState<string[]>([]);
  const [customInvigName, setCustomInvigName] = useState('');
  const [isCustomColumns, setIsCustomColumns] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<ClassroomFormData>({
    resolver: zodResolver(classroomSchema) as any,
    defaultValues: {
      name: '',
      rows: 5,
      columns: 5,
      columnRows: [5, 5, 5, 5, 5],
      studentsPerBench: 2,
      maxCapacity: undefined,
      roomOrder: 1,
      active: true,
      displayColumns: ['rollNo', 'name', 'branch', 'semester'],
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedInvigilators(initialData?.invigilators || []);
      setCustomInvigName('');
      if (initialData) {
        const uniformRows = initialData.rows;
        const normalizedColumnRows = Array.from(
          { length: initialData.columns },
          (_, i) => initialData.columnRows?.[i] ?? uniformRows
        );
        const hasVaryingColumnRows = normalizedColumnRows.some((r) => r !== normalizedColumnRows[0]);
        setIsCustomColumns(hasVaryingColumnRows);

        reset({
          name: initialData.name,
          rows: initialData.rows,
          columns: initialData.columns,
          columnRows: normalizedColumnRows,
          studentsPerBench: initialData.studentsPerBench ?? 2,
          maxCapacity: initialData.maxCapacity ?? undefined,
          roomOrder: initialData.roomOrder ?? 1,
          active: initialData.active ?? true,
          displayColumns: initialData.displayColumns ?? ['rollNo', 'name', 'branch', 'semester'],
        });
      } else {
        setIsCustomColumns(false);
        reset({
          name: '',
          rows: 5,
          columns: 5,
          columnRows: [5, 5, 5, 5, 5],
          studentsPerBench: 2,
          maxCapacity: undefined,
          roomOrder: 1,
          active: true,
          displayColumns: ['rollNo', 'name', 'branch', 'semester'],
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const formValues = watch();
  const rows = formValues.rows || 1;
  const columns = formValues.columns || 1;
  const studentsPerBench = formValues.studentsPerBench || 2;
  const maxCapacity = formValues.maxCapacity;

  // Normalized current columnRows matching current column count
  const currentColumnRows: number[] = React.useMemo(() => {
    return Array.from({ length: columns }, (_, i) => {
      const val = formValues.columnRows?.[i];
      return typeof val === 'number' && val > 0 ? val : rows;
    });
  }, [columns, formValues.columnRows, rows]);

  // Handle rows change to sync columnRows when in uniform mode
  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRowCount = parseInt(e.target.value, 10);
    if (!isNaN(newRowCount) && newRowCount > 0) {
      setValue('rows', newRowCount, { shouldValidate: true });
      if (!isCustomColumns) {
        const nextColumnRows = Array.from({ length: columns }, () => newRowCount);
        setValue('columnRows', nextColumnRows, { shouldValidate: true });
      }
    }
  };

  // Handle columns change to sync columnRows length
  const handleColumnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColCount = parseInt(e.target.value, 10);
    if (!isNaN(newColCount) && newColCount > 0) {
      setValue('columns', newColCount, { shouldValidate: true });
      const current = formValues.columnRows || [];
      const nextColumnRows = Array.from({ length: newColCount }, (_, i) => {
        return current[i] != null && current[i] > 0 ? current[i] : rows;
      });
      setValue('columnRows', nextColumnRows, { shouldValidate: true });
    }
  };

  // Handle individual column row count change
  const handleColumnRowChange = (colIdx: number, newRowCount: number) => {
    const safeCount = Math.max(1, newRowCount);
    const nextColumnRows = [...currentColumnRows];
    nextColumnRows[colIdx] = safeCount;
    const nextMaxRows = Math.max(...nextColumnRows, 1);

    setValue('columnRows', nextColumnRows, { shouldValidate: true });
    setValue('rows', nextMaxRows, { shouldValidate: true });
  };

  // Handle toggling layout mode between Uniform and Flexible / Custom
  const handleToggleLayoutMode = (custom: boolean) => {
    setIsCustomColumns(custom);
    if (!custom) {
      // Revert all columns to uniform rows
      const uniformVal = rows > 0 ? rows : 5;
      const nextColumnRows = Array.from({ length: columns }, () => uniformVal);
      setValue('columnRows', nextColumnRows, { shouldValidate: true });
      setValue('rows', uniformVal, { shouldValidate: true });
    } else {
      // When entering custom mode, ensure columnRows has current length
      const nextColumnRows = Array.from({ length: columns }, (_, i) => currentColumnRows[i] ?? rows);
      setValue('columnRows', nextColumnRows, { shouldValidate: true });
    }
  };

  // Apply a single bench count to all columns while in custom mode
  const handleApplyToAllColumns = (count: number) => {
    const safeCount = Math.max(1, count);
    const nextColumnRows = Array.from({ length: columns }, () => safeCount);
    setValue('columnRows', nextColumnRows, { shouldValidate: true });
    setValue('rows', safeCount, { shouldValidate: true });
  };

  const disabledSeats = initialData?.disabledSeats || [];
  const totalBenches = currentColumnRows.reduce((sum, r) => sum + r, 0);
  const physicalEffective = calculateUsableCapacityForClassroom(rows, columns, studentsPerBench, disabledSeats, currentColumnRows);
  const finalEffective = maxCapacity != null && maxCapacity > 0 ? Math.min(maxCapacity, physicalEffective) : physicalEffective;
  const theoreticalCapacity = totalBenches * studentsPerBench;

  const onSubmit = (data: ClassroomFormData) => {
    const effectiveColumns = data.columns;
    const normalizedColumnRows = Array.from(
      { length: effectiveColumns },
      (_, i) => (data.columnRows?.[i] != null && data.columnRows[i] > 0 ? data.columnRows[i] : data.rows)
    );
    const maxRows = Math.max(...normalizedColumnRows, 1);

    const cleanedDisabledSeats = (initialData?.disabledSeats || []).filter(
      (s) => s.column < effectiveColumns && s.row < (normalizedColumnRows[s.column] ?? maxRows)
    );
    const cleanedBlockedBenches = (initialData?.blockedBenches || []).filter(
      (b) => b.column < effectiveColumns && b.row < (normalizedColumnRows[b.column] ?? maxRows)
    );

    const physicalEffective = calculateUsableCapacityForClassroom(
      maxRows,
      effectiveColumns,
      data.studentsPerBench,
      cleanedDisabledSeats,
      normalizedColumnRows
    );
    const usableCapacity =
      data.maxCapacity != null && data.maxCapacity > 0
        ? Math.min(data.maxCapacity, physicalEffective)
        : physicalEffective;

    const classroom: Classroom = {
      id: initialData?.id || crypto.randomUUID(),
      name: data.name,
      rows: maxRows,
      columns: effectiveColumns,
      columnRows: normalizedColumnRows,
      studentsPerBench: data.studentsPerBench,
      maxCapacity: data.maxCapacity ?? undefined,
      roomOrder: data.roomOrder ?? 1,
      active: data.active ?? true,
      displayColumns: data.displayColumns,
      disabledSeats: cleanedDisabledSeats,
      blockedBenches: cleanedBlockedBenches,
      usableCapacity,
      invigilators: selectedInvigilators,
    };
    onSave(classroom);
    onClose();
  };

  // Gather available invigilator options from exam details and authStore users
  const availableInvigilatorNames = React.useMemo(() => {
    const set = new Set<string>();
    if (exam?.invigilatorNames) {
      exam.invigilatorNames.forEach((n) => set.add(n));
    }
    users.forEach((u) => {
      set.add(getUserDisplayName(u));
    });
    selectedInvigilators.forEach((n) => set.add(n));
    return Array.from(set).filter((n) => n && n !== 'Unassigned');
  }, [exam?.invigilatorNames, users, selectedInvigilators]);

  const handleToggleRoomInvigilator = (name: string) => {
    if (selectedInvigilators.includes(name)) {
      setSelectedInvigilators(selectedInvigilators.filter((n) => n !== name));
    } else {
      setSelectedInvigilators([...selectedInvigilators, name]);
    }
  };

  const handleAddCustomInvigilator = () => {
    const trimmed = customInvigName.trim();
    if (!trimmed) return;
    if (!selectedInvigilators.includes(trimmed)) {
      setSelectedInvigilators([...selectedInvigilators, trimmed]);
    }
    setCustomInvigName('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Configure Examination Room' : 'Add Examination Room'}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={!isValid}>
            {initialData ? 'Save Room Settings' : 'Add Room to Exam'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Room Identifier / Hall Name *"
              placeholder="e.g. B301, Main Auditorium"
              {...register('name')}
              error={errors.name?.message}
            />
          </div>

          <Input
            label="Filling Order Sequence"
            type="number"
            min="1"
            placeholder="e.g. 1"
            {...register('roomOrder', { valueAsNumber: true })}
            error={errors.roomOrder?.message}
          />
        </div>

        {/* Bench Dimensions & Occupancy */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Physical Bench Grid Dimensions (PRD Section 4.3)
            </div>

            {/* Layout Mode Switch: Uniform vs Flexible per Column */}
            <div className="inline-flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs" role="tablist">
              <button
                type="button"
                onClick={() => handleToggleLayoutMode(false)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  !isCustomColumns
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="All columns contain the exact same number of bench rows"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Uniform Grid
              </button>
              <button
                type="button"
                onClick={() => handleToggleLayoutMode(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  isCustomColumns
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Customize bench row count for each individual column (e.g. Col 1: 4 benches, Col 2: 8 benches)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Flexible / Custom Benches per Column
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Number of Columns *
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 5"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                {...register('columns', { valueAsNumber: true, onChange: handleColumnsChange })}
              />
              {errors.columns?.message && (
                <p className="mt-1 text-xs text-red-600">{errors.columns.message}</p>
              )}
            </div>

            {!isCustomColumns ? (
              <Input
                label="Number of Rows (All Columns) *"
                type="number"
                min="1"
                placeholder="e.g. 6"
                {...register('rows', { valueAsNumber: true, onChange: handleRowsChange })}
                error={errors.rows?.message}
              />
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Max Row Depth
                </label>
                <div className="flex h-10 w-full items-center rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {rows} rows max
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Auto-calculated from highest column
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Students Per Bench *
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs font-medium"
                {...register('studentsPerBench', { valueAsNumber: true })}
              >
                <option value={1}>1 Student per Bench (Single)</option>
                <option value={2}>2 Students per Bench (Standard Pair)</option>
                <option value={3}>3 Students per Bench (Triple Bench)</option>
                <option value={4}>4 Students per Bench</option>
              </select>
              {errors.studentsPerBench?.message && (
                <p className="mt-1 text-xs text-red-600">{errors.studentsPerBench.message}</p>
              )}
            </div>
          </div>

          {/* Flexible Column Rows Configuration Panel */}
          {isCustomColumns && (
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">
                    Individual Column Bench Row Settings
                  </span>
                  <span className="text-[11px] text-indigo-700">
                    Set the exact number of benches for each column independently.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Quick set all:</span>
                  {[4, 5, 6, 8, 10].map((preset) => (
                    <button
                      key={`preset-${preset}`}
                      type="button"
                      onClick={() => handleApplyToAllColumns(preset)}
                      className="px-2 py-0.5 text-[11px] rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-indigo-400 transition-colors font-medium shadow-2xs"
                      title={`Set all ${columns} columns to ${preset} benches`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Cards Grid */}
              <div
                className="grid gap-2.5 pt-1"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(130px, 1fr))`,
                }}
              >
                {currentColumnRows.map((count, cIdx) => (
                  <div
                    key={`col-config-${cIdx}`}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-1.5 focus-within:border-indigo-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Column {cIdx + 1}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                        {count * studentsPerBench}s
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleColumnRowChange(cIdx, count - 1)}
                        disabled={count <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors"
                        title="Decrease rows"
                        aria-label={`Decrease benches for Column ${cIdx + 1}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={count}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            handleColumnRowChange(cIdx, val);
                          }
                        }}
                        className="w-full text-center h-7 text-xs font-bold border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        aria-label={`Number of benches for Column ${cIdx + 1}`}
                      />

                      <button
                        type="button"
                        onClick={() => handleColumnRowChange(cIdx, count + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold transition-colors"
                        title="Increase rows"
                        aria-label={`Increase benches for Column ${cIdx + 1}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400 text-center">
                      {count} {count === 1 ? 'bench' : 'benches'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100 text-[11px] text-indigo-900 font-medium">
                <span>
                  Total Physical Benches: <strong>{totalBenches}</strong> ({currentColumnRows.join(' + ')})
                </span>
                <span>
                  Row depth range: <strong>{Math.min(...currentColumnRows)}</strong> to <strong>{Math.max(...currentColumnRows)}</strong> rows
                </span>
              </div>
            </div>
          )}

          {/* Configured Max Capacity rule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <Input
                label="Configured Maximum Capacity (Optional)"
                type="number"
                min="1"
                placeholder={`Max limit (<= ${physicalEffective})`}
                {...register('maxCapacity', {
                  setValueAs: (v) => (v === '' || isNaN(v) ? undefined : parseInt(v, 10)),
                })}
                error={errors.maxCapacity?.message}
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                PRD Rule: May be lower than physical capacity, but never higher.
              </span>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  {...register('active')}
                />
                <span className="font-medium">Active Room for Examination</span>
              </label>
            </div>
          </div>

          {/* Assigned Invigilators for this Room */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Assigned Invigilators ({selectedInvigilators.length} Selected)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Select 1 or more invigilators to supervise this room
              </span>
            </div>

            {/* Currently Assigned Badges */}
            {selectedInvigilators.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-slate-200">
                {selectedInvigilators.map((name, idx) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Invigilator {idx + 1}: {name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRoomInvigilator(name)}
                      className="text-emerald-500 hover:text-red-600 ml-0.5"
                      title={`Remove ${name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Selectable Invigilator Chips */}
            {availableInvigilatorNames.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
                  Select from examination invigilators / faculty:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableInvigilatorNames.map((name) => {
                    const isAssigned = selectedInvigilators.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleToggleRoomInvigilator(name)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                          isAssigned
                            ? 'bg-emerald-600 text-white border-emerald-600 font-medium shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isAssigned && <UserCheck className="w-3 h-3" />}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Add Custom Invigilator input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Or type invigilator name to assign..."
                value={customInvigName}
                onChange={(e) => setCustomInvigName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomInvigilator();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCustomInvigilator}
                disabled={!customInvigName.trim()}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Assign to Room
              </Button>
            </div>
          </div>
        </div>

        {/* Capacity Breakdown Card */}
        <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-indigo-950">Capacity Breakdown</h4>
            <p className="text-xs text-indigo-700 mt-0.5">
              Total Benches: {totalBenches} ({columns} cols) • Theoretical: {theoreticalCapacity} seats • Disabled Seats: {disabledSeats.length}
            </p>
            {isCustomColumns && (
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                Column Bench Breakdown: {currentColumnRows.map((cnt, i) => `Col ${i + 1}: ${cnt} benches`).join(' • ')}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs text-indigo-500 uppercase font-semibold block">Effective Usable Capacity</span>
            <span className="text-3xl font-black text-indigo-700">{finalEffective}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
};
