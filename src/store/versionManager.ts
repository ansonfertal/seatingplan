import type {
  AllocationVersion,
  AssignedSeat,
  ValidationReport,
} from '../models/arrangement';

/**
 * Marks an allocation version as finalized and locks it.
 * Concurrently marks any existing finalized versions for the same exam as superseded.
 */
export function finalizeAllocationVersion(
  versions: AllocationVersion[],
  versionId: string
): {
  updatedVersions: AllocationVersion[];
  finalizedVersion: AllocationVersion | undefined;
} {
  const now = new Date().toISOString();
  const target = versions.find((v) => v.id === versionId);
  if (!target) {
    return { updatedVersions: versions, finalizedVersion: undefined };
  }

  const examId = target.examId;

  const updatedVersions = versions.map((v) => {
    if (v.id === versionId) {
      return {
        ...v,
        status: 'finalized' as const,
        finalizedAt: now,
      };
    }
    // Any prior finalized version for the same exam is marked superseded
    if (v.examId === examId && v.status === 'finalized') {
      return {
        ...v,
        status: 'superseded' as const,
        supersededAt: now,
      };
    }
    return v;
  });

  const finalizedVersion = updatedVersions.find((v) => v.id === versionId);
  return { updatedVersions, finalizedVersion };
}

/**
 * Branches a new draft version (e.g. v2) from a finalized or superseded version (v1)
 * when the coordinator performs an authorized manual move or edit (PRD Section 4.6).
 */
export function branchDraftFromFinalized(
  versions: AllocationVersion[],
  baseVersionId: string,
  newAssignments: AssignedSeat[],
  newValidationReport: ValidationReport
): {
  updatedVersions: AllocationVersion[];
  newVersion: AllocationVersion;
} {
  const now = new Date().toISOString();
  const baseVersion = versions.find((v) => v.id === baseVersionId);

  const highestVersionNumber = versions
    .filter((v) => v.examId === baseVersion?.examId)
    .reduce((max, v) => Math.max(max, v.versionNumber), 0);

  const nextVersionNumber = (highestVersionNumber || baseVersion?.versionNumber || 1) + 1;
  const newVersionId = `version-${Date.now()}-v${nextVersionNumber}`;

  const newVersion: AllocationVersion = {
    id: newVersionId,
    examId: baseVersion?.examId || `exam-${Date.now()}`,
    versionNumber: nextVersionNumber,
    status: 'draft',
    algorithmVersion: baseVersion?.algorithmVersion || 'v1.0.0-csp',
    seed: baseVersion?.seed ?? Date.now(),
    generatedAt: now,
    summary: newValidationReport.summary,
    validationReport: newValidationReport,
    assignments: newAssignments,
    unassignedCandidates: baseVersion?.unassignedCandidates || [],
  };

  // Base version and prior versions marked superseded
  const updatedVersions = versions.map((v) => {
    if (v.id === baseVersionId) {
      return {
        ...v,
        status: 'superseded' as const,
        supersededAt: now,
      };
    }
    return v;
  });

  updatedVersions.push(newVersion);

  return {
    updatedVersions,
    newVersion,
  };
}

/**
 * Checks whether an allocation version is locked/finalized.
 */
export function isVersionFinalized(version?: AllocationVersion): boolean {
  return version?.status === 'finalized';
}

/**
 * Checks whether an allocation version is superseded by a newer version.
 */
export function isVersionSuperseded(version?: AllocationVersion): boolean {
  return version?.status === 'superseded';
}

/**
 * Finds the latest finalized version for an exam.
 */
export function getLatestFinalizedVersion(
  versions: AllocationVersion[],
  examId?: string
): AllocationVersion | undefined {
  const matching = versions.filter(
    (v) => (examId ? v.examId === examId : true) && v.status === 'finalized'
  );
  if (matching.length === 0) return undefined;
  return matching.sort((a, b) => b.versionNumber - a.versionNumber)[0];
}
