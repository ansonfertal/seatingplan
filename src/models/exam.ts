import { z } from 'zod';

const sessionValueSchema = z.union([
  z.enum(['FN', 'AN']),
  z.enum(['Forenoon', 'Afternoon']).transform((value) => (value === 'Forenoon' ? 'FN' : 'AN')),
]);

export const examDetailsSchema = z.object({
  examName: z.string().min(1, 'Exam name is required'),
  examDate: z.string().min(1, 'Exam date is required'),
  session: sessionValueSchema,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  institutionName: z.string().default('ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY'),
  institutionLocation: z.string().default('KALAMASSERY'),
  examCode: z.string().optional(),
  documentCode: z.string().default('AISAT/Form/QPM17/F4'),
});

export type ExamDetails = z.infer<typeof examDetailsSchema>;
