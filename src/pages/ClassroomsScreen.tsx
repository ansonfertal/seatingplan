import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClassroomList } from '../components/classrooms/ClassroomList';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const ClassroomsScreen: React.FC = () => {
  const navigate = useNavigate();
  const classrooms = useAppStore((state) => state.classrooms);

  const canProceed = classrooms.length > 0;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Classroom Configuration</h1>
        <p className="text-lg text-gray-600">
          Define the physical classrooms and their seating arrangements. Disable any seats that are unavailable due to obstructions.
        </p>
      </div>

      <ClassroomList />

      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={() => navigate('/exam')} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Exam Details
        </Button>
        <Button 
          onClick={() => navigate('/students')} 
          disabled={!canProceed}
          className="flex items-center gap-2"
        >
          Continue to Students <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
