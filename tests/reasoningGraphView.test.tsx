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

  it('renders the Graph DAG tab, 2-row toolbar, TB/LR toggle, and handles fullscreen popup modal', async () => {
    const projected = getProjectedCase();
    render(
      <LanguageProvider>
        <RightCaseRecord
          caseData={projected}
          onSelectReference={vi.fn()}
        />
      </LanguageProvider>
    );

    // Find and click the Graph DAG / Sơ đồ suy luận tab button
    const graphTabBtn = screen.getByRole('button', { name: /graph dag|đồ thị dag|sơ đồ suy luận|reasoning map/i });
    expect(graphTabBtn).toBeDefined();
    fireEvent.click(graphTabBtn);

    // Wait for lazy Reasoning DAG component to load by waiting for direction button
    const directionBtn = await screen.findByRole('button', { name: /tb/i });
    expect(directionBtn).toBeDefined();
    fireEvent.click(directionBtn);
    expect(screen.getByRole('button', { name: /lr/i })).toBeDefined();

    // Verify row 2: search input and expand popup button
    const searchInput = screen.getByPlaceholderText(/tìm nút|search/i);
    expect(searchInput).toBeDefined();

    // Verify ArbGraph & ArgRAG floating legend bar
    const legendEl = await screen.findByText(/chú giải|bảo chứng|supports/i);
    expect(legendEl).toBeDefined();

    const expandBtn = screen.getByTitle(/toàn màn hình|fullscreen/i);
    expect(expandBtn).toBeDefined();

    // Click expand button to open Fullscreen Modal Popup
    fireEvent.click(expandBtn);

    // In modal, check collapse button
    const collapseBtn = await screen.findByRole('button', { name: /thu nhỏ|collapse/i });
    expect(collapseBtn).toBeDefined();

    // Close modal by clicking collapse button
    fireEvent.click(collapseBtn);
    expect(screen.queryByRole('button', { name: /thu nhỏ/i })).toBeNull();
  });
});
