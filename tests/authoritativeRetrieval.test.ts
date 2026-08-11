import { describe, expect, it } from 'vitest';
import {
  admitAuthoritativeSources,
  createAuthoritativeSearchPrompt,
  isSafePublicSearchQuery,
  shouldAttemptAuthoritativeRetrieval,
} from '../server/authoritativeRetrieval.js';
import type { PublicRetrievalRequest, RetrievedWebCandidate } from '../src/retrieval/types.js';
import { isAuthoritativeSourceUrl } from '../src/retrieval/sourcePolicy.js';

const pnjRequest: PublicRetrievalRequest = {
  request_id: 'RQ01',
  public_question: 'What buyback policy has PNJ publicly stated?',
  search_query: 'PNJ chính sách thu đổi mua lại vàng 18K Sa Đéc',
  authority_entity: 'PNJ',
  authority_kind: 'first_party_official',
  case_specific_exclusion: 'This cannot establish whether a particular ring will be accepted or valued at a specific amount.',
};

function candidate(overrides: Partial<RetrievedWebCandidate> = {}): RetrievedWebCandidate {
  return {
    request_id: 'RQ01',
    publisher: 'PNJ',
    page_title: 'Thông tin thu đổi, mua lại',
    source_url: 'https://www.pnj.com.vn/blog/thong-tin-thu-doi-mua-lai/',
    source_excerpt: 'Cửa hàng PNJ được liệt kê tiếp nhận giao dịch mua lại trong khung giờ được công bố.',
    published_or_updated_at: '22/07/2026',
    authority_entity: 'PNJ',
    authority_kind: 'first_party_official',
    authority_scope: 'PNJ public buyback policy and the locations and hours PNJ publicly lists.',
    ...overrides,
  };
}

describe('authoritative retrieval policy', () => {
  it('opens the retrieval gate only for an explicit web-search request', () => {
    expect(shouldAttemptAuthoritativeRetrieval('Hãy tra cứu Internet và ưu tiên nguồn chính thức của PNJ.')).toBe(true);
    expect(shouldAttemptAuthoritativeRetrieval('Please search the web for the current official policy.')).toBe(true);
    expect(shouldAttemptAuthoritativeRetrieval('Tui đang cân nhắc bán lại chiếc nhẫn.')).toBe(false);
    expect(shouldAttemptAuthoritativeRetrieval('Please analyze the attached file.')).toBe(false);
  });

  it('rejects identifiers and private contact data from public search queries', () => {
    expect(isSafePublicSearchQuery(pnjRequest.search_query)).toBe(true);
    expect(isSafePublicSearchQuery('PNJ invoice 123456789 buyback')).toBe(false);
    expect(isSafePublicSearchQuery('PNJ contact phu@example.com')).toBe(false);
    expect(isSafePublicSearchQuery('https://pnj.com.vn buyback')).toBe(false);
  });

  it('sends only the sanitized public request to Search', () => {
    const prompt = createAuthoritativeSearchPrompt([{ ...pnjRequest, case_specific_exclusion: 'Private ring serial ABC-998877.' }]);
    expect(prompt).toContain(pnjRequest.search_query);
    expect(prompt).not.toContain('ABC-998877');
    expect(prompt).not.toContain(pnjRequest.public_question);
  });

  it('admits a grounded first-party source with claim-specific authority', () => {
    const result = admitAuthoritativeSources({
      requests: [pnjRequest],
      candidates: [candidate()],
      grounding_sources: [{
        uri: 'https://www.pnj.com.vn/blog/thong-tin-thu-doi-mua-lai/',
        title: 'Thông tin thu đổi, mua lại | PNJ',
      }],
    });
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
    expect(result.admitted[0]).toMatchObject({ publisher: 'PNJ', search_query: pnjRequest.search_query });
  });

  it.each([
    ['social source', candidate({ source_url: 'https://www.facebook.com/PNJ/posts/123' }), 'disallowed_host'],
    ['third-party article', candidate({ source_url: 'https://example-news.vn/pnj-buyback' }), 'not_official_domain'],
    ['ungrounded official URL', candidate(), 'not_grounded'],
    ['wrong authority', candidate({ authority_entity: 'Another jeweller' }), 'authority_mismatch'],
  ])('rejects %s instead of promoting it to evidence', (_label, webCandidate, reason) => {
    const result = admitAuthoritativeSources({
      requests: [pnjRequest],
      candidates: [webCandidate as RetrievedWebCandidate],
      grounding_sources: reason === 'not_grounded' ? [] : [{ uri: webCandidate.source_url, title: webCandidate.publisher }],
    });
    expect(result.admitted).toEqual([]);
    expect(result.rejected[0]?.reason_code).toBe(reason);
  });

  it('admits a responsible public-authority domain for a public rule', () => {
    const request: PublicRetrievalRequest = {
      ...pnjRequest,
      authority_entity: 'State Bank of Vietnam',
      authority_kind: 'public_authority',
      search_query: 'State Bank of Vietnam public payment regulation',
    };
    const source = candidate({
      publisher: 'State Bank of Vietnam',
      authority_entity: request.authority_entity,
      authority_kind: 'public_authority',
      source_url: 'https://www.sbv.gov.vn/webcenter/portal/en/home/rules',
      authority_scope: 'The public payment regulation issued by the State Bank of Vietnam.',
    });
    const result = admitAuthoritativeSources({
      requests: [request],
      candidates: [source],
      grounding_sources: [{ uri: source.source_url, title: source.page_title }],
    });
    expect(result.admitted).toHaveLength(1);
  });

  it('keeps official product documentation admissible while rejecting AI answer surfaces', () => {
    expect(isAuthoritativeSourceUrl('https://openai.com/policies/usage-policies/', 'OpenAI', 'first_party_official')).toBe(true);
    expect(isAuthoritativeSourceUrl('https://chatgpt.com/share/example', 'OpenAI', 'first_party_official')).toBe(false);
    expect(isAuthoritativeSourceUrl('https://www.facebook.com/PNJ/posts/123', 'PNJ', 'first_party_official')).toBe(false);
  });
});
