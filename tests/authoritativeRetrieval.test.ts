import { describe, expect, it } from 'vitest';
import {
  admitAuthoritativeSources,
  createTavilySearchPayload,
  extractFocusedExcerpt,
  isSafePublicSearchQuery,
} from '../server/authoritativeRetrieval.js';
import type { PublicRetrievalRequest, RetrievedWebCandidate } from '../src/retrieval/types.js';
import { isAuthoritativeSourceUrl } from '../src/retrieval/sourcePolicy.js';

const pnjRequest: PublicRetrievalRequest = {
  request_id: 'RQ01',
  public_question: 'What buyback policy has PNJ publicly stated?',
  search_query: 'PNJ chính sách thu đổi mua lại vàng 18K Sa Đéc',
  authority_entity: 'PNJ',
  authority_kind: 'first_party_official',
  official_domains: ['pnj.com.vn'],
  case_specific_exclusion: 'This cannot establish whether a particular ring will be accepted or valued at a specific amount.',
};

function candidate(overrides: Partial<RetrievedWebCandidate> = {}): RetrievedWebCandidate {
  return {
    request_id: 'RQ01',
    publisher: 'PNJ',
    page_title: 'Thông tin thu đổi, mua lại',
    source_url: 'https://www.pnj.com.vn/chinh-sach/thong-tin-thu-doi-mua-lai/',
    source_excerpt: 'Cửa hàng PNJ được liệt kê tiếp nhận giao dịch mua lại trong khung giờ được công bố.',
    published_or_updated_at: '22/07/2026',
    authority_entity: 'PNJ',
    authority_kind: 'first_party_official',
    authority_scope: 'PNJ public buyback policy and the locations and hours PNJ publicly lists.',
    ...overrides,
  };
}

describe('authoritative retrieval policy', () => {
  it('accepts a public topic query and rejects URLs as query input', () => {
    expect(isSafePublicSearchQuery(pnjRequest.search_query)).toBe(true);
    expect(isSafePublicSearchQuery('https://pnj.com.vn buyback')).toBe(false);
  });

  it('builds a fixed-cost Tavily payload containing only the sanitized public query and official domains with clean markdown extraction', () => {
    const payload = createTavilySearchPayload(pnjRequest);
    expect(payload).toMatchObject({
      query: pnjRequest.search_query,
      search_depth: 'basic',
      auto_parameters: false,
      include_domains: ['pnj.com.vn'],
      include_answer: false,
      include_raw_content: 'markdown',
      include_images: false,
      include_usage: true,
    });
    expect(JSON.stringify(payload)).not.toContain(pnjRequest.public_question);
  });

  it('extracts the relevant focused statutory/policy section from raw markdown content', () => {
    const rawMarkdown = `
# CỔNG THÔNG TIN ĐIỆN TỬ VĂN BẢN PHÁP LUẬT
[Trang chủ](https://vbpl.vn) | [Tin tức](https://vbpl.vn/news) | [Liên hệ](https://vbpl.vn/contact)

## CHƯƠNG XXI: CÁC TỘI XÂM PHẠM AN TOÀN GIAO THÔNG

Điều 259. Tội vi phạm quy định về điều khiển phương tiện giao thông đường sắt.
Người nào chỉ huy, điều khiển phương tiện giao thông đường sắt mà vi phạm quy định...

Điều 260. Tội vi phạm quy định về tham gia giao thông đường bộ.
1. Người nào tham gia giao thông đường bộ mà vi phạm quy định về an toàn giao thông đường bộ gây thiệt hại cho người khác thuộc một trong các trường hợp sau đây, thì bị phạt tiền từ 30.000.000 đồng đến 100.000.000 đồng, phạt cải tạo không giam giữ đến 03 năm hoặc phạt tù từ 01 năm đến 05 năm:
a) Làm chết người;
b) Gây thương tích hoặc gây tổn hại cho sức khỏe của 01 người mà tỷ lệ tổn thương cơ thể 61% trở lên.

Điều 261. Tội cản trở giao thông đường bộ.
Người nào đào, bới, cắt xẻ trái phép các công trình giao thông đường bộ...

[Bản quyền thuộc Cổng thông tin điện tử Bộ Tư Pháp](https://moj.gov.vn)
`;
    const snippet = 'Điều 260. Tội vi phạm quy định về tham gia giao thông đường bộ...';
    const query = 'quy định điều 260 bộ luật hình sự';

    const excerpt = extractFocusedExcerpt(rawMarkdown, snippet, query);
    expect(excerpt).toContain('Điều 260. Tội vi phạm quy định về tham gia giao thông đường bộ.');
    expect(excerpt).toContain('Làm chết người');
    expect(excerpt).not.toContain('Trang chủ');
    expect(excerpt).not.toContain('CHƯƠNG XXI');
  });

  it('falls back to search snippet when raw_content is empty or unparseable', () => {
    const snippet = 'Chính sách bảo hành vàng PNJ áp dụng trên toàn quốc tại hệ thống cửa hàng.';
    const query = 'chính sách bảo hành PNJ';

    expect(extractFocusedExcerpt(null, snippet, query)).toBe(snippet);
    expect(extractFocusedExcerpt('', snippet, query)).toBe(snippet);
    expect(extractFocusedExcerpt('   ', snippet, query)).toBe(snippet);
  });

  it('admits a direct Tavily result from the first-party domain with claim-specific authority', () => {
    const result = admitAuthoritativeSources({
      requests: [pnjRequest],
      candidates: [candidate()],
      provider_result_urls: ['https://www.pnj.com.vn/chinh-sach/thong-tin-thu-doi-mua-lai/'],
    });
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
    expect(result.admitted[0]).toMatchObject({ publisher: 'PNJ', search_query: pnjRequest.search_query });
  });

  it.each([
    ['social source', candidate({ source_url: 'https://www.facebook.com/PNJ/posts/123' }), 'disallowed_host'],
    ['blog page', candidate({ source_url: 'https://www.pnj.com.vn/blog/buyback-opinion/' }), 'disallowed_host'],
    ['third-party article', candidate({ source_url: 'https://example-news.vn/pnj-buyback' }), 'not_official_domain'],
    ['URL not returned by Tavily', candidate(), 'not_returned_by_provider'],
    ['wrong authority', candidate({ authority_entity: 'Another jeweller' }), 'authority_mismatch'],
  ])('rejects %s instead of promoting it to evidence', (_label, webCandidate, reason) => {
    const result = admitAuthoritativeSources({
      requests: [pnjRequest],
      candidates: [webCandidate as RetrievedWebCandidate],
      provider_result_urls: reason === 'not_returned_by_provider' ? [] : [webCandidate.source_url],
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
      official_domains: ['sbv.gov.vn'],
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
      provider_result_urls: [source.source_url],
    });
    expect(result.admitted).toHaveLength(1);
  });

  it('recognizes official Vietnamese public-law domains that do not use gov.vn', () => {
    const request: PublicRetrievalRequest = {
      ...pnjRequest,
      authority_entity: 'Chính phủ Việt Nam',
      authority_kind: 'public_authority',
      search_query: 'Chính phủ Việt Nam quy định thừa kế công khai',
      official_domains: ['chinhphu.vn'],
    };
    const source = candidate({
      publisher: request.authority_entity,
      authority_entity: request.authority_entity,
      authority_kind: 'public_authority',
      source_url: 'https://xaydungchinhsach.chinhphu.vn/quy-dinh-thua-ke.html',
      authority_scope: 'Quy định công khai do Chính phủ Việt Nam công bố.',
    });
    const result = admitAuthoritativeSources({
      requests: [request],
      candidates: [source],
      provider_result_urls: [source.source_url],
    });
    expect(result.admitted).toHaveLength(1);
  });

  it('keeps official product documentation admissible while rejecting AI answer surfaces', () => {
    expect(isAuthoritativeSourceUrl('https://openai.com/policies/usage-policies/', 'OpenAI', 'first_party_official')).toBe(true);
    expect(isAuthoritativeSourceUrl('https://openai.com/blog/example/', 'OpenAI', 'first_party_official')).toBe(false);
    expect(isAuthoritativeSourceUrl('https://chatgpt.com/share/example', 'OpenAI', 'first_party_official')).toBe(false);
    expect(isAuthoritativeSourceUrl('https://www.facebook.com/PNJ/posts/123', 'PNJ', 'first_party_official')).toBe(false);
  });
});
