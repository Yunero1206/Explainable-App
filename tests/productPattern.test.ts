import { describe, expect, it } from 'vitest';
import { createProposalPrompt } from '../server/proposalProvider';
import { applyProposal, type PreparedLedgerIntake } from '../src/ledger/applyProposal';
import { createEmptyLedgerCase } from '../src/ledger/factory';
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
} from '../src/ledger/schema';
import { buildCaseViewExport } from '../src/presentation/exportCase';
import { deriveChatMessages, projectLedger } from '../src/presentation/projectLedger';
import { parseProviderProposal } from '../src/provider/proposalSchema';

const GREENPACK_NARRATIVE = `On 5 June 2026, Lá Mới ordered 3,000 GreenPack cups. The delivery note later showed 2,800, while the warehouse counted 2,760. Internal testing found 20 failures in 200 cups under mixed drink conditions. About 430 cups reached customers; 27 reported odor and 11 softness, with possible overlap. The store rating fell from 4.9 to 4.6 during a week that also included late deliveries. GreenPack offered to replace 300 cups if the final 40% was paid and the warning post was deleted. The user must decide by Friday whether to quarantine, continue selling, demand replacement or refund, or dispute.`;

function greenPackFixture() {
  const createdAt = parseStructuralInstant('2026-08-11T08:00:00.000Z');
  const parent = createEmptyLedgerCase({
    id: parseCaseId('CASE_greenpack-golden'),
    case_number: parseCaseNumber('CASE-001'),
    title: parseCaseTitle('GreenPack cup quality decision'),
    created_at: createdAt,
  });
  const intakeId = IntakeIdSchema.parse('IN01');
  const statementId = StatementIdSchema.parse('U01');
  const statementText = PreservedNonBlankTextSchema.parse(GREENPACK_NARRATIVE);
  const prepared: PreparedLedgerIntake = {
    intake: {
      id: intakeId,
      received_at: createdAt,
      parts: [{ kind: 'statement', statement_id: statementId, raw_text: statementText }],
    },
    statements: [{ id: statementId, source_intake_id: intakeId, text: statementText }],
    evidence: [],
    revision_id: RevisionIdSchema.parse('R01'),
    model_run_id: ModelRunIdSchema.parse('MR01'),
    created_at: createdAt,
    objective: SemanticTextSchema.parse('Decide whether to sell, quarantine, recover, or dispute.'),
  };

  const materialEvents = [
    {
      time: '5 June 2026', actor: 'Lá Mới', action: 'ordered', target: '3,000 GreenPack cups',
      effect: 'The order created the 3,000-unit commercial baseline.',
      proposition: 'Lá Mới reports ordering 3,000 cups at VND 8,400 each with quality promises communicated in chat.',
    },
    {
      time: 'Before delivery', actor: 'Lá Mới team', action: 'tested', target: 'the approved sample with hot water',
      effect: 'No leak was observed for about 30 minutes, but temperature and video were not recorded.',
      proposition: 'The sample reportedly passed an informal hot-water check whose conditions were not documented.',
    },
    {
      time: '12 July 2026', actor: 'GreenPack delivery note', action: 'listed', target: '2,800 delivered cups',
      effect: 'This is the delivery-document baseline, not the purchase-order baseline.',
      proposition: 'The delivery note reportedly listed 2,800 cups.',
    },
    {
      time: '12 July 2026', actor: 'Lá Mới warehouse', action: 'counted', target: '2,760 received cups',
      effect: 'The count is 40 below the delivery note and 240 below the order.',
      proposition: 'The warehouse reportedly counted 2,760 cups, creating two distinct quantity variances: 40 versus the note and 240 versus the order.',
    },
    {
      time: 'After delivery', actor: 'Lá Mới team', action: 'tested', target: '200 cups under mixed drink conditions',
      effect: '20 became soft or leaked, but the mixed conditions prevent a clean failure-rate attribution.',
      proposition: 'Internal testing reportedly found 20 failures among 200 cups, with hot water and milk tea mixed across the test.',
    },
    {
      time: 'During the delayed campaign', actor: 'Customers', action: 'reported', target: 'odor and softness after about 430 cups reached customers',
      effect: 'There were 27 odor reports and 11 softness reports, with possible overlap between reporters.',
      proposition: 'Customer reports included 27 odor complaints and 11 softness complaints, but the unique affected-customer count is unresolved.',
    },
    {
      time: 'That week', actor: 'The storefront rating', action: 'fell', target: 'from 4.9 to 4.6',
      effect: 'Three late deliveries in the same week confound attribution to cup quality.',
      proposition: 'The rating reportedly fell from 4.9 to 4.6, but the record does not establish how much was caused by cup complaints.',
    },
    {
      time: 'Before the Friday decision', actor: 'GreenPack', action: 'offered', target: 'replacement of 300 cups',
      effect: 'The offer was conditioned on final payment and deletion of the warning post, while certificate and shortage questions remained unanswered.',
      proposition: 'GreenPack reportedly offered 300 replacement cups subject to payment and post deletion without resolving the certificate or missing quantity.',
    },
  ];

  const claimOperations = materialEvents.map((item, index) => ({
    operation_type: 'add_claim',
    local_ref: `new_claim_${index + 1}`,
    proposition: item.proposition,
    actor: item.actor,
    action: item.action,
    target: item.target,
    domain_time: item.time,
    assessment: 'Reported',
    reasoning: 'The proposition is bounded to U01 and is not promoted beyond the submitted narrative.',
    scope: 'Current submitted case record.',
    limits: ['No independent documentary corroboration has been accepted for this proposition.'],
    source_basis_ids: ['U01'],
    reason: `Keep material finding ${index + 1} independent.`,
  }));
  const eventOperations = materialEvents.map((item, index) => ({
    operation_type: 'add_event',
    local_ref: `new_event_${index + 1}`,
    domain_time: item.time,
    actor: item.actor,
    action: item.action,
    target: item.target,
    effect: item.effect,
    assessment: 'Reported',
    finding_refs: [`new_claim_${index + 1}`],
    source_basis_ids: ['U01'],
    reason: `Preserve material occurrence ${index + 1} in the timeline.`,
  }));
  const gapOperations = [
    {
      operation_type: 'add_gap', local_ref: 'new_gap_1',
      question: 'Which lots or cartons are affected, and under what controlled conditions do the cups fail?',
      relevance: 'This determines whether any stock can be released safely before Friday.',
      resolving_evidence: 'Lot-level sampling with fixed drink type, temperature, duration, and retained samples.',
      acquisition_guidance: 'Quarantine first, then run and document a controlled sample by carton.',
      collection_boundary: 'Do not expose unrelated customer identities or payment data.',
      target_claim_refs: ['new_claim_5', 'new_claim_6'], source_basis_ids: ['U01'], reason: 'The defect scope changes the immediate sell-or-stop decision.',
    },
    {
      operation_type: 'add_gap', local_ref: 'new_gap_2',
      question: 'Where are the 40 cups missing against the delivery note, and how will the 240-unit order variance be reconciled?',
      relevance: 'The two quantity baselines affect payment, replacement, and dispute scope.',
      resolving_evidence: 'Signed loading, carrier, delivery, and warehouse count records.',
      acquisition_guidance: 'Request the missing-shipment record and reconcile PO, delivery note, and count separately.',
      collection_boundary: 'Collect only order and shipment records for this lot.',
      target_claim_refs: ['new_claim_3', 'new_claim_4'], source_basis_ids: ['U01'], reason: 'Distinct baselines must remain distinct.',
    },
    {
      operation_type: 'add_gap', local_ref: 'new_gap_3',
      question: 'Can GreenPack provide the promised food-contact and heat-resistance certificate and justify the 300-cup remedy?',
      relevance: 'The missing certificate and remedy basis affect acceptance, payment, and escalation.',
      resolving_evidence: 'Certificate tied to the supplied product and a written remedy calculation.',
      acquisition_guidance: 'Request both items in writing before releasing the final payment or deleting evidence.',
      collection_boundary: 'Do not request unrelated factory or employee records.',
      target_claim_refs: ['new_claim_1', 'new_claim_8'], source_basis_ids: ['U01'], reason: 'Supplier representations and remedy conditions remain unresolved.',
    },
  ];
  const actionOperations = [
    { operation_type: 'add_action', local_ref: 'new_action_1', title: 'Quarantine the remaining cups', description: 'Pause release of all unverified cartons and preserve representative samples while the affected scope is tested.', priority: 'high', target_gap_refs: ['new_gap_1'], source_basis_ids: ['U01'], reason: 'A reversible protective step reduces further customer exposure.' },
    { operation_type: 'add_action', local_ref: 'new_action_2', title: 'Run a controlled lot test', description: 'Document carton, drink type, temperature, duration, odor, softness, and seam leakage.', priority: 'high', target_gap_refs: ['new_gap_1'], source_basis_ids: ['U01'], reason: 'Controlled conditions can distinguish scope and failure modes.' },
    { operation_type: 'add_action', local_ref: 'new_action_3', title: 'Hold the final payment pending reconciliation', description: 'Keep the final 40% on hold while the shipment variance, certificate, and remedy basis remain unresolved.', priority: 'high', target_gap_refs: ['new_gap_2', 'new_gap_3'], source_basis_ids: ['U01'], reason: 'The unresolved commercial record is material to payment.' },
    { operation_type: 'add_action', local_ref: 'new_action_4', title: 'Prepare customer and partner recovery', description: 'Notify the three partner cafés, preserve complaint records without double-counting, and define replacement, refund, or dispute escalation.', priority: 'high', target_gap_refs: ['new_gap_1', 'new_gap_3'], source_basis_ids: ['U01'], reason: 'Recovery must address already-exposed customers and partners.' },
  ];
  const dispositionOperations = [
    ...materialEvents.map((_, index) => ({
      operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01',
      target_ref: `new_claim_${index + 1}`, reason: `U01 directly reports finding ${index + 1}.`,
    })),
    ...[1, 2, 3].map((index) => ({
      operation_type: 'disposition_source', relationship_type: 'raises_gap', source_id: 'U01',
      target_ref: `new_gap_${index}`, reason: `U01 leaves material gap ${index} unresolved.`,
    })),
  ];

  const rawProposal = {
    explanation: {
      text: 'Lá Mới received a late and short GreenPack shipment, then observed mixed-condition test failures and customer complaints while key certificate, quantity, and remedy questions remained unresolved.',
      user_goal: 'Decide by Friday whether to quarantine, continue selling, seek replacement or refund, hold payment, or open a dispute.',
    },
    operations: [
      ...claimOperations,
      ...eventOperations,
      ...gapOperations,
      ...actionOperations,
      ...dispositionOperations,
    ],
  };
  const proposal = parseProviderProposal(rawProposal, {
    availableSourceIds: new Set([statementId]),
    existingClaimIds: new Set(), existingGapIds: new Set(), existingEventIds: new Set(), existingActionIds: new Set(),
  });
  const ledger = applyProposal({ parent, prepared, proposal });
  const projected = projectLedger({
    ledger,
    runs: [],
    blobs: [],
    metadata: { case_id: ledger.id, display_title: ledger.title, display_case_number: ledger.case_number, is_archived: false },
    locale: 'en',
  });
  return { parent, prepared, ledger, projected };
}

describe('restored product analysis pattern', () => {
  it('keeps GreenPack material events independent and connects the complete case view', () => {
    const { projected } = greenPackFixture();

    expect(projected.events).toHaveLength(8);
    expect(projected.claims).toHaveLength(8);
    expect(projected.events.every((event) => event.finding_ids.length === 1)).toBe(true);
    expect(projected.events[2].target).toContain('2,800');
    expect(projected.events[3].target).toContain('2,760');
    expect(projected.events[3].effect).toContain('40 below the delivery note');
    expect(projected.events[3].effect).toContain('240 below the order');
    expect(projected.events[3].effect).not.toContain('40 to 240');

    expect(projected.gaps[0].related_event_ids).toEqual(['EV05', 'EV06']);
    expect(projected.actions.find((action) => action.id === 'A01')).toMatchObject({
      title: 'Quarantine the remaining cups',
      target_gap_ids: ['G01'],
      related_event_ids: ['EV05', 'EV06'],
    });
  });

  it('projects the concise accepted chat response and one synchronized export view', () => {
    const { ledger, projected } = greenPackFixture();
    const messages = deriveChatMessages(ledger, [], 'CASE-001', 'en');
    const assistant = messages.find((message) => message.role === 'assistant');

    expect(assistant?.text).toContain('Summary: Lá Mới received a late and short GreenPack shipment');
    expect(assistant?.text).toContain('You want: Decide by Friday');
    expect(assistant?.text).toContain('Timeline (8): [EV01] [EV02] [EV03] [EV04] [EV05] [EV06] [EV07] [EV08]');
    expect(assistant?.text).toContain('Evidence (0): no new evidence; narrative source [U01]');

    const exported = buildCaseViewExport(projected);
    const serialized = JSON.stringify(exported);
    expect(exported.timeline).toHaveLength(8);
    expect(exported.gaps_and_actions).toHaveLength(3);
    expect(exported.timeline[4].keys).toMatchObject({ case_number: 'CASE-001', event: 'EV05', findings: ['C05'] });
    expect(exported.gaps_and_actions[0].keys.events).toEqual(['EV05', 'EV06']);
    expect(serialized).not.toContain('model_runs');
    expect(serialized).not.toContain('Revision audit');
    expect(serialized).not.toContain('authoritative_record');
  });

  it('gives Gemini the original analysis loop and removes the evidence-only action restriction', () => {
    const { parent, prepared } = greenPackFixture();
    const prompt = createProposalPrompt({ ledger: parent, prepared, message: GREENPACK_NARRATIVE, locale: 'en', attachments: [] });

    expect(prompt).toContain('source content -> material event -> independent finding');
    expect(prompt).toContain('Preserve every independent material occurrence as its own timeline event');
    expect(prompt).toContain('The same source may relate to multiple distinct claims or gaps');
    expect(prompt).toContain('protect people or assets while uncertainty remains, or recover and resolve the case');
    expect(prompt).toContain('explanation.user_goal');
    expect(prompt).not.toContain('Suggested actions may only acquire or verify evidence');
  });
});
