import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClassroomList } from '../components/classrooms/ClassroomList';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export const ClassroomsScreen: React.FC = () => {
  const navigate = useNavigate();
  const classrooms = useAppStore((state) => state.classrooms);

  const canProceed = classrooms.length > 0;

  return (
    <div className="py-4 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Room & Bench Grid Configuration</h1>
        <p className="text-sm text-slate-500">
          PRD Requirement 4.3: Physical bench grids, 1–3 seats per bench, configured maximum capacity, and obstruction blocking.
        </p>
      </div>

      <ClassroomList />

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-6 border-t border-slate-200">
        <Button variant="ghost" onClick={() => navigate('/students')} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Candidate Roster
        </Button>
        <Button
          onClick={() => navigate('/rules')}
          disabled={!canProceed}
          className="flex items-center gap-2"
        >
          Continue to Rules & Readiness →
        </Button>
      </div>
    </div>
  );
};
