import { CaseData, CaseRevision, UserStatement, EvidenceItem, CaseEvent, Claim, EvidenceGap, NextAction, AnalysisSummary } from '../types';

export interface ProjectedState {
  statements: UserStatement[];
  evidence: EvidenceItem[];
  events: CaseEvent[];
  claims: Claim[];
  gaps: EvidenceGap[];
  actions: NextAction[];
  summary: AnalysisSummary | undefined;
}

/**
 * Projects the full case state from a specific revision.
 * This enforces the "revision-as-source-of-truth" rule.
 */
export function projectStateAtRevision(caseData: CaseData, revisionId?: string): ProjectedState {
  const revisions = caseData.revisions || [];
  if (revisions.length === 0) {
    return {
      statements: [],
      evidence: [],
      events: [],
      claims: [],
      gaps: [],
      actions: [],
      summary: undefined,
    };
  }

  let targetRevision: CaseRevision;
  if (revisionId) {
    targetRevision = revisions.find(r => r.revision_id === revisionId) || revisions[revisions.length - 1];
  } else {
    targetRevision = revisions[revisions.length - 1];
  }

  // Filter global statements and evidence down to what was known at this revision
  const stmtSet = new Set(targetRevision.input_statement_ids || []);
  const evSet = new Set(targetRevision.input_evidence_ids || []);

  const projectedStatements = (caseData.statements || []).filter(s => stmtSet.has(s.id));
  const projectedEvidence = (caseData.evidence || []).filter(e => evSet.has(e.id));

  return {
    statements: projectedStatements,
    evidence: projectedEvidence,
    events: targetRevision.events || [],
    claims: targetRevision.claims || [],
    gaps: targetRevision.gaps || [],
    actions: targetRevision.actions || [],
    summary: targetRevision.summary,
  };
}

/**
 * Updates a CaseData object to match its latest projected state.
 */
export function hydrateCurrentProjection(caseData: CaseData): CaseData {
  const projection = projectStateAtRevision(caseData);
  return {
    ...caseData,
    statements: caseData.statements, // Keep global ledger
    evidence: caseData.evidence,     // Keep global ledger
    current_revision_id: caseData.revisions && caseData.revisions.length > 0 
      ? caseData.revisions[caseData.revisions.length - 1].revision_id 
      : undefined,
    events: projection.events,
    claims: projection.claims,
    gaps: projection.gaps,
    actions: projection.actions,
    summary: projection.summary,
  };
}
