import { describe, it } from 'vitest';
import 'dotenv/config';
import { createEmptyLedgerCase } from '../src/ledger/factory.js';
import { parseCaseId, parseCaseNumber, parseCaseTitle, parseStructuralInstant } from '../src/ledger/schema.js';
import { createIntakeService } from '../server/intakeService.js';
import { buildCaseViewExport } from '../src/presentation/exportCase.js';
import { projectLedger } from '../src/presentation/projectLedger.js';

const MSG1 = `My Shopee seller account was restricted on August 15 at around 10:20 AM. I believe it happened after three customer orders were cancelled within the same week.

I did not receive any warning before the restriction. When I contacted customer support, I understood that the restriction was permanent.

There is approximately VND 12.4 million in my seller balance that I currently cannot withdraw. I want to understand what happened, whether the restriction can be appealed, and what evidence I should prepare.`;

const MSG2 = `I checked my email and screenshots again, and I need to correct some of what I said earlier.

The restriction notice was actually sent on August 14 at 9:47 PM. August 15 at 10:20 AM was only the time when I opened the Shopee app and first noticed that I could not access the seller account.

I also found an email from August 12 warning me about unusual order activity, so my earlier statement that I received no warning was incorrect.

One more correction: customer support did not tell me that the restriction was permanent. Their message said that the account was under review and that the review could take up to seven business days.

The VND 12.4 million balance is still shown as unavailable for withdrawal. I have screenshots of the August 12 warning email, the August 14 restriction notice, and the support conversation.`;

describe('Shopee 2-Turn Reproduction', () => {
  it('runs turn 1 and turn 2 and inspects the resulting ledger and export', async () => {
    const service = createIntakeService();
    const initialCase = createEmptyLedgerCase({
      id: parseCaseId('CASE_repro_shopee'),
      case_number: parseCaseNumber('CASE-999'),
      title: parseCaseTitle('Shopee seller account restriction'),
      created_at: parseStructuralInstant(new Date().toISOString()),
    });

    console.log('=== RUNNING TURN 1 ===');
    const res1 = await service({
      prior_ledger: initialCase,
      client_request_id: 'turn-1',
      message: MSG1,
      inference_mode: 'live',
      run_mode: 'analysis_only',
    });

    console.log('Turn 1 success:', res1.success);
    if (!res1.success) {
      console.error('Turn 1 error:', (res1 as { error?: string }).error);
      return;
    }

    console.log('\n--- TURN 1 REVISION ---');
    const rev1 = res1.ledger.revisions[0];
    console.log('Events:', JSON.stringify(rev1.events, null, 2));
    console.log('Claims:', JSON.stringify(rev1.claims, null, 2));
    console.log('Gaps:', JSON.stringify(rev1.gaps, null, 2));

    console.log('=== RUNNING TURN 2 ===');
    const res2 = await service({
      prior_ledger: res1.ledger,
      client_request_id: 'turn-2',
      message: MSG2,
      inference_mode: 'live',
      run_mode: 'analysis_only',
    });

    console.log('Turn 2 success:', res2.success);
    if (!res2.success) {
      console.error('Turn 2 error:', (res2 as { error?: string }).error);
      console.error('Raw response:', res2.run.raw_response_text);
      return;
    }

    console.log('\n--- TURN 2 REVISION ---');
    const rev2 = res2.ledger.revisions[res2.ledger.revisions.length - 1];
    console.log('Events:', JSON.stringify(rev2.events, null, 2));
    console.log('Claims:', JSON.stringify(rev2.claims, null, 2));
    console.log('Gaps:', JSON.stringify(rev2.gaps, null, 2));
    console.log('Actions:', JSON.stringify(rev2.actions, null, 2));
    console.log('Trace:', JSON.stringify(res2.run.reconciliation_trace, null, 2));

    const proj = projectLedger({
      ledger: res2.ledger,
      runs: [res1.run, res2.run],
      blobs: [],
      metadata: {
        case_id: res2.ledger.id,
        display_title: res2.ledger.title,
        display_case_number: res2.ledger.case_number,
        is_archived: false,
      },
      locale: 'en',
    });
    const exported = buildCaseViewExport(proj);
    console.log('\n=== EXPORTED CASE VIEW ===');
    console.log(JSON.stringify(exported, null, 2));
  }, 180000);
});
