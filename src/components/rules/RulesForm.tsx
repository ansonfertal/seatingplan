import React from 'react';
import type { RegisterNumberOrder, SeatingRules } from '../../models/arrangement';
import { useAppStore } from '../../store/appStore';
import { ArrowDownUp, ListOrdered, ShieldAlert, ShieldCheck, Shuffle } from 'lucide-react';

export const RulesForm: React.FC = () => {
  const { rules, setRules } = useAppStore();

  const handleToggle = (key: keyof SeatingRules) => {
    setRules({
      ...rules,
      [key]: !rules[key]
    });
  };

  const handleOrderChange = (order: RegisterNumberOrder) => {
    setRules({
      ...rules,
      registerNumberOrder: order,
    });
  };

  const currentOrder: RegisterNumberOrder = rules.registerNumberOrder ?? 'sorted';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Constraint Rules & Ordering</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure register number sequencing and separation rules to prevent candidate conflicts.
          </p>
        </div>
        <div className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-md flex items-center gap-2">
          {Object.values(rules).some(v => v) ? <ShieldCheck className="w-5 h-5 text-indigo-600" /> : <ShieldAlert className="w-5 h-5 text-amber-600" />}
          <span className="font-semibold text-sm">
            {Object.values(rules).filter(Boolean).length} Active Settings
          </span>
        </div>
      </div>

      {/* Register Number Ordering Section */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/40">
        <div className="flex items-center gap-2 mb-1.5">
          <ArrowDownUp className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Candidate Register Number Ordering
          </h4>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Determine whether students' register numbers are assigned sequentially across rooms and benches or shuffled randomly.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => handleOrderChange('sorted')}
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none ${
              currentOrder === 'sorted'
                ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${currentOrder === 'sorted' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <ListOrdered className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Sorted Order (Sequential)</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Recommended</span>
                  </div>
                  <span className="text-xs text-slate-500">CS001, CS002, CS003... in ascending sequence</span>
                </div>
              </div>
              <input
                type="radio"
                name="regOrder"
                checked={currentOrder === 'sorted'}
                onChange={() => handleOrderChange('sorted')}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60">
              Allocates candidates in strictly ascending alphanumeric register number order. Standard practice for universities, colleges, and board examinations.
            </p>
          </div>

          <div
            onClick={() => handleOrderChange('random')}
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none ${
              currentOrder === 'random'
                ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${currentOrder === 'random' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900">Random Order (Shuffled)</span>
                  <p className="text-xs text-slate-500">Shuffled non-consecutively</p>
                </div>
              </div>
              <input
                type="radio"
                name="regOrder"
                checked={currentOrder === 'random'}
                onChange={() => handleOrderChange('random')}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60">
              Randomizes candidate positions within cohorts using the deterministic PRNG seed to prevent consecutive roll numbers sitting on neighboring benches.
            </p>
          </div>
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
        <RuleToggle
          title="Same Semester Separation"
          description="Prevents students with the same semester value from occupying adjacent seats."
          isActive={rules.sameSemesterSeparation}
          onToggle={() => handleToggle('sameSemesterSeparation')}
        />
        <RuleToggle
          title="Same Subject Code Separation"
          description="Prevents students with the same subject code from occupying adjacent seats."
          isActive={rules.sameSubjectCodeSeparation}
          onToggle={() => handleToggle('sameSubjectCodeSeparation')}
        />

        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Classroom Utilization & Date-Adaptive Seating Optimization
          </p>
          <div className="space-y-3">
            <RuleToggle
              title="Minimize Classrooms Used (Bin-Packing Optimization)"
              description="Activates only the minimum number of classrooms required to seat candidates. Leaves unused classrooms free, saving electricity, cleaning, and invigilation staff."
              isActive={rules.minimizeClassroomsUsed ?? true}
              onToggle={() => handleToggle('minimizeClassroomsUsed')}
              recommended
            />
            <RuleToggle
              title="Vary Seating Arrangement by Exam Date (Anti-Cheating)"
              description="Automatically rotates classroom selection, bench traversal, and companion pairing for each exam date so candidates sit in different seats and next to different peers across consecutive exam papers."
              isActive={rules.differentArrangementPerDate ?? true}
              onToggle={() => handleToggle('differentArrangementPerDate')}
              recommended
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Phase 7: Advanced Neighboring-Bench Adjacency Controls
          </p>
          <div className="space-y-3">
            <RuleToggle
              title="Strict Neighboring Bench Separation (Hard Constraint)"
              description="Hard-prohibits students with matching branch or subject on adjacent benches (rather than a soft scoring penalty). Ensures zero malpractice across aisles and rows."
              isActive={Boolean(rules.strictAdjacency)}
              onToggle={() => handleToggle('strictAdjacency')}
            />
            <RuleToggle
              title="Prohibit Same Branch on Adjacent Benches"
              description="Prohibits students of the same department/branch from occupying neighboring benches in any active direction (horizontal, vertical, diagonal)."
              isActive={Boolean(rules.adjacentSameBranchSeparation)}
              onToggle={() => handleToggle('adjacentSameBranchSeparation')}
            />
            <RuleToggle
              title="Prohibit Same Subject on Adjacent Benches"
              description="Prohibits students writing the same subject paper from occupying neighboring benches in any active direction."
              isActive={Boolean(rules.adjacentSameSubjectSeparation)}
              onToggle={() => handleToggle('adjacentSameSubjectSeparation')}
            />
          </div>
        </div>
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
