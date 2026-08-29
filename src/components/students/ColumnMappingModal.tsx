import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ColumnMapping } from '../../import/studentValidator';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mapping: ColumnMapping) => void;
  availableHeaders: string[];
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableHeaders,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({
    registerNumber: '',
    name: '',
    branch: '',
  });

  // Auto-guess headers when modal opens or headers change
  useEffect(() => {
    if (isOpen && availableHeaders.length > 0) {
      const guessMapping = (keywords: string[]) => {
        return availableHeaders.find(h => 
          keywords.some(k => h.toLowerCase().includes(k))
        ) || '';
      };

      setMapping({
        registerNumber: guessMapping(['register', 'roll', 'reg']),
        name: guessMapping(['name', 'student']),
        branch: guessMapping(['branch', 'dept', 'department', 'course']),
      });
    }
  }, [isOpen, availableHeaders]);

  const isValid = mapping.registerNumber && mapping.name && mapping.branch;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Map Import Columns"
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            disabled={!isValid} 
            onClick={() => onConfirm(mapping)}
          >
            Confirm & Import
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Please match the required fields to the columns found in your file.
        </p>

        <div className="space-y-4">
          <FieldMappingRow 
            label="Register Number" 
            value={mapping.registerNumber}
            onChange={(val) => setMapping(m => ({ ...m, registerNumber: val }))}
            options={availableHeaders}
            required
          />
          <FieldMappingRow 
            label="Student Name" 
            value={mapping.name}
            onChange={(val) => setMapping(m => ({ ...m, name: val }))}
            options={availableHeaders}
            required
          />
          <FieldMappingRow 
            label="Branch" 
            value={mapping.branch}
            onChange={(val) => setMapping(m => ({ ...m, branch: val }))}
            options={availableHeaders}
            required
          />
        </div>

        {!isValid && (
          <div className="mt-4 p-3 bg-amber-50 text-amber-800 text-sm rounded-md border border-amber-200">
            Please map all required fields to continue.
          </div>
        )}
      </div>
    </Modal>
  );
};

function FieldMappingRow({ 
  label, 
  value, 
  onChange, 
  options,
  required
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="" disabled>-- Select Column --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
