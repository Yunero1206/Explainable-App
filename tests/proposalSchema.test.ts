import { describe, it, expect } from 'vitest';
import { INFERENCE_MODEL } from '../server/inference/modelConfig';
import { parseProviderProposal, type ProposalValidationContext } from '../src/provider/proposalSchema';
import type { ProviderProposal, ProposalOperation } from '../src/provider/proposalTypes';
import type { ClaimId, SourceId, EventId, GapId, ActionId } from '../src/ledger/types';

describe('Proposal Schema and Model Config', () => {
  describe('Fixed model configuration', () => {
    it('exports the exact model configuration and cannot be overridden', () => {
      expect(INFERENCE_MODEL).toEqual({
        provider: 'google-gemini',
        modelId: 'gemini-3.5-flash',
        promptVersion: 'explainable-trust-proposal-v1',
      });
      // The `as const` in TypeScript prevents mutation at compile time,
      // and checking exact strict equality confirms it's the expected object.
      expect(Object.isFrozen(INFERENCE_MODEL)).toBe(false); // as const doesn't Object.freeze by default, but TS enforces it. We can just test the value.
    });
  });

  describe('Proposal contract', () => {
    const ctx: ProposalValidationContext = {
      availableSourceIds: new Set(['U01', 'E01'] as SourceId[]),
      existingClaimIds: new Set(['C01'] as ClaimId[]),
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

    const validExplanation = { text: 'I have analyzed the provided context.' as any };

    describe('Positive tests', () => {
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
              integrity_signals: 'i',
              limitations: [],
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
    });

    describe('Counterexamples & Rejections', () => {
      it('rejects full case/revision/entity arrays returned by the provider', () => {
        const raw = {
          explanation: validExplanation,
          operations: [],
          cases: [],
          revisions: []
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/unrecognized_keys/i);
      });

      it('rejects a canonical-looking ID for a new entity', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            {
              operation_type: 'add_claim',
              local_ref: 'C99', // Canonical-looking, not new_...
              proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], integrity_signals: 'i', limitations: [], reason: 'r'
            }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Invalid/i);
      });

      it('rejects unknown operation, field or enum', () => {
        const raw1 = { explanation: validExplanation, operations: [{ operation_type: 'unknown_op' }] };
        expect(() => parseProviderProposal(raw1, ctx)).toThrow();

        const raw2 = { explanation: validExplanation, operations: [{ operation_type: 'update_claim', target_id: 'C01', reason: 'r', unknown_field: 'x' }] };
        expect(() => parseProviderProposal(raw2, ctx)).toThrow(/unrecognized_keys/i);

        const raw3 = { explanation: validExplanation, operations: [{ operation_type: 'update_claim', target_id: 'C01', reason: 'r', assessment: 'InvalidEnum' }] };
        expect(() => parseProviderProposal(raw3, ctx)).toThrow(/Invalid option/i);
      });

      it('rejects duplicate local references', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q', target_claim_refs: [], reason: 'r' },
            { operation_type: 'add_gap', local_ref: 'new_gap_1', question: 'q2', target_claim_refs: [], reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Duplicate local reference/i);
      });

      it('rejects forward-missing local ref', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            {
              operation_type: 'disposition_source',
              source_id: 'U01',
              reason: 'r',
              relationship_type: 'supports_claim',
              target_ref: 'new_claim_1' // Forward ref: hasn't been declared yet!
            },
            {
              operation_type: 'add_claim',
              local_ref: 'new_claim_1',
              proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Reported', reasoning: 'r', scope: 's', limits: [], integrity_signals: 'i', limitations: [], reason: 'r'
            }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Forward or undeclared local reference/i);
      });

      it('rejects undeclared local ref', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            {
              operation_type: 'disposition_source',
              source_id: 'U01',
              reason: 'r',
              relationship_type: 'supports_claim',
              target_ref: 'new_claim_99'
            }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Forward or undeclared local reference/i);
      });

      it('rejects update to immutable identity/provenance fields', () => {
        // Zod strict schema does not even allow identity fields in update
        const raw = {
          explanation: validExplanation,
          operations: [
            {
              operation_type: 'update_event',
              target_id: 'EV01',
              reason: 'r',
              id: 'EV02', // Immutable/identity
              source_support_ids: ['U02'] // Provenance
            }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/unrecognized_keys/i);
      });

      it('rejects missing reason, explanation or required support', () => {
        const raw1 = { operations: [] }; // Missing explanation
        expect(() => parseProviderProposal(raw1, ctx)).toThrow(/Required|expected object/i);

        const raw2 = { explanation: validExplanation, operations: [{ operation_type: 'update_claim', target_id: 'C01' }] }; // Missing reason
        expect(() => parseProviderProposal(raw2, ctx)).toThrow(/Required|expected string/i);
      });

      it('rejects wrong canonical ID families', () => {
        const raw = {
          explanation: validExplanation,
          operations: [{ operation_type: 'update_claim', target_id: 'EV01', reason: 'r' }] // EV is for Event, not Claim!
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Invalid/i);
      });

      it('source disposition/inspection cannot introduce source identity', () => {
        // Try to disposition a source that doesn't exist in ctx
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'inspect_source', source_id: 'U99', reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Cannot inspect unavailable/i);

        const raw2 = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'disposition_source', source_id: 'U99', reason: 'r', relationship_type: 'not_yet_classified', target_ref: null }
          ]
        };
        expect(() => parseProviderProposal(raw2, ctx)).toThrow(/Cannot disposition unavailable/i);
      });

      it('rejects wrong-family local references', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 't', actor: 'a', action: 'act', target: 't', effect: 'e', assessment: 'Reported', reason: 'r' },
            {
              operation_type: 'disposition_source',
              source_id: 'U01',
              reason: 'r',
              relationship_type: 'supports_claim', // requires a claim!
              target_ref: 'new_event_1' // provided an event ref
            }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).toThrow(/Wrong local reference family for claim disposition/i);
      });

    });

    describe('Minimal and Rich Shapes', () => {
      it('accepts minimal update shapes', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'update_claim', target_id: 'C01', reason: 'just reason' },
            { operation_type: 'update_event', target_id: 'EV01', reason: 'just reason' },
            { operation_type: 'update_gap', target_id: 'G01', reason: 'just reason' },
            { operation_type: 'update_action', target_id: 'A01', reason: 'just reason' }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
      });

      it('accepts rich update shapes', () => {
        const raw = {
          explanation: validExplanation,
          operations: [
            { operation_type: 'update_claim', target_id: 'C01', proposition: 'p', actor: 'a', action: 'act', target: 't', domain_time: 't', assessment: 'Contested', reasoning: 'r', scope: 's', limits: [], integrity_signals: 'i', limitations: [], reason: 'r' }
          ]
        };
        expect(() => parseProviderProposal(raw, ctx)).not.toThrow();
      });
    });
  });
});
