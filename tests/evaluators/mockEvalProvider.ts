import { runProposalProvider } from '../../server/proposalProvider.js';
import {
  buildEmptyCase,
  mkInstant,
  mkIntakeId,
  mkModelRunId,
  mkPNBT,
  mkRevisionId,
  mkST,
  mkStatementId,
} from '../fixtures/ledgerV3.js';
import type { ProposalProviderInput } from '../../server/proposalProvider.js';

interface PromptfooContext {
  vars?: {
    statement?: string;
  };
}

export default class MockEvalProvider {
  private customId: string;

  constructor(options: { id?: string } = {}) {
    this.customId = options.id || 'deterministic-replay-provider';
  }

  id(): string {
    return this.customId;
  }

  async callApi(_prompt: string, context?: PromptfooContext): Promise<{ output: string }> {
    const statementText = context?.vars?.statement || 'Default evaluation statement';
    const emptyCase = buildEmptyCase();
    const intakeId = mkIntakeId('IN01');
    const statementId = mkStatementId('U01');

    const input: ProposalProviderInput = {
      ledger: emptyCase,
      prepared: {
        intake: {
          id: intakeId,
          received_at: mkInstant('2026-08-17T12:00:00.000Z'),
          parts: [{ kind: 'statement' as const, statement_id: statementId, raw_text: mkPNBT(statementText) }],
        },
        statements: [{
          id: statementId,
          source_intake_id: intakeId,
          text: mkPNBT(statementText),
        }],
        evidence: [],
        revision_id: mkRevisionId('R01'),
        model_run_id: mkModelRunId('MR01'),
        created_at: mkInstant('2026-08-17T12:00:01.000Z'),
        objective: mkST('Offline evaluation intake run'),
      },
      message: statementText,
      attachments: [],
    };

    const result = await runProposalProvider('replay', input);
    return {
      output: result.raw_response_text,
    };
  }
}
