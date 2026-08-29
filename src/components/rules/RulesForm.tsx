import React from 'react';
import type { SeatingRules } from '../../models/arrangement';
import { useAppStore } from '../../store/appStore';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export const RulesForm: React.FC = () => {
  const { rules, setRules } = useAppStore();

  const handleToggle = (key: keyof SeatingRules) => {
    setRules({
      ...rules,
      [key]: !rules[key]
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Constraint Rules</h3>
          <p className="text-sm text-gray-500 mt-1">
            Toggle rules to enforce strict separation between students of the same branch.
          </p>
        </div>
        <div className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-md flex items-center gap-2">
          {Object.values(rules).some(v => v) ? <ShieldCheck className="w-5 h-5 text-indigo-600" /> : <ShieldAlert className="w-5 h-5 text-amber-600" />}
          <span className="font-semibold text-sm">
            {Object.values(rules).filter(Boolean).length} Active Constraints
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <RuleToggle
          title="Same Bench Separation"
          description="Prevents two students from the same branch from sitting next to each other on a multi-seat bench."
          isActive={rules.sameBenchSeparation}
          onToggle={() => handleToggle('sameBenchSeparation')}
          recommended
        />
        <RuleToggle
          title="Horizontal Adjacency"
          description="Prevents same-branch students from sitting directly across the aisle on the same row level."
          isActive={rules.horizontalAdjacency}
          onToggle={() => handleToggle('horizontalAdjacency')}
          recommended
        />
        <RuleToggle
          title="Vertical Adjacency"
          description="Prevents same-branch students from sitting directly behind or in front of each other."
          isActive={rules.verticalAdjacency}
          onToggle={() => handleToggle('verticalAdjacency')}
          recommended
        />
        <RuleToggle
          title="Diagonal Adjacency"
          description="Prevents same-branch students from sitting diagonally adjacent to each other. This is the strictest rule."
          isActive={rules.diagonalAdjacency}
          onToggle={() => handleToggle('diagonalAdjacency')}
        />
      </div>
    </div>
  );
};

function RuleToggle({ 
  title, 
  description, 
  isActive, 
  onToggle, 
  recommended = false 
}: { 
  title: string; 
  description: string; 
  isActive: boolean; 
  onToggle: () => void;
  recommended?: boolean;
}) {
  return (
    <div 
      className={`p-4 border rounded-xl flex items-start gap-4 transition-colors cursor-pointer select-none ${isActive ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
      onClick={onToggle}
    >
      <div className="mt-0.5 flex-shrink-0">
        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-indigo-600' : 'bg-gray-200'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className={`text-base font-medium ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{title}</h4>
          {recommended && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Recommended</span>
          )}
        </div>
        <p className={`text-sm mt-1 ${isActive ? 'text-indigo-700/80' : 'text-gray-500'}`}>{description}</p>
      </div>
    </div>
  );
}
