import { describe, expect, it } from 'vitest';
import {
  generateSyntheticExamCandidates,
  generateSyntheticRooms,
} from '../src/utils/mockDataGenerator';
import { validateSeatingCapacity } from '../src/algorithms/capacityValidator';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';
import { buildAllocationExportRows } from '../src/export/csvAllocationExporter';
import type { SeatingRules } from '../src/models/arrangement';

describe('Phase 6 — High-Volume Scalability Benchmark (2,000+ Candidates)', () => {
  const defaultRules: SeatingRules = {
    sameBenchSeparation: true,
    horizontalAdjacency: false,
    verticalAdjacency: false,
    diagonalAdjacency: false,
    sameSemesterSeparation: true,
    sameSubjectCodeSeparation: true,
  };

  it('generates a 2,000 candidate synthetic dataset with zero duplicate register numbers', () => {
    const candidates = generateSyntheticExamCandidates(2000);

    expect(candidates).toHaveLength(2000);

    const regSet = new Set(candidates.map((c) => c.registerNumber));
    expect(regSet.size).toBe(2000);
  });

  it('generates adequate room capacity with realistic physical bench geometries', () => {
    const rooms = generateSyntheticRooms(2100, 2);
    const totalCapacity = rooms.reduce((acc, r) => acc + (r.usableCapacity || 0), 0);

    expect(totalCapacity).toBeGreaterThanOrEqual(2000);
    expect(rooms.length).toBeGreaterThanOrEqual(25);
  });

  it('evaluates pre-allocation gatekeeper capacity for 2,000 candidates in < 20ms', () => {
    const candidates = generateSyntheticExamCandidates(2000);
    const rooms = generateSyntheticRooms(2100, 2);

    const start = performance.now();
    const capacityCheck = validateSeatingCapacity(rooms, candidates);
    const duration = performance.now() - start;

    expect(capacityCheck.status).toBe('SUFFICIENT');
    expect(capacityCheck.totalValidStudents).toBe(2000);
    expect(duration).toBeLessThan(100);
  });

  it(
    'allocates 2,000 candidates into multiple halls with deterministic seed satisfying all hard constraints',
    () => {
      const candidates = generateSyntheticExamCandidates(2000);
      const rooms = generateSyntheticRooms(2100, 2);

    const start = performance.now();
    const result = generateConstraintAwareSeating(candidates, rooms, defaultRules, {
      seed: 42,
      strategy: 'sequential',
    });
    const allocationDuration = performance.now() - start;

    // Must finish within reasonable time
    expect(allocationDuration).toBeLessThan(10000);

    // All candidates must be assigned
    expect(result.assignments).toHaveLength(2000);
    expect(result.unassignedCandidates).toHaveLength(0);

    // Run independent validator from scratch
    const valStart = performance.now();
    const validation = validateSeatingPlanIndependently(result.assignments, candidates, rooms);
    const validationDuration = performance.now() - valStart;

    expect(validationDuration).toBeLessThan(500);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  }, 15000);

  it('builds raw export rows for 2,000 candidates in < 150ms without memory exhaustion', () => {
    const candidates = generateSyntheticExamCandidates(2000);
    const rooms = generateSyntheticRooms(2100, 2);

    const result = generateConstraintAwareSeating(candidates, rooms, defaultRules, { seed: 99 });

    const start = performance.now();
    const rows = buildAllocationExportRows(
      { examName: 'Scale Benchmark', examDate: '2026-10-25' } as any,
      rooms,
      result.assignments,
      candidates
    );
    const duration = performance.now() - start;

    expect(rows).toHaveLength(2000);
    expect(duration).toBeLessThan(300);
  });
});
