import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

interface WizardHeaderProps {
  steps: Array<{ label: string; path: string; complete?: boolean; active?: boolean; disabled?: boolean }>;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({ steps }) => {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4">
        {steps.map((step) => {
          const content = (
            <div
              className={[
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                step.active ? 'bg-indigo-600 text-white shadow-sm' : step.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-600',
                step.disabled ? 'pointer-events-none opacity-50' : 'hover:bg-slate-100',
              ].join(' ')}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-bold">
                {step.complete ? '✓' : step.active ? '•' : step.label.charAt(0)}
              </span>
              {step.label}
            </div>
          );

          if (step.disabled) {
            return <React.Fragment key={step.path}>{content}</React.Fragment>;
          }

          return (
            <Link key={step.path} to={step.path} className="block">
              {content}
            </Link>
          );
        })}
      </div>
      <div className="px-4 py-3">
        <Button variant="ghost" size="sm">
          7-step creation wizard
        </Button>
      </div>
    </div>
  );
};
