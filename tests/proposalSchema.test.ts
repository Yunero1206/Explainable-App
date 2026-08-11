import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { INFERENCE_MODEL } from '../server/inference/modelConfig';
import { parseProviderProposal, type ProposalValidationContext, ProviderProposalSchema } from '../src/provider/proposalSchema';
import type { ProviderProposal } from '../src/provider/proposalTypes';
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
    it('proves Zod 4 JSON Schema structural properties and all 15 branches', () => {
      const schema = z.toJSONSchema(ProviderProposalSchema, { io: 'input' });
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      
      const props = schema.properties as Record<string, Record<string, unknown>>;
      expect(props.explanation.additionalProperties).toBe(false);

      const items = (props.operations as Record<string, unknown>).items as Record<string, unknown>;
      const branches = items.anyOf as Record<string, unknown>[];
      expect(branches).toBeDefined();
      expect(branches.length).toBe(15);
      
      for (const branch of branches) {
        expect(branch.additionalProperties).toBe(false);
        const branchProps = branch.properties as Record<string, Record<string, unknown>>;
        expect(branchProps.operation_type).toBeDefined();
        // Ensure properties are strictly non-empty
        expect(Object.keys(branchProps).length).toBeGreaterThan(1);

        if (branchProps.operation_type.const === 'disposition_source') {
           expect(branchProps.relationship_type).toBeDefined();
           const relType = branchProps.relationship_type as Record<string, unknown>;
           expect(relType.const || relType.enum).toBeDefined(); // Retain discriminants
        }
      }
    });
  });

  const ctx: ProposalValidationContext = {
    availableSourceIds: new Set<SourceId>(['U01' as SourceId, 'E01' as SourceId]),
    existingClaimIds: new Set<ClaimId>(['C01' as ClaimId, 'C02' as ClaimId]),
    existingGapIds: new Set<GapId>(['G01' as GapId]),
    existingEventIds: new Set<EventId>(['EV01' as EventId]),
    existingActionIds: new Set<ActionId>(['A01' as ActionId]),
  };

  const emptyCtx: ProposalValidationContext = {
    availableSourceIds: new Set(),
    existingClaimIds: new Set(),
    existingGapIds: new Set(),
    existingEventIds: new Set(),
    existingActionIds: new Set(),
  };

  const exp = { text: 'exp' };

  describe('Immutable-card explicit cases', () => {
    it('accepts combined source disposition plus linked event/claim additions', () => {
      const raw = {
        explanation: exp,
        operations: [
          {
            operation_type: 'add_claim',
            local_ref: 'new_claim_1',
            proposition: 'p',
            actor: 'a',
            action: 'act',
            target: 't',
            domain_time: 't',
            assessment: 'Reported',
            reasoning: 'r',
            scope: 's',
            limits: [],
            source_basis_ids: ['U01'],
            reason: 'r'
          },
          {
            operation_type: 'add_event',
            local_ref: 'new_event_1',
            domain_time: 't',
            actor: 'a',
            action: 'act',
            target: 't',
            effect: 'e',
            assessment: 'Reported',
            source_basis_ids: ['U01'],
            reason: 'r'
          },
          {
            operation_type: 'disposition_source',
            relationship_type: 'supports_claim',
            source_id: 'U01',
            target_ref: 'new_claim_1',
            reason: 'r'
          }
        ]
      };
      expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
    });

    it('accepts existing claim update plus existing gap transition', () => {
      const raw = {
        explanation: exp,
        operations: [
          {
            operation_type: 'update_claim',
            target_id: 'C01',
            assessment: 'Corroborated',
            source_basis_ids: ['E01'],
            reason: 'Updated based on evidence.'
          },
          {
            operation_type: 'transition_gap',
            target_ref: 'G01',
            resulting_status: 'resolved',
            source_basis_ids: ['E01'],
            reason: 'Information found.'
          }
        ]
      };
      expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
    });

    it('accepts explanation with empty operations', () => {
      const raw = { explanation: exp, operations: [] };
      expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
    });
  });

  describe('Update event variant', () => {
    it('accepts content change plus valid basis', () => {
      const op = { operation_type: 'update_event', target_id: 'EV01', effect: 'new effect', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).not.toThrow();
    });
    it('rejects missing basis', () => {
      const op = { operation_type: 'update_event', target_id: 'EV01', effect: 'new effect', reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects empty basis', () => {
      const op = { operation_type: 'update_event', target_id: 'EV01', effect: 'new effect', source_basis_ids: [], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects duplicate basis', () => {
      const op = { operation_type: 'update_event', target_id: 'EV01', effect: 'new effect', source_basis_ids: ['U01', 'U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects unavailable basis', () => {
      const op = { operation_type: 'update_event', target_id: 'EV01', effect: 'new effect', source_basis_ids: ['U99'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects basis-only no-op', () => {
      const op = { operation_type: 'update_event', target_id: 'EV01', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow(/Update operation must contain at least one actual mutable-field change/);
    });
  });

  describe('Update claim variant', () => {
    it('accepts content change plus valid basis', () => {
      const op = { operation_type: 'update_claim', target_id: 'C01', proposition: 'new prop', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).not.toThrow();
    });
    it('rejects missing basis', () => {
      const op = { operation_type: 'update_claim', target_id: 'C01', proposition: 'new prop', reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects empty basis', () => {
      const op = { operation_type: 'update_claim', target_id: 'C01', proposition: 'new prop', source_basis_ids: [], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects duplicate basis', () => {
      const op = { operation_type: 'update_claim', target_id: 'C01', proposition: 'new prop', source_basis_ids: ['U01', 'U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects unavailable basis', () => {
      const op = { operation_type: 'update_claim', target_id: 'C01', proposition: 'new prop', source_basis_ids: ['U99'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects basis-only no-op', () => {
      const op = { operation_type: 'update_claim', target_id: 'C01', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow(/Update operation must contain at least one actual mutable-field change/);
    });
  });

  describe('Update gap variant', () => {
    it('accepts content change plus valid basis', () => {
      const op = { operation_type: 'update_gap', target_id: 'G01', question: 'new q', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).not.toThrow();
    });
    it('rejects missing basis', () => {
      const op = { operation_type: 'update_gap', target_id: 'G01', question: 'new q', reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects empty basis', () => {
      const op = { operation_type: 'update_gap', target_id: 'G01', question: 'new q', source_basis_ids: [], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects duplicate basis', () => {
      const op = { operation_type: 'update_gap', target_id: 'G01', question: 'new q', source_basis_ids: ['U01', 'U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects unavailable basis', () => {
      const op = { operation_type: 'update_gap', target_id: 'G01', question: 'new q', source_basis_ids: ['U99'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects basis-only no-op', () => {
      const op = { operation_type: 'update_gap', target_id: 'G01', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow(/Update operation must contain at least one actual mutable-field change/);
    });
  });

  describe('Update action variant', () => {
    it('accepts content change plus valid basis', () => {
      const op = { operation_type: 'update_action', target_id: 'A01', priority: 'high', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).not.toThrow();
    });
    it('rejects missing basis', () => {
      const op = { operation_type: 'update_action', target_id: 'A01', priority: 'high', reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects empty basis', () => {
      const op = { operation_type: 'update_action', target_id: 'A01', priority: 'high', source_basis_ids: [], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects duplicate basis', () => {
      const op = { operation_type: 'update_action', target_id: 'A01', priority: 'high', source_basis_ids: ['U01', 'U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects unavailable basis', () => {
      const op = { operation_type: 'update_action', target_id: 'A01', priority: 'high', source_basis_ids: ['U99'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });
    it('rejects basis-only no-op', () => {
      const op = { operation_type: 'update_action', target_id: 'A01', source_basis_ids: ['U01'], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow(/Update operation must contain at least one actual mutable-field change/);
    });
  });

  describe('Strict rejections and bounds', () => {
    it('rejects unknown fields on explanation', () => {
      const raw = { explanation: { text: 'a', extra: 'b' }, operations: [] };
      expect(() => parseProviderProposal(raw, ctx)).toThrow();
    });

    it('rejects unknown fields on operations', () => {
      const raw = {
        explanation: exp,
        operations: [{ operation_type: 'update_event', target_id: 'EV01', effect: 'e', source_basis_ids: ['U01'], reason: 'r', unknown_field: 'abc' }]
      };
      expect(() => parseProviderProposal(raw, ctx)).toThrow();
    });

    it('rejects both missing inspection content fields', () => {
      const op = { operation_type: 'inspect_source', evidence_id: 'E01', match_status: 'matched', completeness_context: 'c', limitations: [], reason: 'r' };
      expect(() => parseProviderProposal({ explanation: exp, operations: [op] }, ctx)).toThrow();
    });

    it('rejects statement ID used as inspection evidence', () => {
      const op = { operation_type: 'inspect_source', evidence_id: 'U01', source_attribution: 's', case_object_match: 'c', match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: [], reason: 'r' };
      // U01 is a statement id not E01
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
      expect(() => parseProviderProposal({ explanation: exp, operations: [{ operation_type: 'update_claim', target_id: 'C99', proposition: 'p', source_basis_ids: ['U01'], reason: 'r' }] }, ctx)).toThrow();
    });

    it('rejects immutable/provider-owned fields (full snapshots, deletes, replaces)', () => {
      // Trying to send a snapshot with provider IDs
      const addOp = JSON.parse('{"operation_type": "add_event", "id": "EV99", "local_ref": "new_event_1", "domain_time": "t", "actor": "a", "action": "act", "target": "t", "effect": "e", "assessment": "Reported", "source_basis_ids": ["U01"], "reason": "r"}');
      expect(() => parseProviderProposal({ explanation: exp, operations: [addOp] }, ctx)).toThrow();
      
      // Delete operation doesn't exist in schema - no prohibited casts allowed, we use JSON.parse
      const deleteOp = JSON.parse('{"operation_type": "delete_event", "target_id": "EV01"}');
      expect(() => parseProviderProposal({ explanation: exp, operations: [deleteOp] }, ctx)).toThrow();
    });
  });

  describe('Other minimal and rich valid inputs', () => {
    it('accepts minimal missing optional fields for other variants', () => {
      // Transition gap is fairly minimal
      const ops = [
        { operation_type: 'transition_gap', target_ref: 'G01', resulting_status: 'resolved', source_basis_ids: ['U01'], reason: 'r' }
      ];
      expect(() => parseProviderProposal({ explanation: exp, operations: ops }, ctx)).not.toThrow();
    });

    it('accepts rich inputs across all non-update variants', () => {
      const ops = [
        { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'a', target: 't', domain_time: 'd', assessment: 'Reported', reasoning: 'r', scope: 's', limits: ['limit 1'], source_basis_ids: ['U01'], reason: 'r' },
        { operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r' },
        { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'e', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: ['new_claim_1', 'C01'], source_basis_ids: ['U01'], reason: 'r' },
        { operation_type: 'add_action', local_ref: 'new_action_1', title: 't', description: 'd', priority: 'high', target_gap_refs: ['new_gap_1', 'G01'], source_basis_ids: ['U01'], reason: 'r' },
        { operation_type: 'inspect_source', evidence_id: 'E01', source_attribution: 's', case_object_match: 'c', match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: ['l1', 'l2'], reason: 'r' },
        { operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'new_claim_1', reason: 'r' },
        { operation_type: 'disposition_source', relationship_type: 'not_yet_classified', source_id: 'U01', target_ref: null, reason: 'r' }
      ];
      expect(() => parseProviderProposal({ explanation: exp, operations: ops }, ctx)).not.toThrow();
    });
  });
});
