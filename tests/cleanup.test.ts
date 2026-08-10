import { describe, it, expect } from 'vitest';
import { cleanupCaseState, AppState } from '../src/domain/cleanup.js';
import { TranslationOverlay } from '../src/domain/translationOverlay.js';
import { createValidBaseline } from './canonicalRuntime.test.js';
import { projectCurrentRecord } from '../src/domain/currentProjection.js';
import { saveCase } from '../src/storage/caseStore.js';

describe('cleanupCaseState', () => {
  it('correctly destroys a case and its metadata without side effects on other cases', () => {
    const caseId = 'case-01';
    const otherCaseId = 'case-02';

    const case01 = createValidBaseline();
    case01.id = caseId;
    
    const case02 = createValidBaseline();
    case02.id = otherCaseId;

    const initialState: AppState = {
      canonicalCases: [case01, case02],
      caseUiMetadataById: {
        [caseId]: { displayTitle: 'Case 01', displayCaseNumber: 'C-01', isArchived: false },
        [otherCaseId]: { displayTitle: 'Case 02', displayCaseNumber: 'C-02', isArchived: false }
      },
      chatMessagesMap: {
        [caseId]: [{ text: 'msg1' }],
        [otherCaseId]: [{ text: 'msg2' }]
      },
      translationOverlaysByCaseId: {
        [caseId]: { 'R01': { 'vi': { title: 'Trans1' } as TranslationOverlay } },
        [otherCaseId]: { 'R01': { 'vi': { title: 'Trans2' } as TranslationOverlay } },
      },
      attachmentPayloadsByCaseId: {
        [caseId]: { 'EV1': 'blob1' },
        [otherCaseId]: { 'EV2': 'blob2' },
      }
    };

    // Make a deep clone to verify purity
    const jsonBefore = JSON.stringify(initialState);

    const nextState = cleanupCaseState(caseId, initialState);

    // Initial state is unmodified (pure function proof)
    expect(JSON.stringify(initialState)).toBe(jsonBefore);

    // Case 01 is removed
    expect(nextState.canonicalCases.find(c => c.id === caseId)).toBeUndefined();
    expect(nextState.caseUiMetadataById[caseId]).toBeUndefined();
    expect(nextState.chatMessagesMap[caseId]).toBeUndefined();
    expect(nextState.translationOverlaysByCaseId[caseId]).toBeUndefined();
    expect(nextState.attachmentPayloadsByCaseId[caseId]).toBeUndefined();

    // Case 02 is preserved exactly as it was
    expect(nextState.canonicalCases.find(c => c.id === otherCaseId)).toBeDefined();
    expect(nextState.caseUiMetadataById[otherCaseId]).toBeDefined();
    expect(nextState.chatMessagesMap[otherCaseId]).toBeDefined();
    expect(nextState.translationOverlaysByCaseId[otherCaseId]?.['R01']?.['vi']).toBeDefined();
    expect(nextState.attachmentPayloadsByCaseId[otherCaseId]?.['EV2']).toBeDefined();
  });
  it('does not delete data for cases that share a string prefix (no prefix collision)', () => {
    const caseId = 'case-a';
    const childCaseId = 'case-a_child';

    const case01 = createValidBaseline();
    case01.id = caseId;
    
    const case02 = createValidBaseline();
    case02.id = childCaseId;

    const initialState: AppState = {
      canonicalCases: [case01, case02],
      caseUiMetadataById: {
        [caseId]: { displayTitle: 'Parent', displayCaseNumber: 'C-01', isArchived: false },
        [childCaseId]: { displayTitle: 'Child', displayCaseNumber: 'C-02', isArchived: false }
      },
      chatMessagesMap: {
        [caseId]: [{ text: 'msg1' }],
        [childCaseId]: [{ text: 'msg2' }]
      },
      translationOverlaysByCaseId: {
        [caseId]: { 'R01': { 'vi': { title: 'Trans1' } as TranslationOverlay } },
        [childCaseId]: { 'R01': { 'vi': { title: 'Trans2' } as TranslationOverlay } },
      },
      attachmentPayloadsByCaseId: {}
    };

    const nextState = cleanupCaseState(caseId, initialState);

    // case-a_child is preserved exactly as it was
    expect(nextState.canonicalCases.find(c => c.id === childCaseId)).toBeDefined();
    expect(nextState.caseUiMetadataById[childCaseId]).toBeDefined();
    expect(nextState.chatMessagesMap[childCaseId]).toBeDefined();
    expect(nextState.translationOverlaysByCaseId[childCaseId]?.['R01']?.['vi']).toBeDefined();
    
    // case-a is removed
    expect(nextState.canonicalCases.find(c => c.id === caseId)).toBeUndefined();
    expect(nextState.caseUiMetadataById[caseId]).toBeUndefined();
    expect(nextState.chatMessagesMap[caseId]).toBeUndefined();
    expect(nextState.translationOverlaysByCaseId[caseId]).toBeUndefined();
  });
});

describe('saveCase Boundary Validation', () => {
  it('rejects raw presentation projections', async () => {
    const record = createValidBaseline();
    const presentation = projectCurrentRecord(record);
    // TypeScript thinks presentation is PresentationCaseData, but we cast to bypass type system
    // saveCase validates using parseCanonicalRecord before attempting DB access.
    // @ts-expect-error: deliberately passing invalid record
    await expect(saveCase(presentation)).rejects.toThrow();
  });

  it('rejects legacy objects', async () => {
    const legacy = {
      case_number: '123',
      schema_version: '1.0.0', // Missing '2.0.0'
      // other legacy fields
    };
    // @ts-expect-error: deliberately passing invalid record
    await expect(saveCase(legacy)).rejects.toThrow();
  });
});

