// @vitest-environment jsdom

import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaseIntakeChat } from '../src/components/CaseIntakeChat';
import { ExportModal } from '../src/components/ExportModal';
import { ReferenceDetailModal } from '../src/components/ReferenceDetailModal';
import { RightCaseRecord } from '../src/components/RightCaseRecord';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { SAMPLE_CASES } from '../src/data/sampleCases';
import { caseReferenceTarget } from '../src/presentation/caseReferences';
import { deriveChatMessages, projectLedger } from '../src/presentation/projectLedger';
import type { CaseReference } from '../src/types';

beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.clear !== 'function') {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, String(value)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        length: 0,
      },
    });
  }
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() { return document.body; },
  });
});

beforeEach(() => {
  try {
    globalThis.localStorage?.clear();
  } catch {}
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
    expect(screen.getAllByText(projected.claims.find((claim) => claim.id === findingId)!.text).length).toBeGreaterThanOrEqual(2);
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
    fireEvent.click(screen.getByRole('button', { name: /Gaps/ }));

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
    fireEvent.click(within(gapCard).getAllByRole('button', { name: `Open event ${eventId}` })[0]);
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

  it('localizes chat, citation, and export chrome without translating case content', () => {
    localStorage.setItem('locale', 'vi');
    const { projected } = sample();
    const finding = projected.claims[0];

    render(
      <LanguageProvider>
        <CaseIntakeChat
          messages={[]}
          onSendMessage={async () => undefined}
          isAnalyzing
        />
        <ReferenceDetailModal
          caseData={projected}
          reference={{ kind: 'finding', id: finding.id }}
          onClose={() => undefined}
          onSelectReference={() => undefined}
        />
        <ExportModal caseData={projected} onClose={() => undefined} />
      </LanguageProvider>
    );

    expect(screen.getByText('Đang tái dựng hồ sơ vụ việc...')).toBeTruthy();
    expect(screen.getByText('Hỗ trợ ảnh, PDF, tệp văn bản và ảnh chụp màn hình')).toBeTruthy();
    expect(screen.getByText('Trích dẫn phát hiện')).toBeTruthy();
    expect(screen.getByText('Xuất vụ việc')).toBeTruthy();
    expect(screen.getAllByText(finding.text).length).toBeGreaterThan(0);
  });

  it('shows a web evidence excerpt and copyable URL without opening or embedding the webpage', async () => {
    const { projected } = sample();
    const sourceUrl = 'https://www.pnj.com.vn/blog/thong-tin-thu-doi-mua-lai/';
    const original = {
      id: 'E99',
      label: 'Thông tin thu đổi, mua lại',
      claimed_source: 'PNJ',
      acquisition_method: 'authoritative_web_retrieval' as const,
      input_form: 'web_excerpt' as const,
      evidence_time: '22/07/2026',
      received_at: '2026-08-11T14:00:00.000Z',
      subject_object_ids: [],
      content: 'PNJ công bố danh sách cửa hàng tiếp nhận giao dịch mua lại.',
      source_attribution: 'Website chính thức của PNJ.',
      case_object_match: 'Chỉ khớp phạm vi chính sách công khai.',
      case_object_match_status: 'not_assessed' as const,
      completeness_context: 'Chỉ lưu trích đoạn nguồn.',
      integrity_signals: 'URL đã qua admission.',
      limitations: ['Không xác nhận chiếc nhẫn cụ thể.'],
    };
    const caseData = {
      ...projected,
      evidence: [{
        ...original,
        web_provenance: {
          publisher: 'PNJ',
          page_title: 'Thông tin thu đổi, mua lại',
          source_url: sourceUrl,
          published_or_updated_at: '22/07/2026',
          retrieved_at: '2026-08-11T14:00:00.000Z',
          authority_kind: 'first_party_official' as const,
          authority_entity: 'PNJ',
          authority_scope: 'Chính sách mua lại, địa điểm và thời gian do PNJ công bố.',
          search_query: 'PNJ chính sách thu đổi mua lại vàng 18K Sa Đéc',
        },
      }, ...projected.evidence],
    };
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    render(
      <LanguageProvider>
        <ReferenceDetailModal
          caseData={caseData}
          reference={{ kind: 'evidence', id: original.id }}
          onClose={() => undefined}
          onSelectReference={() => undefined}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('PNJ công bố danh sách cửa hàng tiếp nhận giao dịch mua lại.')).toBeTruthy();
    expect(screen.getByText(sourceUrl)).toBeTruthy();
    expect(document.querySelector(`a[href="${sourceUrl}"]`)).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Copy URL' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(sourceUrl));
    expect(screen.getByRole('button', { name: 'URL copied' })).toBeTruthy();
  });
});
