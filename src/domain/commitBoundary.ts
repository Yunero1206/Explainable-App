import { CanonicalCaseRecord, IntakeRecord, CanonicalStatement, CanonicalEvidence, DispositionRelationship, CaseRevision } from '../canonical/types.js';
import { CanonicalCaseRecordSchema } from '../canonical/schema.js';
import { validateCanonicalRecord } from '../canonical/validate.js';
import { projectCurrentRecord, ProjectedState } from '../canonical/project.js';

export class InvariantValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Canonical record invariant validation failed:\n- ${errors.join('\n- ')}`);
    this.name = 'InvariantValidationError';
  }
}

/**
 * Shared Commit Boundary.
 * Implements: untrusted input → canonical intake/revision construction → schema parse → invariant validation → immutable commit → projection.
 * Failed validation must preserve the previous record and perform no partial persistence.
 */
export function commitRevisionToRecord(
  priorRecord: CanonicalCaseRecord,
  intakeRecord: IntakeRecord,
  newStatements: CanonicalStatement[],
  newEvidence: CanonicalEvidence[],
  newRelationships: DispositionRelationship[],
  newRevision: CaseRevision
): { record: CanonicalCaseRecord; projected: ProjectedState } {
  // 1. Immutable clone to avoid partial mutation of prior record
  const newRecord = deepClone(priorRecord);
  
  // 2. Append new items
  newRecord.updated_at = new Date().toISOString();
  newRecord.current_revision_id = newRevision.revision_id;
  
  newRecord.intake_ledger.push(intakeRecord);
  newRecord.statements.push(...newStatements);
  newRecord.evidence.push(...newEvidence);
  newRecord.relationships.push(...newRelationships);
  newRecord.revisions.push(newRevision);

  // 3. Schema parse (Structural invariant check)
  const parsedRecord = CanonicalCaseRecordSchema.parse(newRecord) as CanonicalCaseRecord;

  // 4. Domain invariant validation (Semantic invariant check)
  const errors = validateCanonicalRecord(parsedRecord);
  if (errors.length > 0) {
    throw new InvariantValidationError(errors);
  }

  // 5. Freeze to prevent accidental direct mutation
  const frozenRecord = deepFreeze(parsedRecord);

  // 6. Projection (Create deterministic view)
  const projected = projectCurrentRecord(frozenRecord);

  return { record: frozenRecord, projected };
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  const cloned = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return cloned as T;
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const prop = (obj as Record<string, unknown>)[key];
    if (prop !== null && (typeof prop === 'object' || typeof prop === 'function')) {
      deepFreeze(prop);
    }
  }
  return obj;
}
