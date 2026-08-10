import {
  CanonicalCaseRecord,
  CaseRevision,
  CanonicalStatement,
  CanonicalEvidence,
  DispositionRelationship,
  StatementId,
  EvidenceId
} from './types.js';

export interface ProjectedState {
  readonly case_id: string;
  readonly schema_version: string;
  readonly case_number: string;
  
  readonly revision_id: string;
  readonly created_at: string;
  readonly title: string;
  readonly objective: string;
  readonly parent_revision_id?: string;
  
  readonly statements: readonly CanonicalStatement[];
  readonly evidence: readonly CanonicalEvidence[];
  readonly relationships: readonly DispositionRelationship[];
  
  readonly events: readonly CaseRevision['events'][number][];
  readonly claims: readonly CaseRevision['claims'][number][];
  readonly gaps: readonly CaseRevision['gaps'][number][];
  readonly actions: readonly CaseRevision['actions'][number][];
  readonly evidence_inspections: readonly CaseRevision['evidence_inspections'][number][];
  readonly delta: Readonly<CaseRevision['delta']>;
  readonly summary: Readonly<CaseRevision['summary']>;
}

export function projectCurrentRecord(
  record: CanonicalCaseRecord,
  optionalRevisionId?: string
): ProjectedState {
  const targetRevisionId = optionalRevisionId ?? record.current_revision_id;
  
  const targetRevision = record.revisions.find(r => r.revision_id === targetRevisionId);
  if (!targetRevision) {
    throw new Error(`Requested revision_id ${targetRevisionId} not found in the case record.`);
  }

  const validAncestorRevisions = new Set<string>();
  let current: CaseRevision | undefined = targetRevision;
  while (current) {
    validAncestorRevisions.add(current.revision_id);
    if (!current.parent_revision_id) break;
    const parentId = current.parent_revision_id;
    current = record.revisions.find(r => r.revision_id === parentId);
  }

  const availableUxxIds = new Set(targetRevision.input_statement_ids);
  const availableExxIds = new Set(targetRevision.input_evidence_ids);

  const projectedStatements = record.statements
    .filter(s => availableUxxIds.has(s.id))
    .map(deepClone);

  const projectedEvidence = record.evidence
    .filter(e => availableExxIds.has(e.id))
    .map(deepClone);

  const projectedRelationships = record.relationships
    .filter(r => validAncestorRevisions.has(r.created_in_revision_id))
    .filter(r => availableUxxIds.has(r.source_id as StatementId) || availableExxIds.has(r.source_id as EvidenceId))
    .map(deepClone);

  const projected: ProjectedState = {
    case_id: record.id,
    schema_version: record.schema_version,
    case_number: record.case_number,
    
    revision_id: targetRevision.revision_id,
    created_at: targetRevision.created_at,
    title: targetRevision.title,
    objective: targetRevision.objective,
    parent_revision_id: targetRevision.parent_revision_id,
    
    statements: projectedStatements,
    evidence: projectedEvidence,
    relationships: projectedRelationships,
    
    events: deepClone(targetRevision.events),
    claims: deepClone(targetRevision.claims),
    gaps: deepClone(targetRevision.gaps),
    actions: deepClone(targetRevision.actions),
    evidence_inspections: deepClone(targetRevision.evidence_inspections),
    delta: deepClone(targetRevision.delta),
    summary: deepClone(targetRevision.summary)
  };

  return deepFreeze(projected);
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    const clonedArray = obj.map(item => deepClone(item));
    return clonedArray as NonNullable<T>;
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
