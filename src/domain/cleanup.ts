import { CanonicalCaseRecord } from '../canonical/types.js';
import { TranslationOverlay } from './translationOverlay.js';

export interface AppState {
  canonicalCases: CanonicalCaseRecord[];
  caseUiMetadataById: Record<string, any>;
  chatMessagesMap: Record<string, any[]>;
  translationOverlays: Record<string, TranslationOverlay>;
}

/**
 * Pure case-state cleanup function.
 * Deletes a case and all its associated metadata, chat history, and translations safely
 * without corrupting the canonical state index or creating collisions.
 */
export function cleanupCaseState(
  caseId: string,
  state: AppState
): AppState {
  // Remove from canonical collection
  const nextCases = state.canonicalCases.filter(c => c.id !== caseId);

  // Clean up UI metadata
  const nextMetadata = { ...state.caseUiMetadataById };
  delete nextMetadata[caseId];

  // Clean up chat messages
  const nextChat = { ...state.chatMessagesMap };
  delete nextChat[caseId];

  // Clean up translations (keys are formatted as `${caseId}::${revisionId}::${locale}`)
  const nextTranslations: Record<string, TranslationOverlay> = {};
  for (const [key, val] of Object.entries(state.translationOverlays)) {
    if (!key.startsWith(`${caseId}::`)) {
      nextTranslations[key] = val;
    }
  }

  return {
    canonicalCases: nextCases,
    caseUiMetadataById: nextMetadata,
    chatMessagesMap: nextChat,
    translationOverlays: nextTranslations,
  };
}
