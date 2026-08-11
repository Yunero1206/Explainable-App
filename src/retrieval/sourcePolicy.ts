import type { AuthorityKind } from './types.js';

const BLOCKED_HOSTS = [
  'reddit.com',
  'facebook.com',
  'fb.com',
  'threads.net',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'quora.com',
  'medium.com',
  'wikipedia.org',
  'chatgpt.com',
  'gemini.google.com',
  'bard.google.com',
  'bing.com',
  'yahoo.com',
] as const;

const GENERIC_AUTHORITY_WORDS = new Set([
  'and', 'the', 'of', 'for', 'company', 'corporation', 'corp', 'group', 'official',
  'authority', 'department', 'ministry', 'agency', 'service', 'services', 'bank',
  'vietnam', 'viet', 'nam', 'limited', 'ltd', 'inc', 'co',
]);

function normalizedWords(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function sameAuthority(left: string, right: string): boolean {
  return normalizedWords(left).join('') === normalizedWords(right).join('');
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

function isBlockedHost(host: string): boolean {
  return BLOCKED_HOSTS.some((domain) => hostMatches(host, domain));
}

export function safeHttpsUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname) return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' || host.endsWith('.localhost') ||
      host === '[::1]' || host.includes(':') ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isDisallowedWebUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (isBlockedHost(host)) return true;
  if (host === 'vertexaisearch.cloud.google.com' || host.endsWith('.vertexaisearch.cloud.google.com')) return true;
  if ((host === 'google.com' || host.endsWith('.google.com')) && url.pathname === '/search') return true;
  return false;
}

function authorityMatchesFirstPartyHost(authorityEntity: string, host: string): boolean {
  const labels = host.split('.').filter((label) => label !== 'www');
  const entityWords = normalizedWords(authorityEntity).filter(
    (word) => word.length >= 2 && !GENERIC_AUTHORITY_WORDS.has(word)
  );
  const acronym = entityWords.map((word) => word[0]).join('');
  return entityWords.some((word) => labels.includes(word)) ||
    (acronym.length >= 2 && labels.includes(acronym));
}

function isPublicAuthorityHost(host: string): boolean {
  return host.endsWith('.gov') ||
    /(^|\.)(gov|gob|go)\.[a-z.]+$/i.test(host) ||
    host.endsWith('.gc.ca') ||
    host.endsWith('.gouv.fr') ||
    host.endsWith('.bund.de') ||
    host === 'europa.eu' || host.endsWith('.europa.eu') ||
    host.endsWith('.int') || host === 'un.org' || host.endsWith('.un.org');
}

export function authorityMatchesUrl(
  authorityEntity: string,
  authorityKind: AuthorityKind,
  url: URL
): boolean {
  const host = url.hostname.toLowerCase();
  return authorityKind === 'public_authority'
    ? isPublicAuthorityHost(host)
    : authorityMatchesFirstPartyHost(authorityEntity, host);
}

export function isAuthoritativeSourceUrl(
  value: string,
  authorityEntity: string,
  authorityKind: AuthorityKind
): boolean {
  const url = safeHttpsUrl(value);
  return url !== null && !isDisallowedWebUrl(url) && authorityMatchesUrl(authorityEntity, authorityKind, url);
}
