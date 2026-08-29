import React, { useState } from 'react';
import type { Student } from '../../models/student';
import { Button } from '../ui/Button';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';

interface StudentTableProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateStudent: (id: string, updated: Omit<Student, 'id'>) => void;
  onDeleteStudent: (id: string) => void;
  onClearAll: () => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onClearAll,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [regNo, setRegNo] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');

  const resetForm = () => {
    setRegNo('');
    setName('');
    setBranch('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (student: Student) => {
    setRegNo(student.registerNumber);
    setName(student.name);
    setBranch(student.branch);
    setEditingId(student.id);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!regNo.trim() || !name.trim() || !branch.trim()) return;

    const data = {
      registerNumber: regNo.trim(),
      name: name.trim(),
      branch: branch.trim().toUpperCase(),
    };

    if (isAdding) {
      onAddStudent(data);
    } else if (editingId) {
      onUpdateStudent(editingId, data);
    }
    resetForm();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Student Directory ({students.length})</h3>
        <div className="flex gap-2">
          {students.length > 0 && (
            <Button variant="danger" size="sm" onClick={onClearAll} className="flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Clear All
            </Button>
          )}
          <Button size="sm" onClick={handleStartAdd} disabled={isAdding || !!editingId} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Student
          </Button>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Register No
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isAdding && (
              <tr className="bg-indigo-50/50">
                <td className="px-6 py-3">
                  <input type="text" className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-1.5" placeholder="e.g. CS01" value={regNo} onChange={e => setRegNo(e.target.value)} autoFocus />
                </td>
                <td className="px-6 py-3">
                  <input type="text" className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-1.5" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                </td>
                <td className="px-6 py-3">
                  <input type="text" className="w-32 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-1.5 uppercase" placeholder="CS" value={branch} onChange={e => setBranch(e.target.value)} />
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap">
                  <button onClick={handleSave} className="text-green-600 hover:text-green-900 mx-2" title="Save">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={resetForm} className="text-gray-500 hover:text-gray-700" title="Cancel">
                    <X className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            )}

            {students.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No students added yet. Upload a file or add manually.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const isEditing = editingId === student.id;
                
                return isEditing ? (
                  <tr key={student.id} className="bg-indigo-50/50">
                    <td className="px-6 py-3">
                      <input type="text" className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-1.5" value={regNo} onChange={e => setRegNo(e.target.value)} autoFocus />
                    </td>
                    <td className="px-6 py-3">
                      <input type="text" className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-1.5" value={name} onChange={e => setName(e.target.value)} />
                    </td>
                    <td className="px-6 py-3">
                      <input type="text" className="w-32 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-1.5 uppercase" value={branch} onChange={e => setBranch(e.target.value)} />
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <button onClick={handleSave} className="text-green-600 hover:text-green-900 mx-2">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.registerNumber}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                      {student.name}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {student.branch}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleStartEdit(student)} 
                        className="text-indigo-600 hover:text-indigo-900 mx-3 disabled:opacity-50"
                        disabled={isAdding || !!editingId}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteStudent(student.id)} 
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        disabled={isAdding || !!editingId}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
