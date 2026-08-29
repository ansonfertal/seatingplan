import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Classroom } from '../../models/classroom';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { calculateUsableCapacity } from '../../utils/capacityCalculator';

const classroomSchema = z.object({
  name: z.string().min(1, 'Classroom name is required'),
  rows: z.number().min(1, 'At least 1 row required').max(20, 'Max 20 rows'),
  columns: z.number().min(1, 'At least 1 column required').max(20, 'Max 20 columns'),
  studentsPerBench: z.number().min(1).max(2),
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
    reset,
    formState: { errors, isValid },
  } = useForm<ClassroomFormData>({
    resolver: zodResolver(classroomSchema),
    defaultValues: {
      name: '',
      rows: 5,
      columns: 5,
      studentsPerBench: 1,
    },
    mode: 'onChange',
  });

  // Reset form when opened with new data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          rows: initialData.rows,
          columns: initialData.columns,
          studentsPerBench: initialData.studentsPerBench,
        });
      } else {
        reset({
          name: '',
          rows: 5,
          columns: 5,
          studentsPerBench: 1,
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const formValues = watch();
  const rows = formValues.rows || 0;
  const columns = formValues.columns || 0;
  const studentsPerBench = formValues.studentsPerBench || 1;
  
  // Calculate preview capacity
  const disabledSeats = initialData?.disabledSeats || [];
  const previewCapacity = calculateUsableCapacity(rows, columns, studentsPerBench, disabledSeats);

  const onSubmit = (data: ClassroomFormData) => {
    const classroom: Classroom = {
      id: initialData?.id || crypto.randomUUID(),
      name: data.name,
      rows: data.rows,
      columns: data.columns,
      studentsPerBench: data.studentsPerBench,
      disabledSeats: initialData?.disabledSeats || [],
      usableCapacity: calculateUsableCapacity(data.rows, data.columns, data.studentsPerBench, initialData?.disabledSeats || []),
    };
    onSave(classroom);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Classroom' : 'Add New Classroom'}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={!isValid}>
            {initialData ? 'Save Changes' : 'Add Classroom'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        <Input
          label="Classroom Name"
          placeholder="e.g. B301"
          {...register('name')}
          error={errors.name?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Number of Rows"
            type="number"
            {...register('rows', { valueAsNumber: true })}
            error={errors.rows?.message}
          />
          <Input
            label="Number of Columns"
            type="number"
            {...register('columns', { valueAsNumber: true })}
            error={errors.columns?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Students Per Bench
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            {...register('studentsPerBench', { valueAsNumber: true })}
          >
            <option value={1}>1 Student</option>
            <option value={2}>2 Students</option>
          </select>
          {errors.studentsPerBench?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.studentsPerBench.message}</p>
          )}
        </div>

        <div className="mt-6 bg-indigo-50 rounded-lg p-4 flex items-center justify-between border border-indigo-100">
          <div>
            <h4 className="text-sm font-semibold text-indigo-900">Preview Capacity</h4>
            <p className="text-xs text-indigo-700 mt-1">Calculated based on dimensions.</p>
          </div>
          <div className="text-3xl font-bold text-indigo-600">
            {previewCapacity > 0 ? previewCapacity : 0}
          </div>
        </div>
      </form>
    </Modal>
  );
};
