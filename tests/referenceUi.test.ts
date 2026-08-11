import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CaseIntakeChat } from '../src/components/CaseIntakeChat';
import { RightCaseRecord } from '../src/components/RightCaseRecord';
import { ModelRunsSummary } from '../src/components/TestModeBanner';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { SAMPLE_CASES } from '../src/data/sampleCases';
import { deriveChatMessages, projectLedger } from '../src/presentation/projectLedger';

function projectedSample() {
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
    locale: 'en',
  });
}

describe('case reference UI', () => {
  it('renders canonical keys as buttons and removes timeline assessment badges', () => {
    const markup = renderToStaticMarkup(React.createElement(
      LanguageProvider,
      null,
      React.createElement(RightCaseRecord, {
        caseData: projectedSample(),
        onSelectReference: () => undefined,
        focusSection: 'record',
      })
    ));

    expect(markup).toContain('data-case-key="EV01"');
    expect(markup).toContain('data-case-key="U01"');
    expect(markup).toContain('data-case-kind="finding"');
    expect(markup).not.toContain('Established within current record');
  });

  it('renders actions only inside their parent gap without workflow-status labels', () => {
    const markup = renderToStaticMarkup(React.createElement(
      LanguageProvider,
      null,
      React.createElement(RightCaseRecord, {
        caseData: projectedSample(),
        onSelectReference: () => undefined,
        focusSection: 'gaps',
      })
    ));

    expect(markup).toContain('data-case-key="G01"');
    expect(markup).toContain('data-case-key="A01"');
    expect(markup).not.toContain('>Gaps / Actions<');
    expect(markup).not.toContain('>open<');
    expect(markup).not.toContain('>high · pending<');
  });

  it('renders statement keys in chat and exposes only the configured Live model summary', () => {
    const { ledger } = SAMPLE_CASES[0];
    const chatMarkup = renderToStaticMarkup(React.createElement(CaseIntakeChat, {
      messages: deriveChatMessages(ledger, []),
      onSendMessage: async () => undefined,
      onSelectReference: () => undefined,
      focusedReference: { kind: 'statement', id: 'U01' },
    }));
    const modelMarkup = renderToStaticMarkup(React.createElement(ModelRunsSummary));

    expect(chatMarkup).toContain('data-case-key="U01"');
    expect(modelMarkup).toContain('Model Runs');
    expect(modelMarkup).toContain('gemini-3.6-flash');
    expect(modelMarkup).not.toContain('Replay');
    expect(modelMarkup).not.toContain('>Live<');
  });
});
