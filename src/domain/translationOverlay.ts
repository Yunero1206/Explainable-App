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
  return `${caseId}_${revisionId}_${locale}`;
}

export function applyTranslationOverlay(
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
