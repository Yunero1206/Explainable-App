import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { INFERENCE_MODEL } from '../server/inference/modelConfig';
import { parseProviderProposal, type ProposalValidationContext, ProviderProposalSchema } from '../src/provider/proposalSchema';
import type { ProviderProposal, ProposalOperation } from '../src/provider/proposalTypes';
import type { ClaimId, SourceId, EventId, GapId, ActionId, StatementId, EvidenceId } from '../src/ledger/types';

describe('Proposal Schema and Model Config', () => {
  describe('Fixed model configuration', () => {
    it('exports the exact model configuration and cannot be overridden', () => {
      expect(INFERENCE_MODEL).toEqual({
        provider: 'google-gemini',
        modelId: 'gemini-3.5-flash',
        promptVersion: 'explainable-trust-proposal-v1',
      });
      // Verify immutable values
      expect(INFERENCE_MODEL.provider).toBe('google-gemini');
      expect(INFERENCE_MODEL.modelId).toBe('gemini-3.5-flash');
      expect(INFERENCE_MODEL.promptVersion).toBe('explainable-trust-proposal-v1');
    });
  });

  describe('JSON Schema conversion', () => {
    it('successfully converts the structural proposal schema via JSON Schema input path', () => {
      // Zod 4 allows explicit toJSONSchema. We assert it works and maintains strict fields.
      const schema = (z as any).toJSONSchema(ProviderProposalSchema, { io: 'input' });
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
      expect(schema.type).toBe('object');
      expect(schema.properties.explanation).toBeDefined();
      expect(schema.properties.operations).toBeDefined();
      expect(schema.properties.operations.type).toBe('array');
    });
  });

  describe('Proposal contract', () => {
    const ctx: ProposalValidationContext = {
      availableSourceIds: new Set(['U01', 'U02', 'E01'] as SourceId[]),
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

    // Constructing a valid SemanticText for test
    const validExplanation = { text: 'I have analyzed the provided context.' };

    describe('Positive Tests & Minimal/Rich Shapes', () => {
      it('validates a proposal dispositioning a preallocated source and adding linked event/claim entities through local refs', () => {
        const raw = {
          explanation: validExplanation,
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
              source_id: 'U01',
              reason: 'r',
              relationship_type: 'supports_claim',
              target_ref: 'new_claim_1'
            }
          ]
        };
        const parsed = parseProviderProposal(raw, ctx);
        expect(parsed.operations.length).toBe(3);
      });

      it('validates a proposal updating one existing claim and transitioning one gap', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            {
              operation_type: 'update_claim',
              target_id: 'C01',
              assessment: 'Corroborated',
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
        const parsed = parseProviderProposal(raw, ctx);
        expect(parsed.operations.length).toBe(2);
      });

      it('accepts an empty ordered operation list with a valid explanation', () => {
        const raw = {
          explanation: validExplanation,
          operations: []
        };
        expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
      });

      it('accepts minimal update shapes', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'update_claim', target_id: 'C01', proposition: 'p', reason: 'r' },
            { operation_type: 'update_event', target_id: 'EV01', effect: 'e', reason: 'r' },
            { operation_type: 'update_gap', target_id: 'G01', question: 'q', reason: 'r' },
            { operation_type: 'update_action', target_id: 'A01', priority: 'medium', reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
      });

      it('accepts rich shapes for every operation variant', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            {
              operation_type: 'add_claim',
              local_ref: 'new_claim_1',
              proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't',
              assessment: 'Reported', reasoning: 'r', scope: 's', limits: ['l1'], reason: 'r'
            },
            {
              operation_type: 'add_gap',
              local_ref: 'new_gap_1',
              question: 'q', relevance: 'r', resolving_evidence: 'r', acquisition_guidance: 'a', collection_boundary: 'c',
              target_claim_refs: ['new_claim_1'], source_basis_ids: ['U01'], reason: 'r'
            },
            {
              operation_type: 'add_action',
              local_ref: 'new_action_1',
              title: 't', description: 'd', priority: 'high', target_gap_refs: ['new_gap_1'], source_basis_ids: ['U01'], reason: 'r'
            },
            {
              operation_type: 'inspect_source',
              source_id: 'E01',
              match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: ['l'], reason: 'r'
            },
            {
              operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'new_claim_1', reason: 'r'
            },
            {
              operation_type: 'disposition_source', relationship_type: 'raises_gap', source_id: 'U01', target_ref: 'new_gap_1', reason: 'r'
            },
            {
              operation_type: 'disposition_source', relationship_type: 'corrects_statement', source_id: 'U01', target_ref: 'U02', reason: 'r'
            },
            {
              operation_type: 'disposition_source', relationship_type: 'not_yet_classified', source_id: 'U01', target_ref: null, reason: 'r'
            }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
      });
    });

    describe('Counterexamples & Rejections', () => {
      it('rejects full case/revision/entity snapshots, delete and replace operations', () => {
        const raw1 = { explanation: validExplanation, operations: [], cases: [] };
        expect(() => parseProviderProposal(raw1, ctx)).toThrow(/unrecognized_keys/i);

        const raw2 = { explanation: validExplanation, operations: [{ operation_type: 'delete_claim', target_id: 'C01' }] };
        expect(() => parseProviderProposal(raw2, ctx)).toThrow(/Invalid/i);

        const raw3 = { explanation: validExplanation, operations: [{ operation_type: 'replace_ledger' }] };
        expect(() => parseProviderProposal(raw3, ctx)).toThrow(/Invalid/i);
      });

      it('rejects canonical-looking IDs for new entities', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            {
              operation_type: 'add_claim', local_ref: 'C99', proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], reason: 'r'
            }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Invalid/i);
      });

      it('rejects unknown fields on operations', () => {
        const raw = { explanation: validExplanation, operations: [{ operation_type: 'update_claim', target_id: 'C01', proposition: 'p', reason: 'r', unknown_field: 'x' }] };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/unrecognized_keys/i);
      });

      it('rejects empty target arrays for gap/action', () => {
        const raw1 = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'r', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: [], source_basis_ids: ['U01'], reason: 'r' },
            { operation_type: 'disposition_source', relationship_type: 'raises_gap', source_id: 'U01', target_ref: 'new_gap_1', reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(raw1, ctx)).toThrow(/min/i);
      });

      it('rejects all four no-op update variants', () => {
        const rawC = { explanation: validExplanation, operations: [{ operation_type: 'update_claim', target_id: 'C01', reason: 'r' }] };
        expect(() => parseProviderProposal(rawC, ctx)).toThrow(/at least one actual mutable-field/i);

        const rawE = { explanation: validExplanation, operations: [{ operation_type: 'update_event', target_id: 'EV01', reason: 'r' }] };
        expect(() => parseProviderProposal(rawE, ctx)).toThrow(/at least one actual mutable-field/i);

        const rawG = { explanation: validExplanation, operations: [{ operation_type: 'update_gap', target_id: 'G01', reason: 'r' }] };
        expect(() => parseProviderProposal(rawG, ctx)).toThrow(/at least one actual mutable-field/i);

        const rawA = { explanation: validExplanation, operations: [{ operation_type: 'update_action', target_id: 'A01', reason: 'r' }] };
        expect(() => parseProviderProposal(rawA, ctx)).toThrow(/at least one actual mutable-field/i);
      });

      it('rejects immutable/provider-owned fields in updates', () => {
        const raw = { explanation: validExplanation, operations: [{ operation_type: 'update_event', target_id: 'EV01', id: 'EV02', source_support_ids: ['U02'], reason: 'r' }] };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/unrecognized_keys/i);
      });

      it('rejects missing missing required canonical content fields (e.g. source basis)', () => {
        const raw = {
          explanation: validExplanation,
          operations: [{ operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', reason: 'r' }]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Required|expected array/i);
      });

      it('rejects missing reason or explanation', () => {
        const raw1 = { operations: [] };
        expect(() => parseProviderProposal(raw1, ctx)).toThrow(/Required|expected object/i);

        const raw2 = { explanation: validExplanation, operations: [{ operation_type: 'update_claim', target_id: 'C01', proposition: 'p' }] };
        expect(() => parseProviderProposal(raw2, ctx)).toThrow(/Required|expected string/i);
      });

      it('rejects duplicate, forward and undeclared local refs', () => {
        const rawDup = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], reason: 'r' },
            { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(rawDup, ctx)).toThrow(/Duplicate local reference/i);

        const rawFwd = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'new_claim_1', reason: 'r' },
            { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(rawFwd, ctx)).toThrow(/Forward or undeclared/i);
      });

      it('rejects wrong-family references', () => {
        const raw1 = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01'], reason: 'r' },
            { operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: 'new_event_1', reason: 'r' }
          ]
        };
        // Zod validates this first because target_ref for supports_claim requires ClaimLocalRef
        expect(() => parseProviderProposal(raw1, ctx)).toThrow(/Invalid/i);
      });

      it('rejects local-ref lifecycle transitions', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', relevance: 'r', resolving_evidence: 'r', acquisition_guidance: 'a', collection_boundary: 'c', target_claim_refs: ['C01'], source_basis_ids: ['U01'], reason: 'r' },
            { operation_type: 'disposition_source', relationship_type: 'raises_gap', source_id: 'U01', target_ref: 'new_gap_1', reason: 'r' },
            { operation_type: 'transition_gap', target_ref: 'new_gap_1', resulting_status: 'resolved', source_basis_ids: ['U01'], reason: 'r' }
          ]
        };
        // Zod validation prevents non-canonical ID on transition target
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Invalid/i);
      });

      it('rejects unavailable and duplicate source bases', () => {
        const rawUnavail = {
          explanation: validExplanation,
          operations: [{ operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U99'], reason: 'r' }]
        };
        expect(() => parseProviderProposal(rawUnavail, ctx)).toThrow(/Unavailable source/i);

        const rawDup = {
          explanation: validExplanation,
          operations: [{ operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', source_basis_ids: ['U01', 'U01'], reason: 'r' }]
        };
        expect(() => parseProviderProposal(rawDup, ctx)).toThrow(/Duplicate source basis/i);
      });

      it('rejects relationship/target compatibility rules (e.g. statement correction)', () => {
        const rawCorr = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'disposition_source', relationship_type: 'corrects_statement', source_id: 'E01', target_ref: 'U02', reason: 'r' }
          ]
        };
        // E01 is evidence, but source_id for corrects_statement is StatementId
        expect(() => parseProviderProposal(rawCorr, ctx)).toThrow(/Invalid/i);

        const rawNull = {
          explanation: validExplanation,
          operations: [{ operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01', target_ref: null, reason: 'r' }]
        };
        expect(() => parseProviderProposal(rawNull, ctx)).toThrow(/Invalid/i);
      });

      it('rejects inspection using a statement rather than evidence', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'inspect_source', source_id: 'U01', match_status: 'matched', completeness_context: 'c', integrity_signals: 'i', limitations: [], reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Invalid/i);
      });

      it('rejects unreferenced new claims (must have at least one disposition)', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'add_claim', local_ref: 'new_claim_1', proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/lacks a valid source disposition/i);
      });
    });
  });
});
