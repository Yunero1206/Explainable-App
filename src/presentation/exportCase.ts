import type { PresentationCaseData } from '../types.js';

export interface CaseViewExport {
  export_version: 'case-view-2.0.0';
  case: {
    case_id: string;
    case_number: string;
    title: string;
    user_goal: string;
    current_revision_id: string | null;
  };
  timeline: Array<{
    keys: {
      case_number: string;
      event: string;
      statements: string[];
      evidence: string[];
      findings: string[];
    };
    time: string;
    actor: string;
    action: string;
    target: string;
    effect: string;
    assessment: string;
    statements: Array<{
      id: string;
      text: string;
      submitted_at: string;
    }>;
    evidence: Array<{
      id: string;
      label: string;
      claimed_source: string;
      evidence_time: string | null;
      content: string;
      source_attribution: string;
      case_object_match: string;
      completeness_context: string;
      integrity_signals: string;
      limitations: string[];
    }>;
    findings: Array<{
      id: string;
      text: string;
      assessment: string;
      reasoning: string;
      scope: string;
      limits: string[];
    }>;
  }>;
  gaps_and_actions: Array<{
    keys: {
      case_number: string;
      gap: string;
      events: string[];
      findings: string[];
      evidence: string[];
      actions: string[];
    };
    status: string;
    unknown: string;
    relevance: string;
    resolving_evidence: string;
    acquisition_guidance: string;
    collection_boundary: string;
    actions: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      status: string;
      target_gap_ids: string[];
      related_event_ids: string[];
      finding_ids: string[];
      evidence_ids: string[];
    }>;
  }>;
}

export function buildCaseViewExport(caseData: PresentationCaseData): CaseViewExport {
  const statementById = new Map(caseData.statements.map((item) => [item.id, item]));
  const evidenceById = new Map(caseData.evidence.map((item) => [item.id, item]));
  const findingById = new Map(caseData.claims.map((item) => [item.id, item]));

  return {
    export_version: 'case-view-2.0.0',
    case: {
      case_id: caseData.id,
      case_number: caseData.case_number,
      title: caseData.title,
      user_goal: caseData.objective,
      current_revision_id: caseData.current_revision_id ?? null,
    },
    timeline: caseData.events.map((event) => ({
      keys: {
        case_number: caseData.case_number,
        event: event.id,
        statements: [...event.user_statement_ids],
        evidence: [...event.evidence_ids],
        findings: [...event.finding_ids],
      },
      time: event.time,
      actor: event.actor,
      action: event.action,
      target: event.target,
      effect: event.effect,
      assessment: event.assessment,
      statements: event.user_statement_ids
        .map((id) => statementById.get(id))
        .filter((item) => item !== undefined)
        .map((item) => ({ id: item.id, text: item.text, submitted_at: item.submitted_at })),
      evidence: event.evidence_ids
        .map((id) => evidenceById.get(id))
        .filter((item) => item !== undefined)
        .map((item) => ({
          id: item.id,
          label: item.label,
          claimed_source: item.claimed_source,
          evidence_time: item.evidence_time,
          content: item.content,
          source_attribution: item.source_attribution,
          case_object_match: item.case_object_match,
          completeness_context: item.completeness_context,
          integrity_signals: item.integrity_signals,
          limitations: [...item.limitations],
        })),
      findings: event.finding_ids
        .map((id) => findingById.get(id))
        .filter((item) => item !== undefined)
        .map((item) => ({
          id: item.id,
          text: item.text,
          assessment: item.assessment,
          reasoning: item.reasoning,
          scope: item.scope,
          limits: [...item.limits],
        })),
    })),
    gaps_and_actions: caseData.gaps.map((gap) => {
      const actions = caseData.actions.filter((action) => action.target_gap_ids.includes(gap.id));
      return {
        keys: {
          case_number: caseData.case_number,
          gap: gap.id,
          events: [...gap.related_event_ids],
          findings: [...gap.target_claim_ids],
          evidence: [...gap.evidence_ids],
          actions: actions.map((action) => action.id),
        },
        status: gap.status,
        unknown: gap.what_is_unknown,
        relevance: gap.why_it_matters,
        resolving_evidence: gap.what_evidence_could_resolve_it,
        acquisition_guidance: gap.where_how_to_obtain,
        collection_boundary: gap.what_not_to_over_collect,
        actions: actions.map((action) => ({
          id: action.id,
          title: action.title,
          description: action.description,
          priority: action.priority,
          status: action.status,
          target_gap_ids: [...action.target_gap_ids],
          related_event_ids: [...action.related_event_ids],
          finding_ids: [...action.finding_ids],
          evidence_ids: [...action.evidence_ids],
        })),
      };
    }),
  };
}
