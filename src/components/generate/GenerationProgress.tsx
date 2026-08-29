import React from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export type GenerationProgressProps = {
  stage: string;
  percent: number;
  onCancel?: () => void;
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  stage,
  percent,
  onCancel,
}) => {
  return (
    <Card className="mt-6 border-indigo-200 bg-indigo-50/80">
      <CardHeader className="bg-indigo-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" />
            <CardTitle className="text-indigo-700">Generating seating plan</CardTitle>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-indigo-700 hover:bg-indigo-100">
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-indigo-700">
            <span>{stage}</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-slate-600">
          The app is distributing students, assigning seats, and checking for branch conflicts before presenting the final review.
        </p>
      </CardContent>
    </Card>
  );
};
