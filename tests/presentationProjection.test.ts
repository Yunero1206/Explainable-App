import { describe, expect, it } from 'vitest';
import { SAMPLE_CASES } from '../src/data/sampleCases.js';
import { deriveChatMessages, projectLedger } from '../src/presentation/projectLedger.js';

describe('Ledger V3 presentation projection', () => {
  it('projects only accepted fields and exposes revision/run audit', () => {
    const { ledger, run } = SAMPLE_CASES[0];
    const projected = projectLedger({
      ledger,
      runs: [run],
      blobs: [],
      metadata: {
        case_id: ledger.id,
        display_title: 'QuickBite damaged delivery',
        display_case_number: 'DEMO-001',
        is_archived: false,
      },
      locale: 'en',
    });

    expect(projected.claims[0]?.actor).toBe(ledger.revisions[0]?.claims[0]?.actor);
    expect(projected.claims[0]?.user_statement_ids).toEqual(['U01']);
    expect(projected.gaps[0]?.what_is_unknown).toBe(ledger.revisions[0]?.gaps[0]?.question);
    expect(projected.revisions[0]?.delta_entries.length).toBeGreaterThan(0);
    expect(projected.model_runs[0]?.status).toBe('accepted');
    expect(JSON.stringify(projected)).not.toMatch(/Unspecified Source|"Unknown"|"Pending"/);
  });

  it('derives the conversation from accepted intake and revision records', () => {
    const messages = deriveChatMessages(SAMPLE_CASES[0].ledger, []);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'user', text: expect.stringContaining('arrived damaged') });
    expect(messages[1]).toMatchObject({ role: 'assistant', revision_id: 'R01' });
  });
});
