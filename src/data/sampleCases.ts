import { applyProposal } from '../ledger/applyProposal.js';
import { createEmptyLedgerCase } from '../ledger/factory.js';
import {
  IntakeIdSchema,
  ModelRunIdSchema,
  PreservedNonBlankTextSchema,
  RevisionIdSchema,
  SemanticTextSchema,
  StatementIdSchema,
  parseCaseId,
  parseCaseNumber,
  parseCaseTitle,
  parseStructuralInstant,
} from '../ledger/schema.js';
import { parseProviderProposal } from '../provider/proposalSchema.js';
import { parseModelRunAudit } from '../runtime/modelRun.js';

const createdAt = parseStructuralInstant('2026-08-11T02:00:00.000Z');
const parent = createEmptyLedgerCase({
  id: parseCaseId('CASE_quickbite-demo'),
  case_number: parseCaseNumber('DEMO-001'),
  title: parseCaseTitle('QuickBite damaged delivery'),
  created_at: createdAt,
});
const intakeId = IntakeIdSchema.parse('IN01');
const statementId = StatementIdSchema.parse('U01');
const revisionId = RevisionIdSchema.parse('R01');
const modelRunId = ModelRunIdSchema.parse('MR01');
const statementText = PreservedNonBlankTextSchema.parse('My QuickBite order arrived damaged, and I want to determine what the current record supports.');
const rawProposal = {
  explanation: {
    text: 'Recorded the damaged-delivery report as a sourced proposition and opened a focused verification gap.'
  },
  operations: [
    {
      operation_type: 'add_event',
      local_ref: 'new_event_1',
      domain_time: 'At delivery, as reported by the user',
      actor: 'QuickBite customer',
      action: 'reported receiving',
      target: 'a damaged order',
      effect: 'The delivery condition is disputed and requires a corroborating record.',
      assessment: 'Reported',
      source_basis_ids: ['U01'],
      reason: 'The event is bounded to the submitted user report.',
    },
    {
      operation_type: 'add_claim',
      local_ref: 'new_claim_1',
      proposition: 'The customer reported that the QuickBite order arrived damaged.',
      actor: 'QuickBite customer',
      action: 'reported',
      target: 'damage to the delivered order',
      domain_time: 'At delivery, as reported by the user',
      assessment: 'Reported',
      reasoning: 'The current record contains the customer statement but no independently inspected delivery artifact.',
      scope: 'The condition of the order at delivery.',
      limits: ['No photo, receipt, support message, or merchant response has been accepted yet.'],
      source_basis_ids: ['U01'],
      reason: 'The user statement creates a material but single-source proposition.',
    },
    {
      operation_type: 'disposition_source',
      relationship_type: 'supports_claim',
      source_id: 'U01',
      target_ref: 'new_claim_1',
      reason: 'U01 is the direct source for the reported proposition.',
    },
    {
      operation_type: 'add_gap',
      local_ref: 'new_gap_1',
      question: 'What contemporaneous record shows the order condition at delivery?',
      relevance: 'A focused record could corroborate or qualify the damage report.',
      resolving_evidence: 'A delivery photo, support message, or merchant acknowledgment tied to the order.',
      acquisition_guidance: 'Submit one relevant photo or message with unrelated personal details removed.',
      collection_boundary: 'Do not submit unrelated order history, payment credentials, or identity documents.',
      target_claim_refs: ['new_claim_1'],
      source_basis_ids: ['U01'],
      reason: 'The report is not independently corroborated in the accepted record.',
    },
    {
      operation_type: 'add_action',
      local_ref: 'new_action_1',
      title: 'Add one delivery-condition record',
      description: 'Upload a relevant delivery photo or support response tied to this order.',
      priority: 'high',
      target_gap_refs: ['new_gap_1'],
      source_basis_ids: ['U01'],
      reason: 'The action directly targets the open verification gap.',
    },
  ],
};
const proposal = parseProviderProposal(rawProposal, {
  availableSourceIds: new Set([statementId]),
  existingClaimIds: new Set(),
  existingGapIds: new Set(),
  existingEventIds: new Set(),
  existingActionIds: new Set(),
});
const ledger = applyProposal({
  parent,
  prepared: {
    intake: {
      id: intakeId,
      received_at: createdAt,
      parts: [{ kind: 'statement', statement_id: statementId, raw_text: statementText }],
    },
    statements: [{ id: statementId, source_intake_id: intakeId, text: statementText }],
    evidence: [],
    revision_id: revisionId,
    model_run_id: modelRunId,
    created_at: createdAt,
    objective: SemanticTextSchema.parse('Determine what the accepted record supports about the reported damaged delivery.'),
  },
  proposal,
});
const run = parseModelRunAudit({
  id: modelRunId,
  case_id: ledger.id,
  client_request_id: 'seed-quickbite-demo',
  parent_revision_id: null,
  proposed_revision_id: revisionId,
  committed_revision_id: revisionId,
  provider: 'deterministic-replay',
  model_id: 'gemini-3.5-flash',
  prompt_version: 'explainable-trust-proposal-v1',
  started_at: createdAt,
  finished_at: createdAt,
  status: 'accepted',
  raw_response_text: JSON.stringify(rawProposal),
  validation_errors: [],
});

export const SAMPLE_CASES = [{ ledger, run }] as const;
