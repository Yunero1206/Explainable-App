import { z } from 'zod';
import { PresentationCaseData } from '../types.js';

export const TranslationOverlaySchema = z.object({
  title: z.string().optional(),
  objective: z.string().optional(),
  events: z.array(z.object({
    id: z.string(),
    action: z.string(),
    effect: z.string().optional(),
  })).optional(),
  claims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    reasoning: z.string(),
    limits: z.array(z.string()),
  })).optional(),
  gaps: z.array(z.object({
    id: z.string(),
    what_is_unknown: z.string(),
    why_it_matters: z.string(),
    what_evidence_could_resolve_it: z.string(),
    where_how_to_obtain: z.string(),
    what_not_to_over_collect: z.string(),
  })).optional(),
  actions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
  })).optional()
}).strict();

export type TranslationOverlay = z.infer<typeof TranslationOverlaySchema>;

export function getTranslationKey(caseId: string, revisionId: string, locale: string): string {
  return `${caseId}::${revisionId}::${locale}`;
}

/**
 * Parse and validate a raw translation response.
 * Returns a validated TranslationOverlay or null if parsing fails.
 */
export function parseTranslationResponse(rawResponse: unknown): TranslationOverlay | null {
  if (typeof rawResponse !== 'object' || rawResponse === null) return null;

  const envelope = rawResponse as Record<string, unknown>;
  if (envelope.success !== true) return null;

  const overlayCandidate: Record<string, unknown> = {};
  if (typeof envelope.title === 'string') overlayCandidate.title = envelope.title;
  if (typeof envelope.objective === 'string') overlayCandidate.objective = envelope.objective;
  if (Array.isArray(envelope.events)) overlayCandidate.events = envelope.events;
  if (Array.isArray(envelope.claims)) overlayCandidate.claims = envelope.claims;
  if (Array.isArray(envelope.gaps)) overlayCandidate.gaps = envelope.gaps;
  if (Array.isArray(envelope.actions)) overlayCandidate.actions = envelope.actions;

  const result = TranslationOverlaySchema.safeParse(overlayCandidate);
  if (!result.success) return null;

  return result.data;
}

/**
 * Validate that a translation overlay is still applicable to the current request.
 * Rejects stale overlays where case/revision/locale have changed since the request.
 */
export function isOverlayStale(
  overlayKey: string,
  currentCaseId: string,
  currentRevisionId: string,
  currentLocale: string
): boolean {
  const expectedKey = getTranslationKey(currentCaseId, currentRevisionId, currentLocale);
  return overlayKey !== expectedKey;
}

/**
 * Validate overlay IDs against the requested projection's known entity IDs.
 * Filters out overlay entries whose IDs don't match the projection (unknown/mismatched).
 */
export function filterOverlayToProjection(
  overlay: TranslationOverlay,
  projectionIds: {
    eventIds: Set<string>;
    claimIds: Set<string>;
    gapIds: Set<string>;
    actionIds: Set<string>;
  }
): TranslationOverlay {
  return {
    title: overlay.title,
    objective: overlay.objective,
    events: overlay.events?.filter(e => projectionIds.eventIds.has(e.id)),
    claims: overlay.claims?.filter(c => projectionIds.claimIds.has(c.id)),
    gaps: overlay.gaps?.filter(g => projectionIds.gapIds.has(g.id)),
    actions: overlay.actions?.filter(a => projectionIds.actionIds.has(a.id)),
  };
}

export interface TranslationContext {
  caseId: string;
  revisionId: string;
  locale: string;
  projectionIds: {
    eventIds: Set<string>;
    claimIds: Set<string>;
    gapIds: Set<string>;
    actionIds: Set<string>;
  };
}

/**
 * Validates and accepts a translation response at the client boundary.
 * Proves that:
 * - The raw response is not malformed.
 * - The current application state has not moved on (stale rejection).
 * - Only entity IDs permitted by the current projection are stored (unknown ID rejection).
 */
export function acceptTranslationResponse(
  rawResponse: unknown,
  originalContext: TranslationContext,
  currentContext: TranslationContext
): TranslationOverlay {
  // 1. Stale rejection
  if (
    originalContext.caseId !== currentContext.caseId ||
    originalContext.revisionId !== currentContext.revisionId ||
    originalContext.locale !== currentContext.locale
  ) {
    throw new Error('Translation response rejected: context is stale');
  }

  // 2. Malformed rejection
  const parsed = parseTranslationResponse(rawResponse);
  if (!parsed) {
    throw new Error('Translation response rejected: malformed response');
  }

  // 3. Filter unknown/stable IDs not permitted in the projection
  return filterOverlayToProjection(parsed, currentContext.projectionIds);
}

export function applyTranslation(
  projection: PresentationCaseData,
  overlay: TranslationOverlay | undefined
): PresentationCaseData {
  if (!overlay) return projection;

  const translatedEvents = projection.events.map(ev => {
    const override = overlay.events?.find(o => o.id === ev.id);
    if (!override) return ev;
    return { ...ev, action: override.action, effect: override.effect ?? ev.effect };
  });

  const translatedClaims = projection.claims.map(c => {
    const override = overlay.claims?.find(o => o.id === c.id);
    if (!override) return c;
    return { ...c, text: override.text, reasoning: override.reasoning, limits: override.limits };
  });

  const translatedGaps = projection.gaps.map(g => {
    const override = overlay.gaps?.find(o => o.id === g.id);
    if (!override) return g;
    return {
      ...g,
      what_is_unknown: override.what_is_unknown,
      why_it_matters: override.why_it_matters,
      what_evidence_could_resolve_it: override.what_evidence_could_resolve_it,
      where_how_to_obtain: override.where_how_to_obtain,
      what_not_to_over_collect: override.what_not_to_over_collect
    };
  });

  const translatedActions = projection.actions.map(a => {
    const override = overlay.actions?.find(o => o.id === a.id);
    if (!override) return a;
    return { ...a, title: override.title, description: override.description };
  });

  return {
    ...projection,
    title: overlay.title ?? projection.title,
    objective: overlay.objective ?? projection.objective,
    events: translatedEvents,
    claims: translatedClaims,
    gaps: translatedGaps,
    actions: translatedActions
  };
}
