import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { RulesForm } from '../components/rules/RulesForm';

export const RulesScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Seating Constraints</h1>
        <p className="text-lg text-gray-600">
          Configure the rules governing how students are placed relative to each other. Stricter rules may result in lower maximum capacity.
        </p>
      </div>

      <RulesForm />

      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={() => navigate('/students')} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Button>
        <Button onClick={() => navigate('/generate')} className="flex items-center gap-2">
          Review & Generate <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
