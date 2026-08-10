import { CaseRevision, UserStatement, EvidenceItem, AnalysisSummary } from '../types.js';
import { CaseReconstructionOutput } from '../schema.js';

interface ReconcileParams {
  existingRevisions: CaseRevision[];
  reconstructionOutput: CaseReconstructionOutput;
  updatedStatements: UserStatement[];
  mergedEvidence: EvidenceItem[];
  turnTimestamp: string;
  deterministicSummary: AnalysisSummary;
  usedModelId?: string;
  inferenceModeModelId: string;
}

export function reconcileNextRevision(params: ReconcileParams): CaseRevision {
  const {
    existingRevisions,
    reconstructionOutput,
    updatedStatements,
    mergedEvidence,
    turnTimestamp,
    deterministicSummary,
    usedModelId,
    inferenceModeModelId,
  } = params;

  const revisionNum = (existingRevisions.length || 0) + 1;
  const revisionId = `R${revisionNum < 10 ? '0' : ''}${revisionNum}`;

  const oldRev = existingRevisions[existingRevisions.length - 1];
  
  const newClaims = (reconstructionOutput.claims || []).filter(c => !oldRev?.claims?.some(oc => oc.id === c.id));
  const newGaps = (reconstructionOutput.gaps || []).filter(g => !oldRev?.gaps?.some(og => og.id === g.id));
  
  const resolvedGaps = (reconstructionOutput.gaps || []).filter(g => 
    (g.status === 'resolved' || g.status === 'superseded') && 
    oldRev?.gaps?.some(og => og.id === g.id && og.status !== 'resolved' && og.status !== 'superseded')
  );
  
  const deltaLines: string[] = [];
  if (newClaims.length > 0) deltaLines.push(`Recorded Findings: ${newClaims.map(c => c.id).join(', ')}`);
  
  // We infer added evidence by checking mergedEvidence against oldRev's input_evidence_ids
  const oldEvIds = new Set(oldRev?.input_evidence_ids || []);
  const newEvs = mergedEvidence.filter(e => !oldEvIds.has(e.id));
  if (newEvs.length > 0) deltaLines.push(`Added Evidence: ${newEvs.map(e => e.id).join(', ')}`);
  
  if (newGaps.length > 0) deltaLines.push(`Opened Gaps: ${newGaps.map(g => g.id).join(', ')}`);
  if (resolvedGaps.length > 0) deltaLines.push(`Resolved Gaps: ${resolvedGaps.map(g => g.id).join(', ')}`);
  
  const correctedStatements = (reconstructionOutput.input_dispositions || []).filter(d => d.disposition === 'corrects_statement');
  if (correctedStatements.length > 0) deltaLines.push(`Corrected Statements: ${correctedStatements.map(d => d.id).join(', ')}`);
  
  let deltaSummary = deltaLines.join('\n');
  if (!deltaSummary) deltaSummary = 'No structural objects changed.';

  const summaryWithDelta = {
    ...deterministicSummary,
    revision_delta_summary: deltaSummary,
  };

  const newRevision: CaseRevision = {
    revision_id: revisionId,
    created_at: turnTimestamp,
    input_statement_ids: updatedStatements.map(s => s.id),
    input_evidence_ids: mergedEvidence.map(e => e.id),
    events: reconstructionOutput.events || [],
    claims: reconstructionOutput.claims || [],
    gaps: reconstructionOutput.gaps || [],
    actions: reconstructionOutput.actions || [],
    summary: summaryWithDelta,
    revision_delta_summary: deltaSummary,
    model_id: usedModelId || inferenceModeModelId,
    reasoning_contract_version: '1.0.0',
  };

  return newRevision;
}
