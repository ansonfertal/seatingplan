import { describe, expect, it, vi } from 'vitest';
import {
  isPotentialFormulaInjection,
  stripFormulaInjection,
  sanitizeCellInput,
  sanitizeRawImportRow,
  redactCandidateForLog,
  safeLogger,
  clearAllStudentDataAction,
} from '../src/utils/securitySanitizer';

describe('TASK-6.3: Candidate Data Privacy, Upload Sanitization & Security Hardening', () => {
  describe('Formula Injection Detection & Stripping', () => {
    it('detects formula injection triggers (=, +, -, @, \\t, \\r)', () => {
      expect(isPotentialFormulaInjection('=cmd|"/C calc"!A0')).toBe(true);
      expect(isPotentialFormulaInjection('+12345')).toBe(true);
      expect(isPotentialFormulaInjection('-20')).toBe(true);
      expect(isPotentialFormulaInjection('@SUM(A1:A10)')).toBe(true);
      expect(isPotentialFormulaInjection('\tPAYLOAD')).toBe(true);
      expect(isPotentialFormulaInjection('   =SECRET()')).toBe(true);
    });

    it('returns false for normal candidate strings and register numbers', () => {
      expect(isPotentialFormulaInjection('00123')).toBe(false);
      expect(isPotentialFormulaInjection('2024CS001')).toBe(false);
      expect(isPotentialFormulaInjection('John Doe')).toBe(false);
      expect(isPotentialFormulaInjection('Computer Science')).toBe(false);
    });

    it('strips formula injection prefixes from malicious input cells', () => {
      expect(stripFormulaInjection('=cmd|"/C calc"!A0')).toBe('cmd|"/C calc"!A0');
      expect(stripFormulaInjection('===2+2')).toBe('2+2');
      expect(stripFormulaInjection('@SUM(A1:A10)')).toBe('SUM(A1:A10)');
      expect(stripFormulaInjection('   +DANGEROUS')).toBe('DANGEROUS');
    });

    it('preserves leading zeros on register numbers without alteration', () => {
      expect(sanitizeCellInput('00123')).toBe('00123');
      expect(sanitizeCellInput('0000042')).toBe('0000042');
      expect(sanitizeCellInput('  00456  ')).toBe('00456');
    });

    it('sanitizes an entire raw spreadsheet row', () => {
      const rawRow = {
        '=regNo': '=00999',
        name: '+Malicious Student',
        branch: '  CSE  ',
        semester: '5',
      };

      const clean = sanitizeRawImportRow(rawRow);
      expect(clean).toEqual({
        regNo: '00999',
        name: 'Malicious Student',
        branch: 'CSE',
        semester: '5',
      });
    });
  });

  describe('Console PII Redaction & Safe Logging', () => {
    it('redacts student register number and personal name for safe logs', () => {
      const candidate = {
        id: 'c-1',
        registerNumber: '2024CS0042',
        name: 'Alexander Hamilton',
        branch: 'CSE',
        semester: '6',
        subjectCode: 'CS601',
      };

      const redacted = redactCandidateForLog(candidate);

      expect(redacted.registerNumber).toBe('20***42');
      expect(redacted.name).toBe('A*** H***');
      // Preserves metadata needed for debugging
      expect(redacted.branch).toBe('CSE');
      expect(redacted.semester).toBe('6');
      expect(redacted.subjectCode).toBe('CS601');
    });

    it('safeLogger intercepts and redacts student objects passed to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const student = {
        registerNumber: '2024EC0099',
        name: 'Sarah Connor',
      };

      safeLogger.log('Allocated student:', student);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toBe('[SafeLog] Allocated student:');
      expect(callArgs[1]).toEqual({
        registerNumber: '20***99',
        name: 'S*** C***',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Candidate Privacy Wipe Action', () => {
    it('wipes student data and allocations from state and clears local storage draft', () => {
      const mockSetState = vi.fn();
      clearAllStudentDataAction(mockSetState);

      expect(mockSetState).toHaveBeenCalledWith({
        students: [],
        arrangement: undefined,
        allocationVersions: [],
        activeVersionId: undefined,
        validation: undefined,
      });
    });
  });
});
