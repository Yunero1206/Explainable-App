import { describe, expect, it, vi } from 'vitest';
import { runGeminiStructuredInteraction, isRetryableError } from '../server/inference/geminiStructuredInteraction';
import { cleanAndParseJson } from '../server/inference/jsonUtils';
import { createIntakeService } from '../server/intakeService';
import { detectContentLanguage, assertProposalPreservesSourceLanguage } from '../src/provider/languagePolicy';
import { createEmptyLedgerCase } from '../src/ledger/factory';
import { parseCaseId, parseCaseNumber, parseCaseTitle, parseStructuralInstant } from '../src/ledger/schema';
import type { LedgerV3Case } from '../src/ledger/types';

describe('Stress & Resilience Test Suite (Zero Flow Stoppage)', () => {
  describe('Gemini Provider Retry & Resiliency', () => {
    it('detects retryable error patterns accurately', () => {
      expect(isRetryableError(new Error('HTTP 429 Too Many Requests'))).toBe(true);
      expect(isRetryableError(new Error('503 Service Unavailable: Model is overloaded'))).toBe(true);
      expect(isRetryableError(new Error('fetch failed: ETIMEDOUT'))).toBe(true);
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('Quota exceeded for metric'))).toBe(true);
      expect(isRetryableError(new Error('Invalid argument: field X is required'))).toBe(false);
    });

    it('retries on transient 429/503 errors and succeeds when next attempt passes', async () => {
      const sleepFn = vi.fn().mockResolvedValue(undefined);
      const create = vi
        .fn()
        .mockRejectedValueOnce(new Error('429 Resource has been exhausted (rate limit)'))
        .mockRejectedValueOnce(new Error('503 Service Unavailable: Model is overloaded'))
        .mockResolvedValueOnce({ output_text: '{"status":"recovered"}' });

      const result = await runGeminiStructuredInteraction(
        { interactions: { create } } as never,
        {
          model: 'gemini-3.5-flash-lite',
          systemInstruction: 'System rule',
          parts: [{ text: 'Case message' }],
          responseJsonSchema: { type: 'object' },
          stage: 'proposal_generation',
        },
        { maxRetries: 3, initialDelayMs: 10, sleepFn }
      );

      expect(result).toBe('{"status":"recovered"}');
      expect(create).toHaveBeenCalledTimes(3);
      expect(sleepFn).toHaveBeenCalledTimes(2);
    });

    it('fails fast without retrying on permanent 400 invalid argument errors', async () => {
      const sleepFn = vi.fn().mockResolvedValue(undefined);
      const create = vi.fn().mockRejectedValue(new Error('400 Invalid argument supplied in schema.'));

      await expect(
        runGeminiStructuredInteraction(
          { interactions: { create } } as never,
          {
            model: 'gemini-3.5-flash-lite',
            systemInstruction: 'System rule',
            parts: [{ text: 'Case message' }],
            responseJsonSchema: { type: 'object' },
            stage: 'proposal_generation',
          },
          { maxRetries: 3, initialDelayMs: 10, sleepFn }
        )
      ).rejects.toThrow('proposal_generation: 400 Invalid argument supplied in schema.');

      expect(create).toHaveBeenCalledTimes(1);
      expect(sleepFn).not.toHaveBeenCalled();
    });
  });

  describe('JSON Cleaning & Malformed Output Resilience', () => {
    it('parses valid JSON wrapped in markdown fences safely', () => {
      const input = '```json\n{\n  "action": "ok"\n}\n```';
      expect(cleanAndParseJson(input)).toEqual({ action: 'ok' });
    });

    it('parses plain JSON with leading/trailing spaces', () => {
      const input = '   {"key": 123}   \n';
      expect(cleanAndParseJson(input)).toEqual({ key: 123 });
    });

    it('throws descriptive error on truncated / corrupt JSON instead of crashing silently', () => {
      const corrupt = '```json\n{"incomplete": [1, 2, ';
      expect(() => cleanAndParseJson(corrupt)).toThrow(/Failed to parse JSON/);
    });

    it('handles malformed JSON from provider in intakeService by rejecting cleanly without corrupting parent ledger', async () => {
      const parent = createEmptyLedgerCase({
        id: parseCaseId('CASE_STRESS_JSON_001'),
        case_number: parseCaseNumber('CASE-901'),
        title: parseCaseTitle('Malformed JSON test'),
        created_at: parseStructuralInstant('2026-08-16T10:00:00.000Z'),
      });

      const provider = vi.fn().mockResolvedValue({
        provider: 'google-gemini' as const,
        raw_response_text: '```json\n{"corrupted": true, broken',
      });

      const intake = createIntakeService({ provider });
      const response = await intake({
        prior_ledger: parent,
        client_request_id: 'REQ_STRESS_01',
        message: 'Report on delivery status',
        inference_mode: 'live',
      });

      if (response.success === false) {
        expect(response.error.code).toBe('PROPOSAL_REJECTED');
        expect(response.run.status).toBe('rejected');
        expect(response.run.validation_errors.length).toBeGreaterThan(0);
      } else {
        expect(response.success).toBe(false);
      }
    });
  });

  describe('Language Policy Edge Cases & Robustness', () => {
    it('returns null for short inputs and numeric IDs to prevent false-positive rejections', () => {
      expect(detectContentLanguage('ok')).toBeNull();
      expect(detectContentLanguage('CASE-123456')).toBeNull();
      expect(detectContentLanguage('1234567890 987654321')).toBeNull();
      expect(detectContentLanguage('👍👌🎉')).toBeNull();
    });

    it('allows short statements to pass language assertion without rejection', () => {
      const proposal = {
        explanation: {
          answer: 'Accepted your report.',
          text: 'The statement was recorded.',
          user_goal: 'Preserve report.',
        },
        operations: [],
      };

      const result = assertProposalPreservesSourceLanguage({
        sourceTexts: ['#ORD-998812'],
        proposal: proposal as never,
      });

      expect(result).toBeNull();
    });
  });

  describe('Sequential Revision Stress Chain (Deep Ledger Growth)', () => {
    it('processes 10 sequential turns with deterministic Replay without state divergence', async () => {
      let currentLedger: LedgerV3Case = createEmptyLedgerCase({
        id: parseCaseId('CASE_STRESS_CHAIN_001'),
        case_number: parseCaseNumber('CASE-902'),
        title: parseCaseTitle('Deep revision stress chain'),
        created_at: parseStructuralInstant('2026-08-16T10:00:00.000Z'),
      });

      const intake = createIntakeService();

      for (let turn = 1; turn <= 10; turn++) {
        const response = await intake({
          prior_ledger: currentLedger,
          client_request_id: `REQ_CHAIN_TURN_${turn}`,
          message: `Sequential turn ${turn}: user reports update regarding incident ${turn}.`,
          inference_mode: 'replay',
        });

        expect(response.success).toBe(true);
        if (response.success) {
          currentLedger = response.ledger;
          expect(currentLedger.revisions.length).toBe(turn);
          expect(currentLedger.statements.length).toBe(turn);
          expect(currentLedger.current_revision_id).toBe(`R${String(turn).padStart(2, '0')}`);
        }
      }

      expect(currentLedger.revisions).toHaveLength(10);
      expect(currentLedger.statements).toHaveLength(10);
      expect(currentLedger.revisions[9].delta.entries.length).toBeGreaterThan(0);
    });
  });
});
