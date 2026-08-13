import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { createIntakeService } from '../server/intakeService.js';
import { createProviderGenerationJsonSchema } from '../server/proposalProvider.js';
import { createEmptyLedgerCase } from '../src/ledger/factory.js';
import {
  parseCaseId,
  parseCaseNumber,
  parseCaseTitle,
  parseLedgerV3,
  parseStructuralInstant,
} from '../src/ledger/schema.js';
import { parseIntakeResponse } from '../src/runtime/modelRun.js';

function emptyLedger() {
  return createEmptyLedgerCase({
    id: parseCaseId('CASE_server-test'),
    case_number: parseCaseNumber('CASE-001'),
    title: parseCaseTitle('Server boundary test'),
    created_at: parseStructuralInstant('2026-08-11T00:00:00.000Z'),
  });
}

function clock() {
  let tick = Date.parse('2026-08-11T01:00:00.000Z');
  return () => new Date(tick++);
}

describe('Ledger V3 intake boundary', () => {
  it('accepts a replay proposal and returns a fully validated ledger plus audit', async () => {
    const runIntake = createIntakeService({ now: clock() });
    const result = parseIntakeResponse(await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-accepted-1',
      message: 'My delivery arrived damaged.',
      locale: 'en',
      inference_mode: 'replay',
    }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(parseLedgerV3(result.ledger).current_revision_id).toBe('R01');
    expect(result.ledger.statements[0]?.text).toBe('My delivery arrived damaged.');
    expect(result.ledger.revisions[0]?.claims[0]?.assessment).toBe('Reported');
    expect(result.run).toMatchObject({
      status: 'accepted',
      provider: 'deterministic-replay',
      model_id: 'gemini-3.6-flash',
      committed_revision_id: 'R01',
    });
  });

  it('keeps the accepted parent unchanged when proposal validation rejects', async () => {
    const parent = emptyLedger();
    const before = JSON.stringify(parent);
    const runIntake = createIntakeService({ now: clock() });
    const result = parseIntakeResponse(await runIntake({
      prior_ledger: parent,
      client_request_id: 'request-rejected-1',
      message: '[reject] exercise the rejection boundary',
      inference_mode: 'replay',
    }));

    expect(result.success).toBe(false);
    expect(JSON.stringify(parent)).toBe(before);
    if (result.success === true) return;
    expect(result.run.status).toBe('rejected');
    expect(result.run.committed_revision_id).toBeNull();
    expect(result.error.code).toBe('PROPOSAL_REJECTED');
    expect('ledger' in result).toBe(false);
  });

  it('returns a compact audit-safe error for an invalid Gemini relationship', async () => {
    const parent = emptyLedger();
    const before = JSON.stringify(parent);
    const rawResponse = JSON.stringify({
      explanation: {
        text: 'Invalid provider proposal.',
        user_goal: 'Exercise the rejected-run boundary.',
      },
      operations: [{
        operation_type: 'disposition_source',
        relationship_type: 'mentions_claim',
        source_id: 'U01',
        target_ref: null,
        reason: 'Invalid generated relationship.',
      }],
    });
    const runIntake = createIntakeService({
      now: clock(),
      provider: async () => ({ provider: 'google-gemini', raw_response_text: rawResponse }),
    });

    const result = parseIntakeResponse(await runIntake({
      prior_ledger: parent,
      client_request_id: 'request-invalid-live-relationship',
      message: 'Record this report.',
      inference_mode: 'live',
    }));

    expect(result.success).toBe(false);
    expect(JSON.stringify(parent)).toBe(before);
    if (result.success === true) return;
    expect(result.run.status).toBe('rejected');
    expect(result.run.raw_response_text).toBe(rawResponse);
    expect(result.error.message).toContain('invalid disposition_source combination');
    expect(result.error.message).not.toContain('invalid_union');
    expect(result.error.message.length).toBeLessThan(500);
  });

  it('accepts the typed Gemini generation wire and preserves the exact raw response in audit', async () => {
    const operations = createProviderGenerationJsonSchema().properties.operations;
    const emptyBuckets = Object.fromEntries(operations.required.map((operationType) => [operationType, []]));
    const wireProposal = {
      explanation: {
        answer: 'The current record supports only that the user reported a damaged delivery.',
        text: 'Recorded the report without treating it as independently verified.',
        user_goal: 'Preserve the delivery issue and understand what the current record supports.',
      },
      reasoning: {
        turn_intent: 'record',
        answer_status: 'recorded',
        steps: [{
          id: 'S01', kind: 'fact', text: 'The user reported that the delivery arrived damaged.',
          depends_on: [], source_basis_ids: ['U01'], claim_refs: ['new_claim_1'], gap_refs: [],
        }],
      },
      operations: {
        ...emptyBuckets,
        add_claim: [{
          operation_type: 'add_claim', local_ref: 'new_claim_1',
          proposition: 'The user reported that the delivery arrived damaged.', actor: 'The user',
          action: 'reported', target: 'a damaged delivery', domain_time: 'At the current intake',
          assessment: 'Reported', reasoning: 'The proposition is bounded to the user statement.',
          scope: 'The current submitted statement.', limits: ['No independent inspection has been accepted.'],
          source_basis_ids: ['U01'], reason: 'Preserve the report without promoting it to objective fact.',
        }],
        disposition_source: [{
          operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01',
          target_ref: 'new_claim_1', reason: 'The statement directly supports this reported proposition.',
        }],
      },
    };
    const rawResponse = JSON.stringify(wireProposal);
    const runIntake = createIntakeService({
      now: clock(),
      provider: async () => ({ provider: 'google-gemini', raw_response_text: rawResponse }),
    });

    const result = parseIntakeResponse(await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-typed-generation-wire',
      message: 'My delivery arrived damaged.',
      inference_mode: 'live',
    }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.run.raw_response_text).toBe(rawResponse);
    expect(result.ledger.revisions[0]?.claims[0]?.proposition).toBe('The user reported that the delivery arrived damaged.');
    expect(result.ledger.relationships[0]).toMatchObject({
      relationship_type: 'supports_claim', source_id: 'U01', target_id: 'C01',
    });
  });

  it('rejects an incomplete add_claim from the typed wire and preserves the accepted parent', async () => {
    const parent = emptyLedger();
    const before = JSON.stringify(parent);
    const operations = createProviderGenerationJsonSchema().properties.operations;
    const emptyBuckets = Object.fromEntries(operations.required.map((operationType) => [operationType, []]));
    const rawResponse = JSON.stringify({
      explanation: { answer: 'Recorded.', text: 'Recorded.', user_goal: 'Record the issue.' },
      reasoning: { turn_intent: 'record', answer_status: 'recorded', steps: [] },
      operations: {
        ...emptyBuckets,
        add_claim: [{ operation_type: 'add_claim', local_ref: 'new_claim_1' }],
      },
    });
    const runIntake = createIntakeService({
      now: clock(),
      provider: async () => ({ provider: 'google-gemini', raw_response_text: rawResponse }),
    });

    const result = parseIntakeResponse(await runIntake({
      prior_ledger: parent,
      client_request_id: 'request-incomplete-add-claim-wire',
      message: 'Record this issue.',
      inference_mode: 'live',
    }));

    expect(result.success).toBe(false);
    expect(JSON.stringify(parent)).toBe(before);
    if (result.success === true) return;
    expect(result.error.message).toContain('operation_type="add_claim" is missing required fields:');
    expect(result.run.raw_response_text).toBe(rawResponse);
  });

  it('rejects translated case content and preserves the accepted parent', async () => {
    const parent = emptyLedger();
    const before = JSON.stringify(parent);
    const rawResponse = JSON.stringify({
      explanation: {
        text: 'The supplier delivery remains disputed and needs more evidence before a decision.',
        user_goal: 'Decide whether to stop sales and request a refund.',
      },
      operations: [
        {
          operation_type: 'add_claim', local_ref: 'new_claim_1',
          proposition: 'The delivered products were reported as defective.', actor: 'The customer',
          action: 'reported', target: 'defective products', domain_time: 'After delivery',
          assessment: 'Reported', reasoning: 'The current statement reports the defect.',
          scope: 'The current delivery.', limits: ['No independent test has been accepted.'],
          source_basis_ids: ['U01'], reason: 'Keep the report bounded to the source.',
        },
        {
          operation_type: 'add_event', local_ref: 'new_event_1', domain_time: 'After delivery',
          actor: 'The customer', action: 'reported', target: 'defective products',
          effect: 'The delivery decision became disputed.', assessment: 'Reported',
          finding_refs: ['new_claim_1'], source_basis_ids: ['U01'], reason: 'Record the material occurrence.',
        },
        {
          operation_type: 'add_gap', local_ref: 'new_gap_1',
          question: 'Which units are defective under controlled test conditions?',
          relevance: 'The answer changes whether the remaining stock can be sold.',
          resolving_evidence: 'A controlled lot test.', acquisition_guidance: 'Test retained units by lot.',
          collection_boundary: 'Use only records for the disputed delivery.',
          target_claim_refs: ['new_claim_1'], source_basis_ids: ['U01'], reason: 'The defect scope is unresolved.',
        },
        {
          operation_type: 'add_action', local_ref: 'new_action_1', title: 'Quarantine the remaining stock',
          description: 'Pause sales while a controlled test determines the affected scope.', priority: 'high',
          target_gap_refs: ['new_gap_1'], source_basis_ids: ['U01'], reason: 'Prevent additional exposure.',
        },
        {
          operation_type: 'disposition_source', relationship_type: 'supports_claim', source_id: 'U01',
          target_ref: 'new_claim_1', reason: 'The statement reports the alleged defect.',
        },
        {
          operation_type: 'disposition_source', relationship_type: 'raises_gap', source_id: 'U01',
          target_ref: 'new_gap_1', reason: 'The statement leaves the defect scope unresolved.',
        },
      ],
    });
    const runIntake = createIntakeService({
      now: clock(),
      provider: async () => ({ provider: 'google-gemini', raw_response_text: rawResponse }),
    });

    const result = parseIntakeResponse(await runIntake({
      prior_ledger: parent,
      client_request_id: 'request-language-preservation',
      message: 'Tui cần quyết định có nên dừng bán lô hàng này không vì khách đã phản ánh sản phẩm bị lỗi, nhưng bên cung cấp vẫn chưa gửi bằng chứng kiểm định và tui chưa biết chính xác lô nào bị ảnh hưởng.',
      locale: 'en',
      inference_mode: 'live',
    }));

    expect(result.success).toBe(false);
    expect(JSON.stringify(parent)).toBe(before);
    if (result.success === true) return;
    expect(result.run.status).toBe('rejected');
    expect(result.error.message).toContain('Content language mismatch');
    expect(result.error.message).toContain('UI language cannot translate source-owned content');
  });

  it('accepts an attachment only after hashing and inspecting it', async () => {
    const runIntake = createIntakeService({ now: clock() });
    const bytes = Buffer.from('receipt body', 'utf8');
    const result = await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-file-1',
      attachments: [{
        name: 'receipt.txt',
        type: 'text/plain',
        size: bytes.byteLength,
        dataUrl: `data:text/plain;base64,${bytes.toString('base64')}`,
      }],
      inference_mode: 'replay',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.ledger.evidence[0]?.content.blob?.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.ledger.revisions[0]?.inspections).toHaveLength(1);
    expect(result.ledger.relationships[0]?.relationship_type).toBe('not_yet_classified');
  });

  it('uses explicit run modes instead of keyword-triggered retrieval', async () => {
    const rawResponse = JSON.stringify({
      explanation: {
        answer: 'The submitted question was recorded without using the public web.',
        text: 'The current intake does not establish a new case fact.',
        user_goal: 'Analyze the supplied record.',
      },
      reasoning: {
        turn_intent: 'explain',
        answer_status: 'recorded',
        steps: [{ id: 'S01', kind: 'fact', text: 'The user submitted this question.', depends_on: [], source_basis_ids: ['U01'], claim_refs: [], gap_refs: [] }],
      },
      operations: [{
        operation_type: 'disposition_source', relationship_type: 'not_yet_classified',
        source_id: 'U01', target_ref: null, reason: 'The question does not itself establish a case fact.',
      }],
    });
    let retrievalCalls = 0;
    const runIntake = createIntakeService({
      now: clock(),
      retriever: async () => {
        retrievalCalls++;
        return {
          status: 'no_public_need', provider: 'none', product: 'none', requests: [],
          executed_queries: [], admitted_sources: [], rejected_candidates: [],
          provider_request_ids: [], credits_used: null, failure_reason: null,
        };
      },
      provider: async (_mode, input) => {
        expect(input.retrieval?.status).toBe(retrievalCalls === 0 ? 'not_requested' : 'no_public_need');
        return { provider: 'google-gemini', raw_response_text: rawResponse };
      },
    });

    const analysisOnly = await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-analysis-only',
      message: 'Please search the web, but this run is analysis only.',
      inference_mode: 'live',
      run_mode: 'analysis_only',
    });
    expect(analysisOnly.success).toBe(true);
    expect(retrievalCalls).toBe(0);
    expect(analysisOnly.run).toMatchObject({
      run_mode: 'analysis_only',
      retrieval_trace: { status: 'not_requested', provider: 'none' },
    });

    const webAssisted = await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-web-assisted-no-keyword',
      message: 'Analyze this submitted question.',
      inference_mode: 'live',
      run_mode: 'web_assisted',
    });
    expect(webAssisted.success).toBe(true);
    expect(retrievalCalls).toBe(1);
    expect(webAssisted.run).toMatchObject({
      run_mode: 'web_assisted',
      retrieval_trace: { status: 'no_public_need' },
    });
  });

  it('admits grounded authoritative web retrieval as a bounded server-owned evidence source', async () => {
    const rawResponse = JSON.stringify({
      explanation: {
        text: 'PNJ đã công bố chính sách mua lại chung, nhưng nguồn này không xác nhận điều kiện hay giá trị của chiếc nhẫn cụ thể.',
        user_goal: 'Xác định thông tin công khai nào hỗ trợ quyết định bán, đổi hoặc giữ chiếc nhẫn.',
      },
      operations: [
        {
          operation_type: 'add_claim',
          local_ref: 'new_claim_1',
          proposition: 'PNJ đã công bố thông tin chung về việc tiếp nhận giao dịch mua lại tại các địa điểm và thời gian được liệt kê.',
          actor: 'PNJ',
          action: 'đã công bố',
          target: 'thông tin tiếp nhận giao dịch mua lại',
          domain_time: 'Theo trang được truy xuất ngày 11/08/2026',
          assessment: 'Established within current record',
          reasoning: 'Trích đoạn đến từ website chính thức của PNJ và chỉ hỗ trợ chính sách công khai.',
          scope: 'Chính sách công khai được nêu trong trích đoạn, không phải chiếc nhẫn cụ thể.',
          limits: ['Không xác nhận chiếc nhẫn đủ điều kiện hoặc sẽ được mua với giá nào.'],
          source_basis_ids: ['E01'],
          reason: 'Ghi nhận chính sách công khai trong đúng phạm vi nguồn chính thức.',
        },
        {
          operation_type: 'disposition_source',
          relationship_type: 'supports_claim',
          source_id: 'E01',
          target_ref: 'new_claim_1',
          reason: 'Website chính thức trực tiếp hỗ trợ tuyên bố về chính sách công khai.',
        },
        {
          operation_type: 'disposition_source',
          relationship_type: 'not_yet_classified',
          source_id: 'U01',
          target_ref: null,
          reason: 'Nội dung người dùng đặt mục tiêu và câu hỏi, không tự xác lập chính sách của PNJ.',
        },
      ],
    });
    const runIntake = createIntakeService({
      now: clock(),
      retriever: async () => ({
        status: 'completed',
        provider: 'tavily',
        product: 'search',
        requests: [{
          request_id: 'RQ01',
          public_question: 'PNJ công bố chính sách mua lại nào?',
          search_query: 'PNJ chính sách thu đổi mua lại vàng 18K Sa Đéc',
          authority_entity: 'PNJ',
          authority_kind: 'first_party_official',
          official_domains: ['pnj.com.vn'],
          case_specific_exclusion: 'Không xác nhận điều kiện hoặc giá của chiếc nhẫn cụ thể.',
        }],
        executed_queries: ['PNJ chính sách thu đổi mua lại vàng 18K Sa Đéc'],
        admitted_sources: [{
          request_id: 'RQ01',
          publisher: 'PNJ',
          page_title: 'Thông tin thu đổi, mua lại',
          source_url: 'https://www.pnj.com.vn/chinh-sach/thong-tin-thu-doi-mua-lai/',
          source_excerpt: 'PNJ công bố danh sách cửa hàng tiếp nhận giao dịch mua lại cùng thời gian áp dụng.',
          published_or_updated_at: '22/07/2026',
          authority_entity: 'PNJ',
          authority_kind: 'first_party_official',
          authority_scope: 'Chính sách mua lại, địa điểm và thời gian do PNJ công bố.',
          search_query: 'PNJ chính sách thu đổi mua lại vàng 18K Sa Đéc',
        }],
        rejected_candidates: [],
        provider_request_ids: ['tavily-request-01'],
        credits_used: 1,
        failure_reason: null,
      }),
      provider: async (_mode, input) => {
        expect(input.prepared.evidence[0]?.acquisition_method).toBe('authoritative_web_retrieval');
        expect(input.retrieval?.status).toBe('completed');
        return { provider: 'google-gemini', raw_response_text: rawResponse };
      },
    });

    const result = await runIntake({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-authoritative-web',
      message: 'Hãy tra cứu Internet từ nguồn chính thức của PNJ để làm rõ chính sách mua lại.',
      inference_mode: 'live',
      run_mode: 'web_assisted',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const webEvidence = result.ledger.evidence[0];
    expect(webEvidence).toMatchObject({
      id: 'E01',
      acquisition_method: 'authoritative_web_retrieval',
      input_form: 'web_excerpt',
      web_provenance: {
        publisher: 'PNJ',
        source_url: 'https://www.pnj.com.vn/chinh-sach/thong-tin-thu-doi-mua-lai/',
      },
    });
    expect(result.ledger.revisions[0]?.inspections[0]).toMatchObject({
      evidence_id: 'E01',
      match_status: 'not_assessed',
    });
    expect(result.ledger.relationships.find((relationship) => relationship.source_id === 'E01')).toMatchObject({
      relationship_type: 'supports_claim',
      target_id: 'C01',
    });
    expect(result.run.retrieval_trace).toMatchObject({
      status: 'completed',
      provider: 'tavily',
      admitted_evidence_ids: ['E01'],
      executed_queries: ['PNJ chính sách thu đổi mua lại vàng 18K Sa Đéc'],
      provider_request_ids: ['tavily-request-01'],
      credits_used: 1,
    });
  });

  it('maps an invalid request to HTTP 400 and a rejected proposal to HTTP 422', async () => {
    const app = createApp({ runIntake: createIntakeService({ now: clock() }) });
    const invalid = await request(app).post('/api/intake').send({ prior_ledger: emptyLedger() });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_REQUEST');

    const rejected = await request(app).post('/api/intake').send({
      prior_ledger: emptyLedger(),
      client_request_id: 'request-http-reject',
      message: '[reject]',
      inference_mode: 'replay',
    });
    expect(rejected.status).toBe(422);
    expect(rejected.body.success).toBe(false);
    expect(rejected.body.run.status).toBe('rejected');
  });
});
