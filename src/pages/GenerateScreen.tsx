import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { validateSeatingCapacity } from '../algorithms/capacityValidator';
import { runGenerationPipeline } from '../algorithms/generatorWorker';
import { createSeedFromString } from '../algorithms/random';
import { GenerationProgress } from '../components/generate/GenerationProgress';
import { ReadinessCard } from '../components/generate/ReadinessCard';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';

export const GenerateScreen: React.FC = () => {
  const navigate = useNavigate();
  const { exam, classrooms, students, rules, setArrangement, setValidation } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ stage: 'Ready to begin', percent: 0 });

  const capacity = useMemo(
    () => validateSeatingCapacity(classrooms, students),
    [classrooms, students]
  );

  const blockingIssues: string[] = [];
  if (!exam?.examName) blockingIssues.push('Exam name is missing.');
  if (!exam?.examDate) blockingIssues.push('Exam date is missing.');
  if (classrooms.length === 0) blockingIssues.push('No active classrooms have been configured.');
  if (students.length === 0) blockingIssues.push('No students are available to seat.');

  const duplicateRegisterNumbers = new Set<string>();
  const duplicates = new Set<string>();
  students.forEach((student) => {
    const key = student.registerNumber.trim().toLowerCase();
    if (!key) return;
    if (duplicateRegisterNumbers.has(key)) {
      duplicates.add(key);
    }
    duplicateRegisterNumbers.add(key);
  });

  if (duplicates.size > 0) {
    blockingIssues.push('Duplicate student register numbers were found.');
  }

  if (capacity.status === 'INSUFFICIENT') {
    blockingIssues.push(`Seating capacity is insufficient by ${capacity.shortageCount} student(s).`);
  }

  const warnings: string[] = [];
  if (Object.values(rules).every((rule) => !rule)) {
    warnings.push('No seating constraints are enabled; the arrangement may have more branch conflicts.');
  }
  if (students.length > 0 && capacity.totalAvailableSeats > 0) {
    const unusedPercentage = Math.round(((capacity.totalAvailableSeats - students.length) / capacity.totalAvailableSeats) * 100);
    if (unusedPercentage > 25) {
      warnings.push(`Unused capacity is high at ${unusedPercentage}% of total seats.`);
    }
  }

  const canGenerate = blockingIssues.length === 0;

  const handleGenerate = async () => {
    if (!canGenerate || !exam) {
      return;
    }

    setIsGenerating(true);
    setProgress({ stage: 'Distributing students across classrooms...', percent: 10 });

    try {
      const seed = `${exam.examName}-${exam.examDate}-${exam.session}`;
      const { assignments, validation } = await runGenerationPipeline({
        students,
        classrooms,
        rules,
        seed,
        onProgress: (next) => setProgress(next),
      });

      setArrangement({
        exam,
        classrooms,
        assignments,
        generatedAt: new Date().toISOString(),
        generationSeed: createSeedFromString(seed),
        statistics: validation.summary,
      });
      setValidation(validation);
      navigate('/review');
    } catch (error) {
      console.error('Seating generation failed:', error);
      setProgress({ stage: 'Generation failed. Please try again.', percent: 0 });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 5</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Generation Readiness</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/rules')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Rules
        </Button>
      </div>

      <ReadinessCard ready={canGenerate} capacity={capacity} warnings={warnings} />

      {blockingIssues.length > 0 && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader className="bg-red-50">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-700">Blocking issues</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-red-800">
              {blockingIssues.map((issue) => (
                <li key={issue} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!blockingIssues.length && (
        <Card className="mt-6 border-emerald-200 bg-emerald-50">
          <CardHeader className="bg-emerald-50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-emerald-700">Ready to generate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-800">
              The exam data, classrooms, students, and seating capacity all satisfy the generation prerequisites.
            </p>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <GenerationProgress
          stage={progress.stage}
          percent={progress.percent}
          onCancel={() => setIsGenerating(false)}
        />
      )}

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          isLoading={isGenerating}
          className="flex items-center gap-2"
        >
          {isGenerating ? 'Generating...' : 'Generate Seating Arrangement'}
        </Button>
      </div>
    </div>
  );
};
