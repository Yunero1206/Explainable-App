// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RightCaseRecord } from '../src/components/RightCaseRecord';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { SAMPLE_CASES } from '../src/data/sampleCases';
import { projectLedger } from '../src/presentation/projectLedger';

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
  // Mock ResizeObserver for React Flow
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

afterEach(() => cleanup());

describe('ReasoningGraphView and Graph Tab Integration', () => {
  function getProjectedCase() {
    const { ledger, run } = SAMPLE_CASES[0];
    return projectLedger({
      ledger,
      runs: [run],
      blobs: [],
      metadata: {
        case_id: ledger.id,
        display_title: ledger.title,
        display_case_number: ledger.case_number,
        is_archived: false,
      },
      locale: 'vi',
    });
  }

  it('renders the Graph DAG tab and switches view on click', async () => {
    const projected = getProjectedCase();
    render(
      <LanguageProvider>
        <RightCaseRecord
          caseData={projected}
          onSelectReference={vi.fn()}
        />
      </LanguageProvider>
    );

    // Find and click the Graph DAG tab button
    const graphTabBtn = screen.getByRole('button', { name: /graph dag|đồ thị dag/i });
    expect(graphTabBtn).toBeDefined();

    fireEvent.click(graphTabBtn);

    // After clicking, wait for lazy Reasoning DAG component to load
    expect(await screen.findByText(/full provenance/i)).toBeDefined();
    expect(screen.getByText(/reasoning dag/i)).toBeDefined();
  });
});
