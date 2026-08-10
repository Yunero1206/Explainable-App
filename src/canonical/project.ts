import {
  CanonicalCaseRecord,
  CaseRevision,
  CanonicalStatement,
  CanonicalEvidence,
  DispositionRelationship,
  StatementId,
  EvidenceId
} from './types.js';

export type DeepReadonly<T> =
  T extends (infer R)[] ? ReadonlyArray<DeepReadonly<R>> :
  T extends Function ? T :
  T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } :
  T;

export type ProjectedState = DeepReadonly<{
  case_id: string;
  schema_version: string;
  case_number: string;
  
  revision_id: string;
  created_at: string;
  title: string;
  objective: string;
  parent_revision_id?: string;
  
  statements: CanonicalStatement[];
  evidence: CanonicalEvidence[];
  relationships: DispositionRelationship[];
  
  events: CaseRevision['events'];
  claims: CaseRevision['claims'];
  gaps: CaseRevision['gaps'];
  actions: CaseRevision['actions'];
  evidence_inspections: CaseRevision['evidence_inspections'];
  delta: CaseRevision['delta'];
  summary: CaseRevision['summary'];
}>;

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
    // Boundary cast: r.source_id is validated upstream as a valid StatementId or EvidenceId.
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

  // Boundary cast: deepFreeze enforces immutability at runtime, matching ProjectedState's DeepReadonly type.
  return deepFreeze(projected) as ProjectedState;
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    const clonedArray = obj.map(item => deepClone(item));
    // Boundary cast: map preserves the array element type structure.
    return clonedArray as NonNullable<T>;
  }
  // Boundary cast: structural cloning of dynamic keys requires a generic Record shape.
  const cloned = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  // Boundary cast: structural clone is functionally identical to the original type T.
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
    // Boundary cast: iterating unknown properties requires generic Record access.
    const prop = (obj as Record<string, unknown>)[key];
    if (prop !== null && (typeof prop === 'object' || typeof prop === 'function')) {
      deepFreeze(prop);
    }
  }
  
  return obj;
}
