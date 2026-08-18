// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ReferenceDetailModal } from '../src/components/ReferenceDetailModal';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import type { PresentationCaseData } from '../src/types';

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
});

afterEach(() => cleanup());

describe('Toulmin 4-Block Argumentation in ReferenceDetailModal', () => {
  const mockCase: PresentationCaseData = {
    id: 'case_toulmin_test',
    case_number: 'ET-2026-TOULMIN',
    title: 'Damaged Goods Dispute',
    objective: 'Full refund for defective lot',
    current_revision_id: 'rev_1',
    is_archived: false,
    locale: 'en',
    revisions: [],
    model_runs: [],
    authoritative_record: null,
    statements: [
      {
        id: 'U01',
        text: 'The courier delivered the package at 2 PM on August 12.',
        submitted_at: '2026-08-12T14:00:00Z',
        attachment_ids: [],
      },
    ],
    evidence: [
      {
        id: 'E01',
        label: 'Photo of unbroken seal with internal fissure',
        claimed_source: 'Customer Unbox',
        evidence_time: '12/08/2026',
        received_at: '2026-08-12T14:05:00Z',
        content: 'Internal damage visible under the intact factory security sticker.',
        source_attribution: 'Original high-res photo',
        case_object_match: 'Matches claimed product',
        case_object_match_status: 'matched',
        completeness_context: 'Full frame picture',
        integrity_signals: 'EXIF metadata intact',
        limitations: ['No video recording of unboxing'],
        fixity_hash: 'abc123hash',
        acquisition_method: 'user_upload',
        input_form: 'document',
        subject_object_ids: [],
      },
    ],
    events: [],
    claims: [
      {
        id: 'C01',
        text: 'The product defect originated prior to delivery handoff.',
        actor: 'Supplier',
        action: 'packaged',
        target: 'defective unit',
        time: '12/08/2026',
        assessment: 'Established within current record',
        reasoning: 'The crack is positioned beneath the intact factory seal, proving it occurred during factory packaging rather than post-delivery transit.',
        scope: 'Physical item condition at receipt',
        limits: ['Opponent may refute if they produce warehouse CCTV proving seal was reapplied'],
        user_statement_ids: ['U01'],
        supporting_evidence: ['E01'],
        qualifying_evidence: [],
        conflicting_evidence: [],
      },
    ],
    gaps: [],
  };

  it('renders all 4 Toulmin logic blocks (Claim, Data, Warrant, Rebuttals) in Vietnamese', () => {
    localStorage.setItem('locale', 'vi');
    render(
      <LanguageProvider>
        <ReferenceDetailModal
          caseData={mockCase}
          reference={{ kind: 'finding', id: 'C01' }}
          onClose={vi.fn()}
          onSelectReference={vi.fn()}
        />
      </LanguageProvider>
    );

    // Block 1: Claim Proposition & Strength
    expect(screen.getByText(/luận điểm cần xác lập/i)).toBeDefined();
    expect(screen.getAllByText('The product defect originated prior to delivery handoff.').length).toBeGreaterThan(0);
    expect(screen.getByText(/có căn cứ bảo chứng/i)).toBeDefined();

    // Block 2: Grounding Data
    expect(screen.getByText(/căn cứ thực tế đầu vào/i)).toBeDefined();
    expect(screen.getByText(/tài liệu chứng cứ độc lập/i)).toBeDefined();
    expect(screen.getByText(/thông tin tự khai/i)).toBeDefined();

    // Block 3: Logical Warrant
    expect(screen.getByText(/cầu nối logic/i)).toBeDefined();
    expect(screen.getByText(/crack is positioned beneath the intact factory seal/i)).toBeDefined();

    // Block 4: Rebuttals & Blindspots
    expect(screen.getByText(/điều kiện bị đối phương bác bỏ & điểm mù/i)).toBeDefined();
    expect(screen.getByText(/produce warehouse CCTV proving seal was reapplied/i)).toBeDefined();
  });
});
