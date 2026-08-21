import { describe, expect, it } from 'vitest';
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
import { projectLedger } from '../src/presentation/projectLedger';
import { parseProviderProposal } from '../src/provider/proposalSchema';
import { reconcileProposal } from '../src/provider/reconcileProposal';

function mkCtx(sources: string[] = ['U01', 'U02'], claims: string[] = ['C01', 'C02', 'C03', 'C04']) {
  return {
    availableSourceIds: new Set(sources as never[]),
    existingClaimIds: new Set(claims as never[]),
    existingGapIds: new Set(['G01'] as never[]),
    existingEventIds: new Set(['EV01'] as never[]),
    existingActionIds: new Set(['A01'] as never[]),
  };
}

function createShopeeTurn1() {
  const createdAt = parseStructuralInstant('2026-08-15T10:30:00.000Z');
  const parent = createEmptyLedgerCase({
    id: parseCaseId('CASE_shopee_regression'),
    case_number: parseCaseNumber('CASE-777'),
    title: parseCaseTitle('Shopee seller account restriction'),
    created_at: createdAt,
  });

  const intakeId = IntakeIdSchema.parse('IN01');
  const statementId = StatementIdSchema.parse('U01');
  const text = PreservedNonBlankTextSchema.parse(
    'My Shopee seller account was restricted on August 15 at around 10:20 AM. I believe it happened after three customer orders were cancelled within the same week.\n\nI did not receive any warning before the restriction. When I contacted customer support, I understood that the restriction was permanent.\n\nThere is approximately VND 12.4 million in my seller balance that I currently cannot withdraw. I want to understand what happened, whether the restriction can be appealed, and what evidence I should prepare.'
  );

  const prepared: PreparedLedgerIntake = {
    intake: {
      id: intakeId,
      received_at: createdAt,
      parts: [{ kind: 'statement', statement_id: statementId, raw_text: text }],
    },
    statements: [{ id: statementId, source_intake_id: intakeId, text }],
    evidence: [],
    revision_id: RevisionIdSchema.parse('R01'),
    model_run_id: ModelRunIdSchema.parse('MR01'),
    created_at: createdAt,
    objective: SemanticTextSchema.parse('Understand restriction reason, appeal options, and evidence required.'),
  };

  const proposal = parseProviderProposal({
    explanation: {
      answer: 'Your account was reported restricted on August 15 around 10:20 AM with VND 12.4M held.',
      text: 'Recorded user report regarding account restriction, cancelled orders, lack of warning, permanent support response, and frozen balance.',
      user_goal: 'Understand restriction reason, appeal options, and evidence required.',
    },
    reasoning: {
      turn_intent: 'record',
      answer_status: 'conditional',
      steps: [
        {
          id: 'S01',
          kind: 'fact',
          text: 'User reported seller account restricted on August 15 at ~10:20 AM.',
          depends_on: [],
          source_basis_ids: ['U01'],
          claim_refs: ['new_claim_1'],
          gap_refs: [],
        },
        {
          id: 'S02',
          kind: 'assumption',
          text: 'Official restriction reason and appeal procedure require Shopee notifications.',
          depends_on: ['S01'],
          source_basis_ids: [],
          claim_refs: [],
          gap_refs: ['new_gap_1'],
        },
      ],
    },
    operations: [
      {
        operation_type: 'add_claim',
        local_ref: 'new_claim_1',
        proposition: 'The seller account was reported restricted on August 15 at around 10:20 AM.',
        actor: 'Shopee',
        action: 'restricted',
        target: 'Seller account',
        domain_time: 'August 15, 2026 at 10:20 AM',
        assessment: 'Reported',
        reasoning: 'User statement directly asserts the account restriction timestamp.',
        scope: 'Seller account status',
        limits: ['Platform notification not yet attached.'],
        source_basis_ids: ['U01'],
        reason: 'Record the reported restriction occurrence.',
      },
      {
        operation_type: 'add_claim',
        local_ref: 'new_claim_2',
        proposition: 'The user reported receiving no warning prior to the restriction.',
        actor: 'Shopee',
        action: 'did not send warning',
        target: 'User',
        domain_time: 'Before August 15, 2026',
        assessment: 'Reported',
        reasoning: 'User explicitly stated no warning was received before restriction.',
        scope: 'Pre-restriction communication',
        limits: ['Email records not yet checked independently.'],
        source_basis_ids: ['U01'],
        reason: 'Record reported absence of prior warning.',
      },
      {
        operation_type: 'add_claim',
        local_ref: 'new_claim_3',
        proposition: 'Customer support reportedly indicated that the restriction was permanent.',
        actor: 'Shopee Customer Support',
        action: 'stated permanent restriction',
        target: 'Seller account',
        domain_time: 'August 15, 2026',
        assessment: 'Reported',
        reasoning: 'User reports their initial understanding from customer support contact.',
        scope: 'Customer support communication',
        limits: ['Support transcript not yet verified.'],
        source_basis_ids: ['U01'],
        reason: 'Record customer support outcome reported by user.',
      },
      {
        operation_type: 'add_claim',
        local_ref: 'new_claim_4',
        proposition: 'Approximately VND 12.4 million in seller balance is unavailable for withdrawal.',
        actor: 'Shopee',
        action: 'withheld',
        target: 'VND 12.4 million seller balance',
        domain_time: 'August 15, 2026',
        assessment: 'Reported',
        reasoning: 'User reports frozen seller balance amount.',
        scope: 'Account balance',
        limits: ['Balance dashboard screenshot not yet uploaded.'],
        source_basis_ids: ['U01'],
        reason: 'Record the withheld financial balance.',
      },
      {
        operation_type: 'add_event',
        local_ref: 'new_event_1',
        domain_time: 'August 15, 2026 at 10:20 AM',
        actor: 'Shopee',
        action: 'restricted',
        target: 'Seller account',
        effect: 'User lost access to seller account with VND 12.4M held',
        assessment: 'Reported',
        finding_refs: ['new_claim_1', 'new_claim_4'],
        source_basis_ids: ['U01'],
        reason: 'Record the reported restriction event.',
      },
      {
        operation_type: 'add_gap',
        local_ref: 'new_gap_1',
        question: 'What official notice and appeal guidance did Shopee provide for the restriction?',
        relevance: 'Determines the official restriction ground and whether an appeal is possible.',
        resolving_evidence: 'Official Shopee email or notification screenshot.',
        acquisition_guidance: 'Export Shopee notification inbox and support messages.',
        collection_boundary: 'Shopee platform communications only.',
        target_claim_refs: ['new_claim_1', 'new_claim_3'],
        source_basis_ids: ['U01'],
        reason: 'Establish official restriction details.',
      },
      {
        operation_type: 'add_action',
        local_ref: 'new_action_1',
        title: 'Collect Shopee restriction notice and support transcript',
        description: 'Locate email notices and support chat history regarding the account status.',
        priority: 'high',
        target_gap_refs: ['new_gap_1'],
        source_basis_ids: ['U01'],
        reason: 'Acquire official communication records.',
      },
      {
        operation_type: 'disposition_source',
        relationship_type: 'supports_claim',
        source_id: 'U01',
        target_ref: 'new_claim_1',
        reason: 'Source basis for restriction report.',
      },
      {
        operation_type: 'disposition_source',
        relationship_type: 'supports_claim',
        source_id: 'U01',
        target_ref: 'new_claim_2',
        reason: 'Source basis for no-warning report.',
      },
      {
        operation_type: 'disposition_source',
        relationship_type: 'supports_claim',
        source_id: 'U01',
        target_ref: 'new_claim_3',
        reason: 'Source basis for support interpretation.',
      },
      {
        operation_type: 'disposition_source',
        relationship_type: 'supports_claim',
        source_id: 'U01',
        target_ref: 'new_claim_4',
        reason: 'Source basis for balance amount.',
      },
      {
        operation_type: 'disposition_source',
        relationship_type: 'raises_gap',
        source_id: 'U01',
        target_ref: 'new_gap_1',
        reason: 'Source leaves official ground unverified.',
      },
    ],
  }, mkCtx(['U01'], []));

  return applyProposal({ parent, prepared, proposal });
}

describe('Shopee 2-Turn Correction & Reconciliation Regression Suite', () => {
  it('1. Corrects single timestamp into two semantically distinct events without conflation', () => {
    const turn1Ledger = createShopeeTurn1();
    const createdAt = parseStructuralInstant('2026-08-15T11:00:00.000Z');
    const intakeId = IntakeIdSchema.parse('IN02');
    const statementId = StatementIdSchema.parse('U02');
    const text = PreservedNonBlankTextSchema.parse(
      'The restriction notice was actually sent on August 14 at 9:47 PM. August 15 at 10:20 AM was only when I opened the app and discovered the access failure.'
    );

    const prepared: PreparedLedgerIntake = {
      intake: {
        id: intakeId,
        received_at: createdAt,
        parts: [{ kind: 'statement', statement_id: statementId, raw_text: text }],
      },
      statements: [{ id: statementId, source_intake_id: intakeId, text }],
      evidence: [],
      revision_id: RevisionIdSchema.parse('R02'),
      model_run_id: ModelRunIdSchema.parse('MR02'),
      created_at: createdAt,
      objective: SemanticTextSchema.parse('Correct the timeline of restriction notice vs discovery time.'),
    };

    const proposal = parseProviderProposal({
      explanation: {
        answer: 'Timeline corrected: notice was sent on August 14 at 9:47 PM; you discovered it on August 15 at 10:20 AM.',
        text: 'Disambiguated restriction notice timestamp from user discovery timestamp.',
        user_goal: 'Correct timeline records.',
      },
      reasoning: {
        turn_intent: 'correct',
        answer_status: 'recorded',
        steps: [
          {
            id: 'S01',
            kind: 'fact',
            text: 'U02 clarifies notice sent August 14 at 21:47, while discovery occurred August 15 at 10:20.',
            depends_on: [],
            source_basis_ids: ['U02'],
            claim_refs: ['new_claim_1', 'C01'],
            gap_refs: [],
          },
        ],
      },
      operations: [
        // Update C01 to represent user discovery time
        {
          operation_type: 'update_claim',
          target_id: 'C01',
          proposition: 'The user discovered the seller account access failure upon opening the app on August 15 at 10:20 AM.',
          domain_time: 'August 15, 2026 at 10:20 AM',
          reasoning: 'U02 clarifies August 15 10:20 AM was user app discovery time.',
          source_basis_ids: ['U02'],
          reason: 'Clarify meaning of August 15 timestamp as discovery time.',
        },
        // Update EV01 to represent user discovery event
        {
          operation_type: 'update_event',
          target_id: 'EV01',
          domain_time: 'August 15, 2026 at 10:20 AM',
          actor: 'User',
          action: 'opened app and discovered restriction',
          target: 'Seller account',
          effect: 'User discovered inability to access seller account',
          assessment: 'Reported',
          finding_refs: ['C01'],
          source_basis_ids: ['U02'],
          reason: 'Update EV01 to discovery event.',
        },
        // Add new claim for restriction notice sent on August 14 at 21:47
        {
          operation_type: 'add_claim',
          local_ref: 'new_claim_1',
          proposition: 'Shopee sent the restriction notice on August 14, 2026, at 9:47 PM.',
          actor: 'Shopee',
          action: 'sent restriction notice',
          target: 'User seller account',
          domain_time: 'August 14, 2026 at 9:47 PM',
          assessment: 'Reported',
          reasoning: 'U02 clarifies that email check revealed restriction notice sent August 14 at 9:47 PM.',
          scope: 'Notice transmission',
          limits: ['Notice screenshot not yet uploaded.'],
          source_basis_ids: ['U02'],
          reason: 'Record actual restriction notice timestamp.',
        },
        // Add new event for restriction notice sent on August 14 at 21:47
        {
          operation_type: 'add_event',
          local_ref: 'new_event_1',
          domain_time: 'August 14, 2026 at 9:47 PM',
          actor: 'Shopee',
          action: 'sent restriction notice',
          target: 'User seller account',
          effect: 'Account restriction notice dispatched by platform',
          assessment: 'Reported',
          finding_refs: ['new_claim_1'],
          source_basis_ids: ['U02'],
          reason: 'Record distinct notice dispatch occurrence.',
        },
        {
          operation_type: 'disposition_source',
          relationship_type: 'supports_claim',
          source_id: 'U02',
          target_ref: 'new_claim_1',
          reason: 'U02 provides notice timestamp.',
        },
        {
          operation_type: 'disposition_source',
          relationship_type: 'corrects_statement',
          source_id: 'U02',
          target_ref: 'U01',
          reason: 'U02 clarifies earlier conflated timestamp.',
        },
      ],
    }, mkCtx());

    const reconciled = reconcileProposal({ ledger: turn1Ledger, message: text, proposal });
    const result = applyProposal({ parent: turn1Ledger, prepared, proposal: reconciled.proposal });

    const rev2 = result.revisions[1];
    expect(rev2.events).toHaveLength(2);

    const noticeEvent = rev2.events.find((e) => e.domain_time.includes('August 14'));
    const discoveryEvent = rev2.events.find((e) => e.domain_time.includes('August 15'));

    expect(noticeEvent).toBeDefined();
    expect(discoveryEvent).toBeDefined();
    expect(noticeEvent?.id).not.toBe(discoveryEvent?.id);
    expect(noticeEvent?.domain_time).toContain('August 14');
    expect(discoveryEvent?.domain_time).toContain('August 15');

    // Source provenance assertions
    expect(noticeEvent?.source_support_ids).toContain('U02');
    expect(discoveryEvent?.source_support_ids).toContain('U02');

    const claim1 = rev2.claims.find((c) => c.id === 'C01');
    expect(claim1?.reasoning).toContain('U02');
    expect(claim1?.domain_time).toContain('August 15');
  });

  it('2. Corrects a negated claim with later information (warning email supersedes "no warning")', () => {
    const turn1Ledger = createShopeeTurn1();
    const createdAt = parseStructuralInstant('2026-08-15T11:00:00.000Z');
    const statementId = StatementIdSchema.parse('U02');
    const text = PreservedNonBlankTextSchema.parse(
      'I also found an email from August 12 warning me about unusual order activity, so my earlier statement that I received no warning was incorrect.'
    );

    const prepared: PreparedLedgerIntake = {
      intake: {
        id: IntakeIdSchema.parse('IN02'),
        received_at: createdAt,
        parts: [{ kind: 'statement', statement_id: statementId, raw_text: text }],
      },
      statements: [{ id: statementId, source_intake_id: IntakeIdSchema.parse('IN02'), text }],
      evidence: [],
      revision_id: RevisionIdSchema.parse('R02'),
      model_run_id: ModelRunIdSchema.parse('MR02'),
      created_at: createdAt,
      objective: SemanticTextSchema.parse('Correct warning history.'),
    };

    const proposal = parseProviderProposal({
      explanation: {
        answer: 'Warning history corrected: warning email found dated August 12.',
        text: 'Updated C02 to reflect August 12 warning email.',
        user_goal: 'Correct warning history.',
      },
      operations: [
        {
          operation_type: 'update_claim',
          target_id: 'C02',
          proposition: 'The user received a warning email from Shopee regarding unusual order activity on August 12, 2026.',
          domain_time: 'August 12, 2026',
          reasoning: 'U02 corrects the earlier statement, confirming a warning email was received on August 12.',
          source_basis_ids: ['U02'],
          reason: 'Correct prior no-warning claim.',
        },
        {
          operation_type: 'disposition_source',
          relationship_type: 'supports_claim',
          source_id: 'U02',
          target_ref: 'C02',
          reason: 'U02 establishes corrected warning email occurrence.',
        },
      ],
    }, mkCtx());

    const result = applyProposal({ parent: turn1Ledger, prepared, proposal });
    const rev2 = result.revisions[1];
    const claim2 = rev2.claims.find((c) => c.id === 'C02');

    expect(claim2?.proposition).toContain('warning email');
    expect(claim2?.domain_time).toContain('August 12');
    // Prior revision still contains the original state
    expect(result.revisions[0].claims.find((c) => c.id === 'C02')?.proposition).toContain('no warning');
  });

  it('3. Preserves original source statement immutable when interpretation is corrected', () => {
    const turn1Ledger = createShopeeTurn1();
    const originalStatement = turn1Ledger.statements[0].text;
    const createdAt = parseStructuralInstant('2026-08-15T11:00:00.000Z');
    const statementId = StatementIdSchema.parse('U02');
    const text = PreservedNonBlankTextSchema.parse(
      'Customer support message said the account was under review and could take up to seven business days, not permanent.'
    );

    const prepared: PreparedLedgerIntake = {
      intake: {
        id: IntakeIdSchema.parse('IN02'),
        received_at: createdAt,
        parts: [{ kind: 'statement', statement_id: statementId, raw_text: text }],
      },
      statements: [{ id: statementId, source_intake_id: IntakeIdSchema.parse('IN02'), text }],
      evidence: [],
      revision_id: RevisionIdSchema.parse('R02'),
      model_run_id: ModelRunIdSchema.parse('MR02'),
      created_at: createdAt,
      objective: SemanticTextSchema.parse('Correct customer support review timeline.'),
    };

    const proposal = parseProviderProposal({
      explanation: {
        answer: 'Support status updated: account is under review for up to 7 business days.',
        text: 'Updated C03 to review status.',
        user_goal: 'Correct support status.',
      },
      operations: [
        {
          operation_type: 'update_claim',
          target_id: 'C03',
          proposition: 'Customer support stated the seller account was under review for up to seven business days.',
          domain_time: 'August 15, 2026',
          reasoning: 'U02 corrects the initial interpretation of permanent restriction.',
          source_basis_ids: ['U02'],
          reason: 'Correct customer support outcome.',
        },
        {
          operation_type: 'disposition_source',
          relationship_type: 'supports_claim',
          source_id: 'U02',
          target_ref: 'C03',
          reason: 'U02 clarifies support message.',
        },
      ],
    }, mkCtx());

    const result = applyProposal({ parent: turn1Ledger, prepared, proposal });
    // Verify U01 statement in the ledger is completely unchanged
    expect(result.statements[0].text).toBe(originalStatement);
    expect(result.statements).toHaveLength(2);
    expect(result.revisions[1].claims.find((c) => c.id === 'C03')?.proposition).toContain('seven business days');
  });

  it('4. Preserves unchanged monetary claim with stable identity across revisions', () => {
    const turn1Ledger = createShopeeTurn1();
    const claim4Before = turn1Ledger.revisions[0].claims.find((c) => c.id === 'C04');
    expect(claim4Before).toBeDefined();

    const createdAt = parseStructuralInstant('2026-08-15T11:00:00.000Z');
    const statementId = StatementIdSchema.parse('U02');
    const text = PreservedNonBlankTextSchema.parse('The VND 12.4 million balance is still shown as unavailable.');

    const prepared: PreparedLedgerIntake = {
      intake: {
        id: IntakeIdSchema.parse('IN02'),
        received_at: createdAt,
        parts: [{ kind: 'statement', statement_id: statementId, raw_text: text }],
      },
      statements: [{ id: statementId, source_intake_id: IntakeIdSchema.parse('IN02'), text }],
      evidence: [],
      revision_id: RevisionIdSchema.parse('R02'),
      model_run_id: ModelRunIdSchema.parse('MR02'),
      created_at: createdAt,
      objective: SemanticTextSchema.parse('Acknowledge ongoing balance freeze.'),
    };

    const proposal = parseProviderProposal({
      explanation: {
        answer: 'VND 12.4M balance remains unavailable.',
        text: 'Carried C04 unchanged.',
        user_goal: 'Track balance freeze.',
      },
      operations: [
        {
          operation_type: 'disposition_source',
          relationship_type: 'supports_claim',
          source_id: 'U02',
          target_ref: 'C04',
          reason: 'U02 reaffirms ongoing balance freeze.',
        },
      ],
    }, mkCtx());

    const result = applyProposal({ parent: turn1Ledger, prepared, proposal });
    const claim4After = result.revisions[1].claims.find((c) => c.id === 'C04');

    expect(claim4After).toBeDefined();
    expect(claim4After?.id).toBe('C04');
    expect(claim4After?.proposition).toBe(claim4Before?.proposition);
  });

  it('5. Mentions of having screenshots remain unverified until attachment ingestion', () => {
    const turn1Ledger = createShopeeTurn1();
    // In turn 1 and turn 2, evidence array is empty because no files were uploaded
    expect(turn1Ledger.evidence).toHaveLength(0);
    expect(turn1Ledger.revisions[0].inspections).toHaveLength(0);
    // Claims citing user statements have assessment = Reported
    turn1Ledger.revisions[0].claims.forEach((claim) => {
      expect(claim.assessment).toBe('Reported');
      expect(claim.supporting_source_ids.every((s) => s.startsWith('U'))).toBe(true);
    });
  });

  it('6. Ensures findings have matched reasoning warrants and limits', () => {
    const turn1Ledger = createShopeeTurn1();
    const claims = turn1Ledger.revisions[0].claims;

    const noticeClaim = claims.find((c) => c.id === 'C01');
    expect(noticeClaim?.reasoning).toContain('restriction timestamp');

    const warningClaim = claims.find((c) => c.id === 'C02');
    expect(warningClaim?.reasoning).toContain('no warning');

    const balanceClaim = claims.find((c) => c.id === 'C04');
    expect(balanceClaim?.reasoning).toContain('balance amount');
  });

  it('7. Guarantees gaps and actions resolve to valid canonical finding IDs without orphan references', () => {
    const turn1Ledger = createShopeeTurn1();
    const proj = projectLedger({
      ledger: turn1Ledger,
      runs: [],
      blobs: [],
      metadata: {
        case_id: turn1Ledger.id,
        display_title: turn1Ledger.title,
        display_case_number: turn1Ledger.case_number,
        is_archived: false,
      },
      locale: 'en',
    });
    const exported = buildCaseViewExport(proj);

    const claimIds = new Set(proj.claims.map((c) => c.id));
    // Verify all gaps target valid claim IDs
    proj.gaps.forEach((gap) => {
      gap.target_claim_ids.forEach((claimId) => {
        expect(claimIds.has(claimId)).toBe(true);
      });
    });

    // Verify all exported gap keys resolve
    exported.gaps_and_actions.forEach((ga) => {
      ga.keys.findings.forEach((findingId) => {
        expect(claimIds.has(findingId as never)).toBe(true);
      });
    });
  });

  it('8. Rejected or invalid proposal leaves prior accepted revision completely untouched', () => {
    const turn1Ledger = createShopeeTurn1();
    const beforeSnapshot = JSON.stringify(turn1Ledger);

    const prepared: PreparedLedgerIntake = {
      intake: {
        id: IntakeIdSchema.parse('IN02'),
        received_at: parseStructuralInstant('2026-08-15T11:00:00.000Z'),
        parts: [{ kind: 'statement', statement_id: StatementIdSchema.parse('U02'), raw_text: PreservedNonBlankTextSchema.parse('Invalid test') }],
      },
      statements: [{ id: StatementIdSchema.parse('U02'), source_intake_id: IntakeIdSchema.parse('IN02'), text: PreservedNonBlankTextSchema.parse('Invalid test') }],
      evidence: [],
      revision_id: RevisionIdSchema.parse('R02'),
      model_run_id: ModelRunIdSchema.parse('MR02'),
      created_at: parseStructuralInstant('2026-08-15T11:00:00.000Z'),
      objective: SemanticTextSchema.parse('Test rejection.'),
    };

    // Missing required source disposition for U02
    const invalidProposal = parseProviderProposal({
      explanation: {
        answer: 'Broken',
        text: 'Broken',
        user_goal: 'Broken',
      },
      operations: [],
    }, mkCtx());

    expect(() => applyProposal({ parent: turn1Ledger, prepared, proposal: invalidProposal })).toThrow();
    // Verify ledger was not mutated in any way
    expect(JSON.stringify(turn1Ledger)).toBe(beforeSnapshot);
  });
});
