import { CanonicalCaseRecord } from '../canonical/types.js';
import { TranslationOverlay } from './translationOverlay.js';

export interface AppState {
  canonicalCases: CanonicalCaseRecord[];
  caseUiMetadataById: Record<string, { displayTitle: string | undefined; displayCaseNumber: string; isArchived: boolean }>;
  chatMessagesMap: Record<string, any[]>;
  translationOverlaysByCaseId: Record<string, Record<string, Record<string, TranslationOverlay>>>;
  attachmentPayloadsByCaseId: Record<string, Record<string, any>>;
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

  const nextTranslations = { ...state.translationOverlaysByCaseId };
  delete nextTranslations[caseId];

  const nextAttachments = { ...state.attachmentPayloadsByCaseId };
  delete nextAttachments[caseId];

  return {
    canonicalCases: nextCases,
    caseUiMetadataById: nextMetadata,
    chatMessagesMap: nextChat,
    translationOverlaysByCaseId: nextTranslations,
    attachmentPayloadsByCaseId: nextAttachments,
  };
}
