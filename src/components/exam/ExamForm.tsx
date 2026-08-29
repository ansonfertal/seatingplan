import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import type { ExamDetails } from '../../models/exam';
import { examDetailsSchema } from '../../models/exam';
import { useAppStore } from '../../store/appStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

export const ExamForm: React.FC = () => {
  const navigate = useNavigate();
  const { exam, setExamDetails } = useAppStore();

  const defaultExamValues: ExamDetails = {
    examName: '',
    examDate: '',
    session: 'FN',
    startTime: '',
    endTime: '',
    academicYear: '',
    semester: '',
    institutionName: 'ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY',
    institutionLocation: 'KALAMASSERY',
    examCode: '',
    documentCode: 'AISAT/Form/QPM17/F4',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ExamDetails>({
    resolver: zodResolver(examDetailsSchema) as any,
    defaultValues: exam || defaultExamValues,
    mode: 'onChange',
  });

  const onSubmit = (data: ExamDetails) => {
    setExamDetails(data);
    navigate('/classrooms');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Examination Details</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Enter the basic metadata for the examination session.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label="Examination Name *"
              placeholder="e.g. B.Tech S5 Internal Examination"
              {...register('examName')}
              error={errors.examName?.message}
            />

            <Input
              label="Examination Date *"
              type="date"
              {...register('examDate')}
              error={errors.examDate?.message}
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session *
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-invalid={Boolean(errors.session)}
                {...register('session')}
              >
                <option value="FN">FN</option>
                <option value="AN">AN</option>
              </select>
              {errors.session?.message && (
                <p className="mt-1 text-sm text-red-600">{errors.session.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                {...register('startTime')}
                error={errors.startTime?.message}
              />
              <Input
                label="End Time"
                type="time"
                {...register('endTime')}
                error={errors.endTime?.message}
              />
            </div>

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

            <Input
              label="Institution Name"
              {...register('institutionName')}
              error={errors.institutionName?.message}
            />

            <Input
              label="Institution Location"
              {...register('institutionLocation')}
              error={errors.institutionLocation?.message}
            />

            <Input
              label="Examination Code"
              {...register('examCode')}
              error={errors.examCode?.message}
            />

            <Input
              label="Document Code"
              {...register('documentCode')}
              error={errors.documentCode?.message}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid} aria-label="Save and continue to classrooms">
            Save & Continue
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
