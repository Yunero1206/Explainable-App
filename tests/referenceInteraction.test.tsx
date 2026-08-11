// @vitest-environment jsdom

import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CaseIntakeChat } from '../src/components/CaseIntakeChat';
import { ReferenceDetailModal } from '../src/components/ReferenceDetailModal';
import { RightCaseRecord } from '../src/components/RightCaseRecord';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { SAMPLE_CASES } from '../src/data/sampleCases';
import { caseReferenceTarget } from '../src/presentation/caseReferences';
import { deriveChatMessages, projectLedger } from '../src/presentation/projectLedger';
import type { CaseReference } from '../src/types';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() { return document.body; },
  });
});

afterEach(() => cleanup());

function sample() {
  const { ledger, run } = SAMPLE_CASES[0];
  return {
    ledger,
    projected: projectLedger({
      ledger,
      runs: [run],
      blobs: [],
      metadata: {
        case_id: ledger.id,
        display_title: ledger.title,
        display_case_number: ledger.case_number,
        is_archived: false,
      },
      locale: 'en',
    }),
  };
}

function ReferenceHarness() {
  const { ledger, projected } = sample();
  const [selected, setSelected] = useState<CaseReference | null>(null);
  return (
    <LanguageProvider>
      <div>
        <CaseIntakeChat
          messages={deriveChatMessages(ledger, [])}
          onSendMessage={async () => undefined}
          onSelectReference={(reference) => setSelected({ ...reference })}
          focusedReference={selected}
        />
        <RightCaseRecord
          caseData={projected}
          onSelectReference={(reference) => setSelected({ ...reference })}
          focusedReference={selected}
        />
        {selected && (selected.kind === 'evidence' || selected.kind === 'finding') && (
          <ReferenceDetailModal
            caseData={projected}
            reference={selected}
            onClose={() => setSelected(null)}
            onSelectReference={(reference) => setSelected({ ...reference })}
          />
        )}
      </div>
    </LanguageProvider>
  );
}

describe('case reference interactions', () => {
  it('opens Finding and Evidence keys as citation-source dialogs', async () => {
    const { projected } = sample();
    render(<ReferenceHarness />);
    const firstEvent = projected.events.find((event) => event.finding_ids.length > 0);
    expect(firstEvent).toBeDefined();
    const eventCard = document.querySelector<HTMLElement>(
      `[data-case-reference="${caseReferenceTarget({ kind: 'event', id: firstEvent!.id })}"]`
    );
    expect(eventCard).not.toBeNull();

    const findingId = firstEvent!.finding_ids[0];
    fireEvent.click(within(eventCard!).getByRole('button', { name: `Open finding ${findingId}` }));
    expect(await screen.findByRole('dialog', { name: `finding ${findingId}` })).toBeTruthy();
    expect(screen.getAllByText(projected.claims.find((claim) => claim.id === findingId)!.text)).toHaveLength(2);
    fireEvent.click(screen.getByTitle('Close citation'));

    const eventWithEvidence = projected.events.find((event) => event.evidence_ids.length > 0);
    if (eventWithEvidence === undefined) return;
    const evidenceCard = document.querySelector<HTMLElement>(
      `[data-case-reference="${caseReferenceTarget({ kind: 'event', id: eventWithEvidence.id })}"]`
    );
    const evidenceId = eventWithEvidence.evidence_ids[0];
    fireEvent.click(within(evidenceCard!).getByRole('button', { name: `Open evidence ${evidenceId}` }));
    expect(await screen.findByRole('dialog', { name: `evidence ${evidenceId}` })).toBeTruthy();
  });

  it('uses Event, Gap, and Action keys to switch, scroll, and highlight their records', async () => {
    const { projected } = sample();
    render(<ReferenceHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Gaps' }));

    const gap = projected.gaps[0];
    const gapCard = await waitFor(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-case-reference="${caseReferenceTarget({ kind: 'gap', id: gap.id })}"]`
      );
      expect(element).not.toBeNull();
      return element!;
    });
    const action = gap.actions[0];
    fireEvent.click(within(gapCard).getByRole('button', { name: `Open action ${action.id}` }));
    await waitFor(() => {
      const actionCards = document.querySelectorAll<HTMLElement>(
        `[data-case-reference="${caseReferenceTarget({ kind: 'action', id: action.id })}"]`
      );
      expect(Array.from(actionCards).some((card) => card.className.includes('ring-indigo-400'))).toBe(true);
    });

    const eventId = gap.related_event_ids[0];
    fireEvent.click(within(gapCard).getByRole('button', { name: `Open event ${eventId}` }));
    await waitFor(() => {
      const eventCard = document.querySelector<HTMLElement>(
        `[data-case-reference="${caseReferenceTarget({ kind: 'event', id: eventId })}"]`
      );
      expect(eventCard?.className).toContain('ring-indigo-400');
    });
  });

  it('routes a Statement key back to the original expanded chat submission', async () => {
    const { projected } = sample();
    render(<ReferenceHarness />);
    const event = projected.events.find((item) => item.user_statement_ids.length > 0)!;
    const eventCard = document.querySelector<HTMLElement>(
      `[data-case-reference="${caseReferenceTarget({ kind: 'event', id: event.id })}"]`
    )!;
    const statementId = event.user_statement_ids[0];
    fireEvent.click(within(eventCard).getByRole('button', { name: `Open statement ${statementId}` }));

    await waitFor(() => {
      const message = document.querySelector<HTMLElement>('[data-chat-message-id^="intake-"]');
      expect(message?.firstElementChild?.className).toContain('ring-sky-400');
    });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
