import * as React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps = 7 }) => {
  const progress = Math.min(100, (currentStep / totalSteps) * 100);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Progress</span>
        <span>{currentStep}/{totalSteps}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};
