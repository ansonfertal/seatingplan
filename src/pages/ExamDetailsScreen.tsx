import React from 'react';
import { ExamForm } from '../components/exam/ExamForm';

export const ExamDetailsScreen: React.FC = () => {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ExamForm />
      </div>
    </div>
  );
};
