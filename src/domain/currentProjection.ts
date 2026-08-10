import { UserStatement, EvidenceItem, CaseEvent, Claim, EvidenceGap, NextAction, PresentationCaseData } from '../types.js';
import { CanonicalCaseRecord } from '../canonical/types.js';
import { projectCurrentRecord } from '../canonical/project.js';

/**
 * Projects a CanonicalCaseRecord into the PresentationCaseData structure expected by the UI.
 * This preserves the UI presentation while enforcing the canonical source of truth.
 * Does not perform legacy upgrades. Accepts only a validated CanonicalCaseRecord.
 */
export function projectToPresentation(canonical: CanonicalCaseRecord): PresentationCaseData {
  const proj = projectCurrentRecord(canonical);

  const statements: UserStatement[] = proj.statements.map(s => ({
    id: s.id,
    text: s.text,
    submitted_at: s.submitted_at,
    attachment_ids: [] // Presentation only
  }));

  const evidence: EvidenceItem[] = proj.evidence.map(e => ({
    id: e.id,
    label: e.label,
    claimed_source: 'Unspecified Source',
    acquisition_method: 'user_upload',
    input_form: (e.input_form === 'image' || e.input_form === 'pdf' || e.input_form === 'document') ? e.input_form : 'other',
    evidence_time: null,
    received_at: e.submitted_at,
    subject_object_ids: [],
    content: 'Retrieved from canonical record.',
    file_name: e.label,
    file_type: e.mime_type || 'application/octet-stream',
    file_data_url: undefined, // Ephemeral data
    source_attribution: '',
    case_object_match: '',
    case_object_match_status: 'not_assessed',
    completeness_context: '',
    integrity_signals: '',
    corroborated_by: [],
    qualified_by: [],
    conflicted_by: [],
    limitations: []
  }));

  const events: CaseEvent[] = proj.events.map(ev => ({
    ...ev,
    effect: ev.effect || '',
    evidence_ids: [...ev.evidence_ids],
    user_statement_ids: []
  }));

  const claims: Claim[] = proj.claims.map(c => ({
    id: c.id,
    text: c.text,
    actor: 'Unknown',
    action: 'Unknown',
    target: 'Unknown',
    time: 'Unknown',
    supporting_evidence: [...c.supporting_evidence],
    qualifying_evidence: [...c.qualifying_evidence],
    conflicting_evidence: [...c.conflicting_evidence],
    user_statement_ids: [],
    assessment: c.assessment,
    reasoning: c.reasoning,
    scope: '',
    limits: [],
    causal_relationship: 'none'
  }));

  const gaps: EvidenceGap[] = proj.gaps.map(g => ({
    id: g.id,
    what_is_unknown: g.question_key,
    why_it_matters: '',
    what_evidence_could_resolve_it: '',
    where_how_to_obtain: '',
    what_not_to_over_collect: '',
    target_claim_ids: [...g.target_claim_ids]
  }));

  const actions: NextAction[] = proj.actions.map(a => ({
    id: a.id,
    title: a.description.slice(0, 30),
    description: a.description,
    target_gap_id: a.target_gap_ids[0] || '',
    priority: 'medium'
  }));

  return {
    id: canonical.id,
    case_number: canonical.case_number,
    title: proj.title,
    objective: proj.objective,
    user_story: '',
    statements,
    evidence,
    events,
    claims,
    gaps,
    actions,
    current_revision_id: canonical.current_revision_id,
    summary: {
      total_evidence_count: proj.summary.total_evidence_count,
      established_claims_count: proj.summary.established_claims_count,
      unresolved_claims_count: proj.summary.unresolved_claims_count,
      conflicted_claims_count: proj.summary.conflicted_claims_count,
      user_reported_claims_count: proj.summary.user_reported_claims_count,
      timeline_span: 'Pending',
      unresolved_questions_count: proj.gaps.filter(g => g.status === 'open').length,
      epistemic_warning: ''
    }
  };
}
