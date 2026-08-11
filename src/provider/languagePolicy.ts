import type { ProviderProposal } from './proposalTypes.js';

export type DetectedContentLanguage = 'vi' | 'en' | 'es' | 'fr' | 'zh-CN' | 'ja';

export interface LanguageSignal {
  language: DetectedContentLanguage;
  confidence: number;
  mixed: boolean;
  score: number;
}

const WORDS: Record<Exclude<DetectedContentLanguage, 'zh-CN' | 'ja'>, string[]> = {
  vi: [
    'tui', 'mình', 'bên', 'đang', 'cần', 'không', 'nhưng', 'và', 'với', 'đã', 'được',
    'có', 'cho', 'này', 'đó', 'chưa', 'phải', 'nên', 'hàng', 'khách', 'quyết định',
    'bằng chứng', 'vấn đề', 'hành động', 'yêu cầu', 'ngày', 'trước', 'sau',
  ],
  en: [
    'the', 'and', 'but', 'with', 'without', 'was', 'were', 'is', 'are', 'has', 'have',
    'this', 'that', 'from', 'for', 'before', 'after', 'should', 'could', 'what', 'which',
    'evidence', 'action', 'decision', 'reported', 'record', 'request', 'customer',
  ],
  es: [
    'el', 'la', 'los', 'las', 'y', 'pero', 'con', 'sin', 'que', 'por', 'para', 'una',
    'este', 'esta', 'antes', 'después', 'debe', 'puede', 'evidencia', 'acción', 'decisión',
  ],
  fr: [
    'le', 'la', 'les', 'et', 'mais', 'avec', 'sans', 'que', 'pour', 'une', 'des', 'ce',
    'cette', 'avant', 'après', 'doit', 'peut', 'preuve', 'action', 'décision', 'dossier',
  ],
};

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function wordScore(normalized: string, words: string[]): number {
  return words.reduce((score, word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return score + countMatches(normalized, new RegExp(`(^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, 'gu'));
  }, 0);
}

export function detectContentLanguage(text: string): LanguageSignal | null {
  const normalized = text.normalize('NFC').toLocaleLowerCase();
  if (normalized.trim().length < 12) return null;

  const scores: Record<DetectedContentLanguage, number> = {
    vi: wordScore(normalized, WORDS.vi)
      + countMatches(normalized, /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gu) * 2,
    en: wordScore(normalized, WORDS.en),
    es: wordScore(normalized, WORDS.es)
      + countMatches(normalized, /[¿¡ñáéíóúü]/gu),
    fr: wordScore(normalized, WORDS.fr)
      + countMatches(normalized, /[àâçéèêëîïôùûüÿœæ]/gu),
    'zh-CN': countMatches(normalized, /[\u3400-\u9fff]/gu) * 2,
    ja: countMatches(normalized, /[\u3040-\u30ff]/gu) * 3,
  };

  // Han characters are also used in Japanese. Kana is the decisive signal.
  if (scores.ja > 0) scores['zh-CN'] = 0;

  const ranked = (Object.entries(scores) as Array<[DetectedContentLanguage, number]>)
    .sort((left, right) => right[1] - left[1]);
  const [top, second] = ranked;
  const total = ranked.reduce((sum, [, score]) => sum + score, 0);
  if (top[1] < 4 || total === 0) return null;
  return {
    language: top[0],
    confidence: top[1] / total,
    mixed: second[1] >= 4 && second[1] / top[1] >= 0.45,
    score: top[1],
  };
}

function translationWasRequested(text: string): boolean {
  return /\btranslate\b|\btranslation\b|\btraducir\b|\btraduire\b|\bdịch\b|翻訳|翻译/iu.test(text);
}

const STRUCTURAL_KEYS = new Set([
  'operation_type', 'relationship_type', 'source_id', 'source_basis_ids', 'target_ref',
  'target_id', 'target_claim_refs', 'target_gap_refs', 'finding_refs', 'local_ref',
  'evidence_id', 'assessment', 'priority', 'resulting_status', 'match_status',
]);

function collectGeneratedText(value: unknown, key: string | null = null): string[] {
  if (key !== null && (STRUCTURAL_KEYS.has(key) || key.endsWith('_id') || key.endsWith('_ids') || key.endsWith('_refs'))) {
    return [];
  }
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectGeneratedText(item, key));
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([childKey, child]) => collectGeneratedText(child, childKey));
}

export function assertProposalPreservesSourceLanguage(input: {
  sourceTexts: string[];
  proposal: ProviderProposal;
}): void {
  const sourceText = input.sourceTexts.filter((text) => text.trim().length > 0).join('\n\n');
  if (sourceText.length === 0 || translationWasRequested(sourceText)) return;

  const source = detectContentLanguage(sourceText);
  const generated = detectContentLanguage(collectGeneratedText(input.proposal).join('\n'));
  if (
    source === null || generated === null || source.mixed || generated.mixed ||
    source.confidence < 0.58 || generated.confidence < 0.58 ||
    source.language === generated.language
  ) return;

  throw new Error(
    `Content language mismatch: the current intake is ${source.language}, but the generated case content is ${generated.language}. UI language cannot translate source-owned content.`
  );
}
