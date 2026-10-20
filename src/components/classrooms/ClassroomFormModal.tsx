import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Classroom } from '../../models/classroom';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { calculateUsableCapacityForClassroom } from '../../utils/capacityCalculator';

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
    const totalSlots = data.rows * data.columns * data.studentsPerBench;
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
      if (initialData) {
        const uniformRows = initialData.rows;
        const normalizedColumnRows = Array.from(
          { length: initialData.columns },
          (_, i) => initialData.columnRows?.[i] ?? uniformRows
        );
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
  const rows = formValues.rows || 0;
  const columns = formValues.columns || 0;
  const studentsPerBench = formValues.studentsPerBench || 2;
  const maxCapacity = formValues.maxCapacity;

  // Handle rows change to sync columnRows
  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRowCount = parseInt(e.target.value, 10);
    if (!isNaN(newRowCount) && newRowCount > 0) {
      const colCount = watch('columns') || formValues.columns || 1;
      const nextColumnRows = Array.from({ length: colCount }, () => newRowCount);
      setValue('columnRows', nextColumnRows, { shouldValidate: true });
    }
  };

  // Handle columns change to sync columnRows
  const handleColumnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColCount = parseInt(e.target.value, 10);
    if (!isNaN(newColCount) && newColCount > 0) {
      const currentRows = watch('rows') || formValues.rows || 5;
      const nextColumnRows = Array.from({ length: newColCount }, () => currentRows);
      setValue('columnRows', nextColumnRows, { shouldValidate: true });
    }
  };

  const disabledSeats = initialData?.disabledSeats || [];
  const columnRows = Array.from({ length: columns || 1 }, () => rows);
  const physicalEffective = calculateUsableCapacityForClassroom(rows, columns, studentsPerBench, disabledSeats, columnRows);
  const finalEffective = maxCapacity != null && maxCapacity > 0 ? Math.min(maxCapacity, physicalEffective) : physicalEffective;
  const theoreticalCapacity = rows * columns * studentsPerBench;

  const onSubmit = (data: ClassroomFormData) => {
    const effectiveRows = data.rows;
    const effectiveColumns = data.columns;
    const normalizedColumnRows = Array.from(
      { length: effectiveColumns },
      () => effectiveRows
    );

    const cleanedDisabledSeats = (initialData?.disabledSeats || []).filter(
      (s) => s.column < effectiveColumns && s.row < effectiveRows
    );
    const cleanedBlockedBenches = (initialData?.blockedBenches || []).filter(
      (b) => b.column < effectiveColumns && b.row < effectiveRows
    );

    const physicalEffective = calculateUsableCapacityForClassroom(
      effectiveRows,
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
      rows: effectiveRows,
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
    };
    onSave(classroom);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Configure Examination Room' : 'Add Examination Room'}
      maxWidth="lg"
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
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Physical Bench Grid Dimensions (PRD Section 4.3)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Number of Rows *"
              type="number"
              min="1"
              placeholder="e.g. 6"
              {...register('rows', { valueAsNumber: true, onChange: handleRowsChange })}
              error={errors.rows?.message}
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Number of Columns *
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 6"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                {...register('columns', { valueAsNumber: true, onChange: handleColumnsChange })}
              />
              {errors.columns?.message && (
                <p className="mt-1 text-xs text-red-600">{errors.columns.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Students Per Bench *
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-medium"
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
        </div>

        {/* Capacity Breakdown Card */}
        <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-indigo-950">Capacity Breakdown</h4>
            <p className="text-xs text-indigo-700 mt-0.5">
              Theoretical: {theoreticalCapacity} benches slots | Disabled Seats: {disabledSeats.length}
            </p>
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
