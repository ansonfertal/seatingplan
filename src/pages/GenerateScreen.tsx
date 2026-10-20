import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { validateSeatingCapacity } from '../algorithms/capacityValidator';
import { runGenerationPipeline } from '../algorithms/generatorWorker';
import type { RoomFillStrategy } from '../algorithms/roomAllocation';
import type { InfeasibilityReport } from '../algorithms/infeasibilityAnalyzer';
import type { RegisterNumberOrder } from '../models/arrangement';
import { GenerationProgress } from '../components/generate/GenerationProgress';
import { ReadinessCard } from '../components/generate/ReadinessCard';
import { InfeasibilityReportModal } from '../components/generate/InfeasibilityReportModal';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { selectExamStudents } from '../utils/examStudentSelector';

export const GenerateScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    exam,
    classrooms,
    students,
    rules,
    allocationVersions,
    setExamDetails,
    setRules,
    setArrangement,
    setValidation,
    createAllocationVersion,
  } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<RoomFillStrategy>('sequential');
  const [customSeed, setCustomSeed] = useState('');
  const [progress, setProgress] = useState({ stage: 'Ready to begin', percent: 0 });
  const [infeasibilityReport, setInfeasibilityReport] = useState<InfeasibilityReport | undefined>(undefined);
  const [isInfeasibilityModalOpen, setIsInfeasibilityModalOpen] = useState(false);

  const examStudents = exam ? selectExamStudents(students, exam) : students;
  const semesterOptions = [...new Set(students.map((s) => s.semester?.trim()).filter((v): v is string => Boolean(v)))].sort();
  const subjectCodeOptions = [...new Set(students.map((s) => s.subjectCode?.trim()).filter((v): v is string => Boolean(v)))].sort();

  const toggleExamSelection = (field: 'selectedSemesters' | 'selectedSubjectCodes', value: string) => {
    if (!exam) return;
    const currentValues = exam[field] ?? [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    setExamDetails({ ...exam, [field]: nextValues });
  };

  const capacity = useMemo(
    () => validateSeatingCapacity(classrooms, examStudents),
    [classrooms, examStudents]
  );

  const defaultSeed = exam ? `${exam.examName || 'exam'}-${exam.examDate || 'date'}-${exam.session || 'FN'}` : 'seating-seed-1';
  const effectiveSeed = customSeed.trim() || defaultSeed;

  const handleGenerate = async () => {
    if (!capacity.canAllocate || !exam) {
      return;
    }

    setIsGenerating(true);
    setProgress({ stage: 'Initiating constraint-aware allocation engine...', percent: 5 });

    try {
      const versionNumber = allocationVersions.length + 1;
      const versionId = `version-${versionNumber}-${Date.now()}`;

      const result = await runGenerationPipeline({
        students: examStudents,
        classrooms,
        rules,
        seed: effectiveSeed,
        strategy,
        registerNumberOrder: rules.registerNumberOrder ?? 'sorted',
        examDate: exam.examDate,
        minimizeClassroomsUsed: rules.minimizeClassroomsUsed ?? true,
        differentArrangementPerDate: rules.differentArrangementPerDate ?? true,
        versionId,
        onProgress: (p) => setProgress(p),
      });

      // Create snapshot entity in store conforming to PRD Section 5
      createAllocationVersion({
        id: versionId,
        examId: exam.id || `exam-${Date.now()}`,
        versionNumber,
        status: 'draft',
        algorithmVersion: result.algorithmVersion,
        seed: result.generationSeed,
        generatedAt: new Date().toISOString(),
        summary: result.statistics,
        validationReport: result.validation,
        assignments: result.assignments,
        unassignedCandidates: result.unassignedCandidates,
      });

      setArrangement({
        exam,
        classrooms,
        assignments: result.assignments,
        generatedAt: new Date().toISOString(),
        generationSeed: result.generationSeed,
        statistics: result.statistics,
      });

      setValidation(result.validation);

      if (result.infeasibilityReport && result.infeasibilityReport.unassignedCount > 0) {
        setInfeasibilityReport(result.infeasibilityReport);
        setIsInfeasibilityModalOpen(true);
      } else {
        navigate('/review');
      }
    } catch (error) {
      console.error('Seating generation failed:', error);
      setProgress({ stage: 'Generation failed. Please inspect constraints.', percent: 0 });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl py-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocation Engine & Readiness Gatekeeper</h1>
          <p className="text-sm text-slate-500">
            PRD Functional Requirement 4.5: Deterministic constraint satisfaction with independent post-allocation validation.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/rules')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Rules
        </Button>
      </div>

      {exam && (
        <div className="grid gap-4 md:grid-cols-2">
          <ExamValueSelector
            title="Semesters in this Exam Session"
            values={semesterOptions}
            selected={exam.selectedSemesters ?? []}
            emptyMessage="No semester tags found in candidate roster."
            onToggle={(value) => toggleExamSelection('selectedSemesters', value)}
          />
          <ExamValueSelector
            title="Subject / Paper Codes in this Exam Session"
            values={subjectCodeOptions}
            selected={exam.selectedSubjectCodes ?? []}
            emptyMessage="No subject code tags found in candidate roster."
            onToggle={(value) => toggleExamSelection('selectedSubjectCodes', value)}
          />
        </div>
      )}

      {/* Allocation Strategy & Seed Controls */}
      <Card className="border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50/30 via-white to-slate-50/30">
        <CardHeader className="pb-3 border-b border-indigo-100/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-700 font-bold">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base text-indigo-950 font-bold">Strategy & Reproducibility Controls (PRD Section 4.5)</CardTitle>
            </div>
            {exam?.examDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                Exam Date: <strong>{exam.examDate}</strong> (Date-Adaptive Seating Active)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Room-Fill Strategy *
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as RoomFillStrategy)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="sequential">Sequential Fill (Packs rooms in sequence)</option>
                <option value="balanced">Balanced Distribution (Even load across halls)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Controls cohort distribution into active rooms.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Classroom Minimization *
              </label>
              <select
                value={(rules.minimizeClassroomsUsed ?? true) ? 'minimize' : 'all'}
                onChange={(e) => setRules({ ...rules, minimizeClassroomsUsed: e.target.value === 'minimize' })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="minimize">Minimize Classrooms (Bin-Packing)</option>
                <option value="all">Use All Active Classrooms</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {(rules.minimizeClassroomsUsed ?? true)
                  ? 'Packs fewer rooms, keeping unused halls free.'
                  : 'Activates all available classrooms in the building.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Register Number Order *
              </label>
              <select
                value={rules.registerNumberOrder ?? 'sorted'}
                onChange={(e) => setRules({ ...rules, registerNumberOrder: e.target.value as RegisterNumberOrder })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="sorted">Sorted Order (CS001, CS002...)</option>
                <option value="random">Random Order (Shuffled positions)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {(rules.registerNumberOrder ?? 'sorted') === 'sorted'
                  ? 'Ascending numerical/alphabetical sequence.'
                  : 'Randomizes candidate positions within cohorts.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deterministic PRNG Seed (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={defaultSeed}
                  value={customSeed}
                  onChange={(e) => setCustomSeed(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomSeed(`seed-${Math.floor(Math.random() * 100000)}`)}
                  title="Generate alternative random seed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Same seed reproduces identical seating; changing seed alters layout.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReadinessCard ready={capacity.canAllocate} capacity={capacity} warnings={capacity.warnings} />

      {capacity.blockingIssues.length > 0 && (
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="bg-red-50">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800 text-sm font-bold">
                Pre-Allocation Blocking Issues ({capacity.blockingIssues.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs text-red-700">
              {capacity.blockingIssues.map((issue) => (
                <li key={issue} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {capacity.canAllocate && (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader className="bg-emerald-50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-emerald-800 text-sm font-bold">Ready to Generate Allocation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-700">
              All hard constraint pre-checks (C1 Capacity, C4 Uniqueness, C6 Data Integrity) are fully satisfied.
              The deterministic CSP engine will place candidates with independent post-generation verification.
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

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleGenerate}
          disabled={!capacity.canAllocate || isGenerating}
          isLoading={isGenerating}
          className="flex items-center gap-2"
        >
          {isGenerating ? 'Computing Allocation...' : 'Generate Seating Allocation →'}
        </Button>
      </div>

      <InfeasibilityReportModal
        isOpen={isInfeasibilityModalOpen}
        onClose={() => setIsInfeasibilityModalOpen(false)}
        report={infeasibilityReport}
        onProceedToReview={() => {
          setIsInfeasibilityModalOpen(false);
          navigate('/review');
        }}
        onAdjustRooms={() => {
          setIsInfeasibilityModalOpen(false);
          navigate('/classrooms');
        }}
      />
    </div>
  );
};

function ExamValueSelector({
  title,
  values,
  selected,
  emptyMessage,
  onToggle,
}: {
  title: string;
  values: string[];
  selected: string[];
  emptyMessage: string;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <legend className="px-1 text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</legend>
      {values.length ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <label
              key={value}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                selected.includes(value)
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(value)}
                onChange={() => onToggle(value)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {value}
            </label>
          ))}
          <p className="w-full text-[11px] text-slate-400 mt-1">Leave all unchecked to include all candidates.</p>
        </div>
      ) : (
        <p className="text-xs text-slate-400 py-1">{emptyMessage}</p>
      )}
    </fieldset>
  );
}
