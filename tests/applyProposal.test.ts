import { describe, expect, it } from 'vitest';
import { applyProposal, ProposalApplicationError } from '../src/ledger/applyProposal';
import { parseProviderProposal } from '../src/provider/proposalSchema';
import {
  buildEmptyCase,
  buildOneRevisionCase,
  mkInstant,
  mkIntakeId,
  mkModelRunId,
  mkPNBT,
  mkRevisionId,
  mkST,
  mkStatementId,
} from './fixtures/ledgerV3';

function genesisPrepared() {
  const intakeId = mkIntakeId('IN01');
  const statementId = mkStatementId('U01');
  return {
    intake: {
      id: intakeId,
      received_at: mkInstant('2026-08-11T00:30:00.000Z'),
      parts: [{ kind: 'statement' as const, statement_id: statementId, raw_text: mkPNBT('My QuickBite order arrived damaged') }],
    },
    statements: [{
      id: statementId,
      source_intake_id: intakeId,
      text: mkPNBT('My QuickBite order arrived damaged'),
    }],
    evidence: [],
    revision_id: mkRevisionId('R01'),
    model_run_id: mkModelRunId('MR01'),
    created_at: mkInstant('2026-08-11T01:00:00.000Z'),
    objective: mkST('Assess the submitted evidence and identify next steps'),
  };
}

function genesisProposal() {
  const statementId = mkStatementId('U01');
  return parseProviderProposal({
    explanation: { text: 'The damaged-order report is recorded as a reported claim with one verification gap.' },
    operations: [
      {
        operation_type: 'add_claim',
        local_ref: 'new_claim_1',
        proposition: 'The QuickBite order arrived damaged',
        actor: 'QuickBite customer',
        action: 'reported damage to',
        target: 'the delivered order',
        domain_time: 'At delivery',
        assessment: 'Reported',
        reasoning: 'The statement is first-party and has not yet been independently verified.',
        scope: 'The current QuickBite order',
        limits: ['No independent courier or merchant confirmation yet'],
        source_basis_ids: ['U01'],
        reason: 'Capture the central reported proposition',
      },
      {
        operation_type: 'add_event',
        local_ref: 'new_event_1',
        domain_time: 'At delivery',
        actor: 'QuickBite customer',
        action: 'received',
        target: 'the order',
        effect: 'Damage was observed',
        assessment: 'Reported',
        source_basis_ids: ['U01'],
        reason: 'Record the reported delivery event',
      },
      {
        operation_type: 'add_gap',
        local_ref: 'new_gap_1',
        question: 'Can the reported damage be independently verified?',
        relevance: 'Verification affects the confidence of the assessment.',
        resolving_evidence: 'A photo, courier record, or merchant acknowledgement.',
        acquisition_guidance: 'Attach the order photo or confirmation message.',
        collection_boundary: 'Collect only records tied to this order.',
        target_claim_refs: ['new_claim_1'],
        source_basis_ids: ['U01'],
        reason: 'Identify the main unresolved verification question',
      },
      {
        operation_type: 'add_action',
        local_ref: 'new_action_1',
        title: 'Collect order-specific proof',
        description: 'Attach a photo or merchant response tied to the damaged order.',
        priority: 'high',
        target_gap_refs: ['new_gap_1'],
        source_basis_ids: ['U01'],
        reason: 'Provide one concrete next step',
      },
      {
        operation_type: 'disposition_source',
        relationship_type: 'supports_claim',
        source_id: 'U01',
        target_ref: 'new_claim_1',
        reason: 'The statement directly reports the claim',
      },
      {
        operation_type: 'disposition_source',
        relationship_type: 'raises_gap',
        source_id: 'U01',
        target_ref: 'new_gap_1',
        reason: 'The statement alone cannot independently verify the damage',
      },
    ],
  }, {
    availableSourceIds: new Set([statementId]),
    existingClaimIds: new Set(),
    existingGapIds: new Set(),
    existingEventIds: new Set(),
    existingActionIds: new Set(),
  });
}

describe('deterministic Ledger V3 proposal application', () => {
  it('builds and validates a complete genesis revision from explicit operations', () => {
    const result = applyProposal({
      parent: buildEmptyCase(),
      prepared: genesisPrepared(),
      proposal: genesisProposal(),
    });

    expect(result.current_revision_id).toBe('R01');
    expect(result.revisions).toHaveLength(1);
    expect(result.revisions[0].events[0].id).toBe('EV01');
    expect(result.revisions[0].claims[0].id).toBe('C01');
    expect(result.revisions[0].gaps[0].id).toBe('G01');
    expect(result.revisions[0].actions[0].id).toBe('A01');
    expect(result.relationships.map((relationship) => relationship.id)).toEqual(['REL01', 'REL02']);
    expect(result.revisions[0].delta.entries.map((entry) => entry.entity_type)).toEqual([
      'intake',
      'statement',
      'relationship',
      'relationship',
      'event',
      'claim',
      'gap',
      'action',
    ]);
  });

  it('is deterministic and leaves the accepted parent deeply unchanged', () => {
    const parent = buildEmptyCase();
    const parentJson = JSON.stringify(parent);
    const first = applyProposal({ parent, prepared: genesisPrepared(), proposal: genesisProposal() });
    const second = applyProposal({ parent, prepared: genesisPrepared(), proposal: genesisProposal() });

    expect(first).toEqual(second);
    expect(JSON.stringify(parent)).toBe(parentJson);
  });

  it('carries omitted entities and applies explicit updates and lifecycle transitions', () => {
    const parent = buildOneRevisionCase();
    const intakeId = mkIntakeId('IN02');
    const statementId = mkStatementId('U02');
    const prepared = {
      intake: {
        id: intakeId,
        received_at: mkInstant('2026-08-11T02:00:00.000Z'),
        parts: [{ kind: 'statement' as const, statement_id: statementId, raw_text: mkPNBT('QuickBite confirmed a refund and replacement') }],
      },
      statements: [{
        id: statementId,
        source_intake_id: intakeId,
        text: mkPNBT('QuickBite confirmed a refund and replacement'),
      }],
      evidence: [],
      revision_id: mkRevisionId('R02'),
      model_run_id: mkModelRunId('MR02'),
      created_at: mkInstant('2026-08-11T03:00:00.000Z'),
      objective: mkST('Carry the existing objective forward'),
    };

    const proposal = parseProviderProposal({
      explanation: { text: 'The new confirmation corroborates the claim and closes the existing recovery work.' },
      operations: [
        {
          operation_type: 'update_claim',
          target_id: 'C01',
          assessment: 'Corroborated',
          reasoning: 'The new statement confirms the refund and replacement outcome.',
          source_basis_ids: ['U02'],
          reason: 'Update the assessment using the new confirmation',
        },
        {
          operation_type: 'transition_gap',
          target_ref: 'G01',
          resulting_status: 'resolved',
          source_basis_ids: ['U02'],
          reason: 'The outcome confirmation resolves the open verification question',
        },
        {
          operation_type: 'transition_action',
          target_ref: 'A01',
          resulting_status: 'completed',
          source_basis_ids: ['U02'],
          reason: 'The recovery action is complete',
        },
        {
          operation_type: 'disposition_source',
          relationship_type: 'supports_claim',
          source_id: 'U02',
          target_ref: 'C01',
          reason: 'The confirmation supports the existing claim',
        },
      ],
    }, {
      availableSourceIds: new Set([...parent.revisions[0].input_statement_ids, ...parent.revisions[0].input_evidence_ids, statementId]),
      existingClaimIds: new Set(parent.revisions[0].claims.map((claim) => claim.id)),
      existingGapIds: new Set(parent.revisions[0].gaps.map((gap) => gap.id)),
      existingEventIds: new Set(parent.revisions[0].events.map((event) => event.id)),
      existingActionIds: new Set(parent.revisions[0].actions.map((action) => action.id)),
    });

    const result = applyProposal({ parent, prepared, proposal });
    const revision = result.revisions[1];

    expect(revision.events).toEqual(parent.revisions[0].events);
    expect(revision.claims[0].supporting_source_ids).toEqual(['U01', 'U02']);
    expect(revision.claims[0].qualifying_source_ids).toEqual(['E01']);
    expect(revision.gaps[0].status).toBe('resolved');
    expect(revision.actions[0].status).toBe('completed');
    expect(revision.inspections).toEqual(parent.revisions[0].inspections);
  });

  it('rejects an introduced source without an explicit disposition and exposes no candidate', () => {
    const parent = buildEmptyCase();
    const proposal = parseProviderProposal({
      explanation: { text: 'No epistemic change was proposed.' },
      operations: [],
    }, {
      availableSourceIds: new Set([mkStatementId('U01')]),
      existingClaimIds: new Set(),
      existingGapIds: new Set(),
      existingEventIds: new Set(),
      existingActionIds: new Set(),
    });

    expect(() => applyProposal({ parent, prepared: genesisPrepared(), proposal })).toThrow(ProposalApplicationError);
    expect(parent.current_revision_id).toBeNull();
    expect(parent.revisions).toHaveLength(0);
  });
});
