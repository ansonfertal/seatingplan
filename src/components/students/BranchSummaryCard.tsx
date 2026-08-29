import React, { useMemo } from 'react';
import type { Student, BranchInfo } from '../../models/student';

// Pre-defined vibrant colors for different branches
const BRANCH_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-rose-100 text-rose-800 border-rose-200',
];

interface BranchSummaryCardProps {
  students: Student[];
}

export const BranchSummaryCard: React.FC<BranchSummaryCardProps> = ({ students }) => {
  const branchStats = useMemo(() => {
    const stats: Record<string, number> = {};
    students.forEach((student) => {
      if (!stats[student.branch]) {
        stats[student.branch] = 0;
      }
      stats[student.branch]++;
    });

    return Object.entries(stats)
      .map(([branch, count]) => ({ branch, count } as BranchInfo))
      .sort((a, b) => b.count - a.count); // Sort by highest count first
  }, [students]);

  if (students.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Branch Distribution</h3>
      
      <div className="flex flex-wrap gap-3">
        {branchStats.map((stat, index) => {
          const colorClass = BRANCH_COLORS[index % BRANCH_COLORS.length];
          return (
            <div 
              key={stat.branch} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium ${colorClass}`}
            >
              <span className="text-sm">{stat.branch}</span>
              <span className="bg-white/60 px-1.5 py-0.5 rounded text-xs font-bold">
                {stat.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
