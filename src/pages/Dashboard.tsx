import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { clearDraft, getLastSavedTimestamp, hasDraft, readDraft } from '../storage/draftStorage';
import { downloadProjectJson, importProjectJson } from '../storage/projectFile';
import { useAppStore, type AppState } from '../store/appStore';

const steps = [
  { label: 'Exam Details', path: '/exam' },
  { label: 'Classrooms', path: '/classrooms' },
  { label: 'Students', path: '/students' },
  { label: 'Rules', path: '/rules' },
  { label: 'Generate', path: '/generate' },
  { label: 'Review', path: '/review' },
  { label: 'Export', path: '/export' },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { resetStore, setExamDetails, setStudents, setRules, setArrangement, setValidation, setClassrooms, setLastActiveStep } = useAppStore();
  const [savedLabel, setSavedLabel] = useState(() => getLastSavedTimestamp());
  type DashboardStoreState = AppState;

  const handleContinueDraft = () => {
    const draft = readDraft();
    if (!draft) {
      return;
    }

    const state = draft.state ?? draft;
    if (state && typeof state === 'object') {
      const draftData = state as Record<string, unknown>;
      if (draftData.exam && typeof draftData.exam === 'object') {
        setExamDetails(draftData.exam as any);
      }
      if (Array.isArray(draftData.classrooms)) {
        setClassrooms(draftData.classrooms as any);
      }
      if (Array.isArray(draftData.students)) {
        setStudents(draftData.students as any);
      }
      if (draftData.rules && typeof draftData.rules === 'object') {
        setRules(draftData.rules as any);
      }
      if (draftData.arrangement && typeof draftData.arrangement === 'object') {
        setArrangement(draftData.arrangement as any);
      }
      if (draftData.validation && typeof draftData.validation === 'object') {
        setValidation(draftData.validation as any);
      }
      if (typeof draftData.lastActiveStep === 'string') {
        setLastActiveStep(draftData.lastActiveStep);
        navigate(draftData.lastActiveStep);
        return;
      }
    }

    navigate('/exam');
  };

  const handleClearDraft = () => {
    clearDraft();
    resetStore();
    setSavedLabel(null);
  };

  const handleExportProject = () => {
    const state = useAppStore.getState();
    downloadProjectJson({
      exam: state.exam,
      classrooms: state.classrooms,
      students: state.students,
      rules: state.rules,
      arrangement: state.arrangement,
      validation: state.validation,
      lastActiveStep: state.lastActiveStep,
    });
  };

  const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const data = await importProjectJson(file);
      const exam = data.exam as DashboardStoreState['exam'];
      const classrooms = data.classrooms as DashboardStoreState['classrooms'];
      const students = data.students as DashboardStoreState['students'];
      const rules = data.rules as DashboardStoreState['rules'];
      const arrangement = data.arrangement as DashboardStoreState['arrangement'];
      const validation = data.validation as DashboardStoreState['validation'];
      const lastActiveStep = typeof data.lastActiveStep === 'string' ? data.lastActiveStep : '/exam';

      useAppStore.setState({
        exam,
        classrooms: classrooms ?? [],
        students: students ?? [],
        rules: rules ?? useAppStore.getState().rules,
        arrangement,
        validation,
        lastActiveStep,
      });
      navigate(lastActiveStep);
    } catch (error) {
      console.error('Unable to import project file', error);
      window.alert('This project file could not be imported.');
    } finally {
      event.target.value = '';
    }
  };

  const savedDraftExists = hasDraft();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-2xl bg-academic-gradient p-8 text-white shadow-lg shadow-indigo-500/20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100">Setup wizard</p>
        <h2 className="text-3xl font-bold tracking-tight">Create a balanced exam seating plan</h2>
        <p className="mt-3 max-w-2xl text-sm text-indigo-100">
          Configure exam metadata, room layouts, student groups, and seating constraints before generating the final arrangement.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Draft status</p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {savedDraftExists ? `Last saved: ${savedLabel ? new Date(savedLabel).toLocaleString() : 'Recently'}` : 'No saved draft found'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleContinueDraft} disabled={!savedDraftExists}>Continue Saved Draft</Button>
          <Button variant="secondary" onClick={handleClearDraft} disabled={!savedDraftExists}>Clear Saved Draft</Button>
          <Button variant="secondary" onClick={handleExportProject}>Export Project JSON</Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Import Project JSON</Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportProject} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.path} className="transition hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <CardTitle>{step.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Wizard stage</span>
              <Link to={step.path}>
                <Button variant="secondary" size="sm">Open</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
