import { describe, expect, it } from 'vitest';
import { applyProposal, type PreparedLedgerIntake } from '../src/ledger/applyProposal';
import { parseProviderProposal } from '../src/provider/proposalSchema';
import { deriveChatMessages } from '../src/presentation/projectLedger';
import {
  ProposalReconciliationError,
  reconcileProposal,
} from '../src/provider/reconcileProposal';
import {
  buildOneRevisionCase,
  mkClaimId,
  mkInstant,
  mkIntakeId,
  mkModelRunId,
  mkPNBT,
  mkRevisionId,
  mkST,
  mkStatementId,
} from './fixtures/ledgerV3';

function correctionPrepared(): PreparedLedgerIntake {
  const intakeId = mkIntakeId('IN02');
  const statementId = mkStatementId('U02');
  const text = mkPNBT('Correction: C01 and EV01 occurred on 2025-01-11; refine G01 and A01 accordingly.');
  return {
    intake: {
      id: intakeId,
      received_at: mkInstant('2026-08-11T02:00:00.000Z'),
      parts: [{ kind: 'statement', statement_id: statementId, raw_text: text }],
    },
    statements: [{ id: statementId, source_intake_id: intakeId, text }],
    evidence: [],
    revision_id: mkRevisionId('R02'),
    model_run_id: mkModelRunId('MR02'),
    created_at: mkInstant('2026-08-11T03:00:00.000Z'),
    objective: mkST('Correct the accepted occurrence without duplicating it.'),
  };
}

function correctionProposal() {
  return parseProviderProposal({
    explanation: {
      answer: 'The correction updates the existing records instead of adding semantic copies.',
      text: 'The accepted date, finding, blocker, and action are corrected under their stable IDs.',
      user_goal: 'Correct the accepted occurrence without losing revision history.',
    },
    reasoning: {
      turn_intent: 'correct',
      answer_status: 'recorded',
      steps: [{
        id: 'S01',
        kind: 'fact',
        text: 'U02 corrects the date and wording of the accepted occurrence.',
        depends_on: [],
        source_basis_ids: ['U02'],
        claim_refs: ['new_claim_1'],
        gap_refs: ['new_gap_1'],
      }],
    },
    operations: [
      {
        operation_type: 'add_claim', local_ref: 'new_claim_1',
        proposition: 'Sample item status changed to blue on 2025-01-11', actor: 'Sample operator',
        action: 'changed status', target: 'Sample item', domain_time: '2025-01-11',
        assessment: 'Reported', reasoning: 'U02 corrects the prior date.',
        scope: 'Sample item only', limits: [], source_basis_ids: ['U02'],
        reason: 'Apply the user correction to C01.',
      },
      {
        operation_type: 'add_event', local_ref: 'new_event_1', domain_time: '2025-01-11',
        actor: 'Sample operator', action: 'changed status', target: 'Sample item', effect: 'Item label is blue',
        assessment: 'Reported', finding_refs: ['new_claim_1'], source_basis_ids: ['U02'],
        reason: 'Apply the corrected occurrence date to EV01.',
      },
      {
        operation_type: 'add_gap', local_ref: 'new_gap_1',
        question: 'Has status confirmation for 2025-01-11 been obtained?',
        relevance: 'Determines whether the corrected status date is corroborated.',
        resolving_evidence: 'Status log dated 2025-01-11.',
        acquisition_guidance: 'Request the smallest relevant status record.',
        collection_boundary: 'Do not collect unrelated records.',
        target_claim_refs: ['new_claim_1'], source_basis_ids: ['U02'],
        reason: 'Refine G01 around the corrected date.',
      },
      {
        operation_type: 'add_action', local_ref: 'new_action_1',
        title: 'Request the 2025-01-11 status record',
        description: 'Ask for the log tied to the corrected status date.',
        priority: 'high', target_gap_refs: ['new_gap_1'], source_basis_ids: ['U02'],
        reason: 'Refine A01 around the corrected date.',
      },
      {
        operation_type: 'disposition_source', relationship_type: 'supports_claim',
        source_id: 'U02', target_ref: 'new_claim_1', reason: 'U02 supplies the corrected report.',
      },
      {
        operation_type: 'disposition_source', relationship_type: 'raises_gap',
        source_id: 'U02', target_ref: 'new_gap_1', reason: 'U02 leaves confirmation of the corrected date open.',
      },
      {
        operation_type: 'disposition_source', relationship_type: 'corrects_statement',
        source_id: 'U02', target_ref: 'U01', reason: 'U02 explicitly corrects the earlier statement.',
      },
    ],
  }, {
    availableSourceIds: new Set(['U01', 'U02', 'E01'].map((id) => id as never)),
    existingClaimIds: new Set([mkClaimId('C01')]),
    existingGapIds: new Set(['G01' as never]),
    existingEventIds: new Set(['EV01' as never]),
    existingActionIds: new Set(['A01' as never]),
  });
}

describe('app-owned proposal reconciliation', () => {
  it('turns correction-shaped additions into updates and preserves prior revision snapshots', () => {
    const parent = buildOneRevisionCase();
    const parentBefore = structuredClone(parent);
    const reconciled = reconcileProposal({
      ledger: parent,
      message: correctionPrepared().statements[0].text,
      proposal: correctionProposal(),
    });

    expect(reconciled.trace.converted_adds_to_updates).toBe(4);
    expect(reconciled.proposal.operations.filter((operation) => operation.operation_type.startsWith('add_'))).toEqual([]);
    expect(reconciled.proposal.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation_type: 'update_claim', target_id: 'C01' }),
      expect.objectContaining({ operation_type: 'update_event', target_id: 'EV01', finding_refs: ['C01'] }),
      expect.objectContaining({ operation_type: 'update_gap', target_id: 'G01', target_claim_refs: ['C01'] }),
      expect.objectContaining({ operation_type: 'update_action', target_id: 'A01', target_gap_refs: ['G01'] }),
      expect.objectContaining({ operation_type: 'disposition_source', target_ref: 'C01' }),
      expect.objectContaining({ operation_type: 'disposition_source', target_ref: 'G01' }),
    ]));

    const result = applyProposal({ parent, prepared: correctionPrepared(), proposal: reconciled.proposal });
    expect(parent).toEqual(parentBefore);
    expect(result.revisions[0]).toEqual(parentBefore.revisions[0]);
    expect(result.revisions[1].events).toHaveLength(1);
    expect(result.revisions[1].claims).toHaveLength(1);
    expect(result.revisions[1].gaps).toHaveLength(1);
    expect(result.revisions[1].actions).toHaveLength(1);
    expect(result.revisions[1].events[0]).toMatchObject({ id: 'EV01', domain_time: '2025-01-11' });
    expect(result.revisions[1].claims[0]).toMatchObject({ id: 'C01', proposition: 'Sample item status changed to blue on 2025-01-11' });
    expect(result.revisions[1].reasoning?.steps[0]).toMatchObject({ claim_ids: ['C01'], gap_ids: ['G01'] });
    const assistant = deriveChatMessages(result, []).find((message) => message.id === 'revision-R02');
    expect(assistant?.text).toContain('The correction updates the existing records');
    expect(assistant?.text).toContain('Reasoning:');
    expect(assistant?.text).toContain('S01 · Fact:');
    expect(assistant?.text).toContain('[U02] [C01] [G01]');
    expect(result.revisions[1].delta.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ entity_type: 'event', entity_id: 'EV01', operation: 'update' }),
      expect.objectContaining({ entity_type: 'claim', entity_id: 'C01', operation: 'update' }),
      expect.objectContaining({ entity_type: 'gap', entity_id: 'G01', operation: 'update' }),
      expect.objectContaining({ entity_type: 'action', entity_id: 'A01', operation: 'update' }),
    ]));
  });

  it('fails closed when a correction plausibly targets multiple Claims without a canonical ID', () => {
    const ledger = buildOneRevisionCase();
    const head = ledger.revisions[0];
    head.claims[0] = {
      ...head.claims[0],
      proposition: mkST('Sample item status changed to blue on 2025-01-11'),
      actor: mkST('Sample operator'),
      action: mkST('changed status'),
      target: mkST('Sample item'),
    };
    head.claims.push({
      ...structuredClone(head.claims[0]),
      id: mkClaimId('C02'),
    });
    const proposal = correctionProposal();

    expect(() => reconcileProposal({
      ledger,
      message: 'Actually the sample item changed to blue on 2025-01-11; please correct the claim.',
      proposal,
    })).toThrow(ProposalReconciliationError);
  });
});
