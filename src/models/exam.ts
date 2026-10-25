import { z } from 'zod';

export type ExamStatus = 'draft' | 'active' | 'archived';
export type ExamSession = 'FN' | 'AN';

const sessionValueSchema = z.union([
  z.enum(['FN', 'AN']),
  z.enum(['Forenoon', 'Afternoon']).transform((val) => (val === 'Forenoon' ? 'FN' : 'AN')),
]);

/**
 * Validates that end time is chronologically after start time,
 * unless overnight exams are explicitly enabled.
 */
export function validateExamTimes(
  startTime?: string,
  endTime?: string,
  isOvernight = false
): { isValid: boolean; error?: string } {
  if (!startTime || !endTime) {
    return { isValid: true };
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(startTime)) {
    return { isValid: false, error: 'Start time must be in HH:mm (24-hour) format' };
  }
  if (!timeRegex.test(endTime)) {
    return { isValid: false, error: 'End time must be in HH:mm (24-hour) format' };
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  if (startTotal === endTotal) {
    return { isValid: false, error: 'End time cannot be the same as start time' };
  }

  if (!isOvernight && endTotal < startTotal) {
    return {
      isValid: false,
      error: 'End time must be after start time (enable "Overnight exam" if the session spans midnight)',
    };
  }

  return { isValid: true };
}

/**
 * Calculates duration in minutes from start and end times.
 */
export function calculateDurationMinutes(
  startTime?: string,
  endTime?: string,
  isOvernight = false
): number | null {
  if (!startTime || !endTime) return null;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;

  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;

  if (isOvernight && endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  return Math.max(0, endTotal - startTotal);
}

/**
 * Calculates end time string from start time and duration in minutes.
 */
export function calculateEndTimeFromDuration(
  startTime?: string,
  durationMinutes?: number
): string | null {
  if (!startTime || durationMinutes == null || durationMinutes <= 0) return null;
  const [startH, startM] = startTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM)) return null;

  const totalM = (startH * 60 + startM + durationMinutes) % (24 * 60);
  const endH = Math.floor(totalM / 60);
  const endM = totalM % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export const examDetailsSchema = z
  .object({
    id: z.string().optional(),
    examName: z.string().min(1, 'Exam name is required'),
    name: z.string().optional(),
    examDate: z.string().min(1, 'Exam date is required'),
    date: z.string().optional(),
    session: sessionValueSchema,
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    isOvernight: z.boolean().default(false),
    timezone: z.string().default('Asia/Kolkata'),
    academicYear: z.string().optional(),
    semester: z.string().optional(),
    selectedSemesters: z.array(z.string()).default([]),
    selectedSubjectCodes: z.array(z.string()).default([]),
    institutionName: z.string().default('ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY'),
    institutionDepartment: z.string().optional(),
    institutionLocation: z.string().default('KALAMASSERY'),
    examCode: z.string().optional(),
    documentCode: z.string().default('AISAT/Form/QPM17/F4'),
    status: z.enum(['draft', 'active', 'archived']).default('draft'),
    coordinatorId: z.string().optional(),
    coordinatorName: z.string().optional(),
    adminId: z.string().optional(),
    adminName: z.string().optional(),
    invigilatorIds: z.array(z.string()).default([]),
    invigilatorNames: z.array(z.string()).default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime) {
      const validation = validateExamTimes(data.startTime, data.endTime, data.isOvernight);
      if (!validation.isValid && validation.error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validation.error,
          path: ['endTime'],
        });
      }
    }
  });

export type ExamDetails = z.infer<typeof examDetailsSchema>;

/**
 * Standard Exam entity as specified in PRD Section 5.
 */
export type Exam = ExamDetails & {
  id: string;
  name: string;
  date: string;
  status: ExamStatus;
};

/**
 * Factory to create a new clean Exam entity with sane defaults.
 */
export function createNewExam(overrides: Partial<ExamDetails> = {}): Exam {
  const now = new Date().toISOString();
  const id = overrides.id || `exam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const examName = overrides.name || overrides.examName || '';
  const examDate = overrides.date || overrides.examDate || new Date().toISOString().split('T')[0];

  return {
    id,
    name: examName,
    examName,
    date: examDate,
    examDate,
    session: overrides.session || 'FN',
    startTime: overrides.startTime || '09:30',
    endTime: overrides.endTime || '12:30',
    durationMinutes: overrides.durationMinutes || 180,
    isOvernight: overrides.isOvernight || false,
    timezone: overrides.timezone || 'Asia/Kolkata',
    academicYear: overrides.academicYear || '',
    semester: overrides.semester || '',
    selectedSemesters: overrides.selectedSemesters || [],
    selectedSubjectCodes: overrides.selectedSubjectCodes || [],
    institutionName: overrides.institutionName || 'ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY',
    institutionDepartment: overrides.institutionDepartment || 'Department of Computer Science & Engineering',
    institutionLocation: overrides.institutionLocation || 'KALAMASSERY',
    examCode: overrides.examCode || '',
    documentCode: overrides.documentCode || 'AISAT/Form/QPM17/F4',
    status: overrides.status || 'draft',
    coordinatorId: overrides.coordinatorId || '',
    coordinatorName: overrides.coordinatorName || '',
    adminId: overrides.adminId || '',
    adminName: overrides.adminName || '',
    invigilatorIds: overrides.invigilatorIds || [],
    invigilatorNames: overrides.invigilatorNames || [],
    createdAt: overrides.createdAt || now,
    updatedAt: now,
  };
}
