import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { INFERENCE_MODEL } from '../server/inference/modelConfig';
import { parseProviderProposal, type ProposalValidationContext, ProviderProposalSchema } from '../src/provider/proposalSchema';
import type { ProviderProposal, ProposalOperation } from '../src/provider/proposalTypes';
import type { ClaimId, SourceId, EventId, GapId, ActionId, StatementId, EvidenceId } from '../src/ledger/types';

describe('Proposal Schema and Model Config', () => {
  describe('Exact model configuration', () => {
    it('exports the exact model configuration', () => {
      expect(INFERENCE_MODEL.provider).toBe('google-gemini');
      expect(INFERENCE_MODEL.modelId).toBe('gemini-3.5-flash');
      expect(INFERENCE_MODEL.promptVersion).toBe('explainable-trust-proposal-v1');
    });
  });

  describe('Compile-time agreement', () => {
    it('parseProviderProposal output matches ProviderProposal', () => {
      const raw = { explanation: { text: 'a' }, operations: [] };
      const parsed = parseProviderProposal(raw, {
        availableSourceIds: new Set(),
        existingClaimIds: new Set(),
        existingGapIds: new Set(),
        existingEventIds: new Set(),
        existingActionIds: new Set(),
      });
      expectTypeOf(parsed).toMatchTypeOf<ProviderProposal>();
    });
  });

  describe('JSON Schema conversion', () => {
    it('proves Zod 4 JSON Schema structural properties', () => {
      const schema = z.toJSONSchema(ProviderProposalSchema, { io: 'input' });
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      
      const props = schema.properties as Record<string, Record<string, unknown>>;
      expect(props.explanation.additionalProperties).toBe(false);

      const items = (props.operations as Record<string, unknown>).items as Record<string, unknown>;
      const branches = items.anyOf as Record<string, unknown>[];
      expect(branches).toBeDefined();
      
      for (const branch of branches) {
        expect(branch.additionalProperties).toBe(false);
        const branchProps = branch.properties as Record<string, Record<string, unknown>>;
        expect(branchProps.operation_type).toBeDefined();
        if (branchProps.operation_type.const === 'disposition_source') {
           expect(branchProps.relationship_type).toBeDefined();
        }
      }
    });
  });

  const ctx: ProposalValidationContext = {
    availableSourceIds: new Set(['U01', 'E01'] as SourceId[]),
    existingClaimIds: new Set(['C01', 'C02'] as ClaimId[]),
    existingGapIds: new Set(['G01'] as GapId[]),
    existingEventIds: new Set(['EV01'] as EventId[]),
    existingActionIds: new Set(['A01'] as ActionId[]),
  };

  const emptyCtx: ProposalValidationContext = {
    availableSourceIds: new Set(),
    existingClaimIds: new Set(),
    existingGapIds: new Set(),
    existingEventIds: new Set(),
    existingActionIds: new Set(),
  };

  const exp = { text: 'exp' };

  describe('Operations', () => {
    it.each([
      ['supports_claim', { operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'C01', reason: 'r' }],
      ['raises_gap', { operation_type: 'disposition_source', relationship_type: 'raises_gap', source_id: 'U01', target_ref: 'G01', reason: 'r' }],
      ['corrects_statement', { operation_type: 'disposition_source', relationship_type: 'corrects_statement', source_id: 'U01', target_ref: 'U02', reason: 'r' }],
      ['not_yet_classified', { operation_type: 'disposition_source', relationship_type: 'not_yet_classified', source_id: 'U01', target_ref: null, reason: 'r' }],
      ['inspect_source', { operation_type: 'inspect_source', evidence_id: 'E01', source_attribution: 's', case_object_match: 'c', match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: [], reason: 'r' }],
      ['add_event', { operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r' }],
      ['update_event', { operation_type: 'update_event', target_id: 'EV01', effect: 'e', reason: 'r' }],
      ['add_claim', { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'a', target: 't', domain_time: 'd', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], source_basis_ids: ['U01'], reason: 'r' }],
      ['update_claim', { operation_type: 'update_claim', target_id: 'C01', proposition: 'p', reason: 'r' }],
      ['add_gap', { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'e', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: ['C01'], source_basis_ids: ['U01'], reason: 'r' }],
      ['update_gap', { operation_type: 'update_gap', target_id: 'G01', question: 'q', reason: 'r' }],
      ['transition_gap', { operation_type: 'transition_gap', target_ref: 'G01', resulting_status: 'resolved', source_basis_ids: ['U01'], reason: 'r' }],
      ['add_action', { operation_type: 'add_action', local_ref: 'new_action_1', title: 't', description: 'd', priority: 'high', target_gap_refs: ['G01'], source_basis_ids: ['U01'], reason: 'r' }],
      ['update_action', { operation_type: 'update_action', target_id: 'A01', priority: 'high', reason: 'r' }],
      ['transition_action', { operation_type: 'transition_action', target_ref: 'A01', resulting_status: 'completed', source_basis_ids: ['U01'], reason: 'r' }]
    ])('minimal/rich valid input for %s', (name, op) => {
      const ops = [op];
      if (name === 'add_claim') {
        ops.push({ operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'new_claim_1', reason: 'r' });
      }
      expect(() => parseProviderProposal({ explanation: exp, operations: ops }, { ...ctx, availableSourceIds: new Set(['U01', 'U02', 'E01']) as any })).not.toThrow();
    });

    it.each([
      ['supports_claim', { operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'C01', reason: 'r', unknown: 'x' }],
      ['inspect_source', { operation_type: 'inspect_source', evidence_id: 'E01', source_attribution: 's', case_object_match: 'c', match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: [], reason: 'r', bad: 1 }],
      ['add_event', { operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r', unknown: 2 }],
      ['update_event', { operation_type: 'update_event', target_id: 'EV01', effect: 'e', reason: 'r', unknown: 3 }],
      ['add_claim', { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'a', target: 't', domain_time: 'd', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], source_basis_ids: ['U01'], reason: 'r', bad: 1 }],
      ['update_claim', { operation_type: 'update_claim', target_id: 'C01', proposition: 'p', reason: 'r', bad: 1 }],
      ['add_gap', { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'e', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: ['C01'], source_basis_ids: ['U01'], reason: 'r', bad: 1 }],
      ['update_gap', { operation_type: 'update_gap', target_id: 'G01', question: 'q', reason: 'r', bad: 1 }],
      ['transition_gap', { operation_type: 'transition_gap', target_ref: 'G01', resulting_status: 'resolved', source_basis_ids: ['U01'], reason: 'r', bad: 1 }],
      ['add_action', { operation_type: 'add_action', local_ref: 'new_action_1', title: 't', description: 'd', priority: 'high', target_gap_refs: ['G01'], source_basis_ids: ['U01'], reason: 'r', bad: 1 }],
      ['update_action', { operation_type: 'update_action', target_id: 'A01', priority: 'high', reason: 'r', bad: 1 }],
      ['transition_action', { operation_type: 'transition_action', target_ref: 'A01', resulting_status: 'completed', source_basis_ids: ['U01'], reason: 'r', bad: 1 }]
    ])('unknown-field rejection for %s', (name, op) => {
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });

    it('rejects strict explanation unknown-key', () => {
      expect(() => parseProviderProposal({ explanation: { text: 'a', bad: 1 }, operations: [] }, ctx)).toThrow();
    });

    it('rejects missing, empty, duplicate and unavailable source basis', () => {
      const baseOp = { operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', reason: 'r' };
      // missing
      expect(() => parseProviderProposal({ explanation: exp, operations: [baseOp] }, ctx)).toThrow();
      // empty
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ ...baseOp, source_basis_ids: [] }] }, ctx)).toThrow();
      // duplicate
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ ...baseOp, source_basis_ids: ['U01', 'U01'] }] }, ctx)).toThrow();
      // unavailable
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ ...baseOp, source_basis_ids: ['U99'] }] }, ctx)).toThrow();
    });

    it('rejects both missing inspection content fields', () => {
      const op = { operation_type: 'inspect_source', evidence_id: 'E01', match_status: 'matched', completeness_context: 'c', limitations: [], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow(); // missing integrity_signals, etc.
    });

    it('rejects statement ID used as inspection evidence', () => {
      const op = { operation_type: 'inspect_source', evidence_id: 'U01', source_attribution: 's', case_object_match: 'c', match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: [], reason: 'r' };
      // U01 is a statement id
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });

    it('rejects duplicate claim limits, inspection limitations, gap targets and action targets', () => {
      // duplicate limits
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'a', target: 't', domain_time: 'd', assessment: 'Reported', reasoning: 'r', scope: 's', limits: ['x', 'x'], source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
      // inspection limitations
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'inspect_source', evidence_id: 'E01', source_attribution: 's', case_object_match: 'c', match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: ['x', 'x'], reason: 'r' }] }, ctx)).toThrow();
      // gap targets
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'e', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: ['C01', 'C01'], source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
      // action targets
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'add_action', local_ref: 'new_action_1', title: 't', description: 'd', priority: 'high', target_gap_refs: ['G01', 'G01'], source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
    });

    it('rejects conflicting duplicate claim-source classifications', () => {
      const ops = [
        { operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'C01', reason: 'r' },
        { operation_type: 'disposition_source', relationship_type: 'conflicts_with_claim', source_id: 'U01', target_ref: 'C01', reason: 'r' }
      ];
      expect(() => parseProviderProposal({ explanation: exp, operations: ops }, ctx)).toThrow();
    });

    it('rejects duplicate, forward, undeclared and wrong-family local references', () => {
      // duplicate
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r' }, { operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
      // forward/undeclared
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'e', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: ['new_claim_99'], source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
      // wrong family
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'add_event', local_ref: 'new_claim_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
    });

    it('validates all local-reference declaration/reference families', () => {
      const ops = [
        { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'a', target: 't', domain_time: 'd', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], source_basis_ids: ['U01'], reason: 'r' },
        { operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'new_claim_1', reason: 'r' },
        { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'e', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: ['new_claim_1'], source_basis_ids: ['U01'], reason: 'r' },
        { operation_type: 'add_action', local_ref: 'new_action_1', title: 't', description: 'd', priority: 'high', target_gap_refs: ['new_gap_1'], source_basis_ids: ['U01'], reason: 'r' }
      ];
      expect(() => parseProviderProposal({ explanation: exp, operations: ops }, ctx)).not.toThrow();
    });

    it('rejects unavailable canonical targets', () => {
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'update_claim', target_id: 'C99', proposition: 'p', reason: 'r' }] }, ctx)).toThrow();
    });

    it('rejects four target-plus-reason no-op updates', () => {
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'update_event', target_id: 'EV01', reason: 'r' }] }, ctx)).toThrow();
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'update_claim', target_id: 'C01', reason: 'r' }] }, ctx)).toThrow();
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'update_gap', target_id: 'G01', reason: 'r' }] }, ctx)).toThrow();
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'update_action', target_id: 'A01', reason: 'r' }] }, ctx)).toThrow();
    });

    it('rejects immutable/provider-owned fields (full snapshots, deletes, replaces)', () => {
      // Trying to send a snapshot with provider IDs
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'add_event', id: 'EV99', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
      
      // Delete operation doesn't exist in schema
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'delete_event', target_id: 'EV01' } as any] }, ctx)).toThrow();
    });
  });
});
