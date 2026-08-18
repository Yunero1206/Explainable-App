import { describe, expect, it } from 'vitest';
import { buildForensicProvenanceMarkdown } from '../src/presentation/exportCase.js';
import type { PresentationCaseData } from '../src/types.js';

describe('Forensic Provenance Dossier Export', () => {
  const mockCase: PresentationCaseData = {
    id: 'case_test_123',
    case_number: 'ET-2026-001',
    title: 'Dispute Over Damaged Goods',
    objective: 'Obtain full refund for delivered defect batch',
    current_revision_id: 'rev_002_abcdef',
    is_archived: false,
    locale: 'en',
    revisions: [],
    model_runs: [],
    authoritative_record: null,
    statements: [
      {
        id: 'U01',
        text: 'I ordered 10 units of gold rings on August 12 and received them damaged on August 14.',
        submitted_at: '2026-08-18T12:00:00Z',
        attachment_ids: [],
      },
    ],
    evidence: [
      {
        id: 'E01',
        label: 'Purchase Receipt',
        claimed_source: 'Merchant Store',
        evidence_time: '12/08/2026',
        received_at: '2026-08-18T12:00:00Z',
        content: 'Invoice for 10 units of gold rings. Order ID #8899.',
        source_attribution: 'Merchant official receipt',
        case_object_match: 'Matches claimed rings',
        case_object_match_status: 'matched',
        completeness_context: 'Complete receipt with transaction ID',
        integrity_signals: 'Signed digitally',
        fixity_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        limitations: [],
        acquisition_method: 'user_upload',
        input_form: 'document',
        subject_object_ids: [],
      },
    ],
    events: [
      {
        id: 'EV01',
        time: '12/08/2026',
        actor: 'Customer',
        action: 'purchased',
        target: '10 gold rings',
        effect: 'Transaction completed',
        assessment: 'Established within current record',
        user_statement_ids: ['U01'],
        evidence_ids: ['E01'],
        finding_ids: ['C01'],
      },
    ],
    claims: [
      {
        id: 'C01',
        text: 'The customer paid for 10 units on August 12.',
        actor: 'Customer',
        action: 'paid',
        target: '10 units',
        time: '12/08/2026',
        assessment: 'Established within current record',
        reasoning: 'Corroborated by purchase invoice E01.',
        scope: 'Transaction on August 12',
        limits: ['Does not prove condition at delivery'],
        user_statement_ids: ['U01'],
        supporting_evidence: ['E01'],
        qualifying_evidence: [],
        conflicting_evidence: [],
      },
    ],
    gaps: [
      {
        id: 'G01',
        what_is_unknown: 'Official inspection report upon package arrival',
        why_it_matters: 'Required to prove transit damage occurred before customer opening',
        what_evidence_could_resolve_it: 'Courier damage slip',
        where_how_to_obtain: 'Request from carrier',
        what_not_to_over_collect: 'Do not collect unrelated packages',
        status: 'open',
        evidence_ids: [],
        related_event_ids: ['EV01'],
        target_claim_ids: ['C01'],
        actions: [
          {
            id: 'A01',
            title: 'Request courier handover log',
            description: 'Obtain delivery photo and signed courier checklist',
            priority: 'high',
            status: 'pending',
            target_gap_id: 'G01',
            target_gap_ids: ['G01'],
            related_event_ids: ['EV01'],
            finding_ids: ['C01'],
            evidence_ids: [],
          },
        ],
      },
    ],
  };

  it('generates a complete Vietnamese forensic dossier with SHA-256 fixity tables', () => {
    const markdown = buildForensicProvenanceMarkdown(mockCase, 'vi');
    expect(markdown).toContain('BIÊN BẢN GIÁM ĐỊNH HỒ SƠ & CHUỖI CHỨNG CỨ');
    expect(markdown).toContain('ET-2026-001');
    expect(markdown).toContain('e3b0c44298fc1c14');
    expect(markdown).toContain('BẢNG KÊ DANH MỤC CHỨNG CỨ');
    expect(markdown).toContain('DÒNG SỰ KIỆN ĐỐI CHIẾU CHÉO');
    expect(markdown).toContain('MA TRẬN LUẬN ĐIỂM & ĐỘ VỮNG CHẮC');
    expect(markdown).toContain('**Bảo chứng ủng hộ (+):** [E01]');
  });

  it('generates an English forensic dossier', () => {
    const markdown = buildForensicProvenanceMarkdown(mockCase, 'en');
    expect(markdown).toContain('FORENSIC PROVENANCE & EVIDENCE DOSSIER');
    expect(markdown).toContain('EVIDENCE INVENTORY & FIXITY HASHES');
    expect(markdown).toContain('CROSS-EXAMINED TIMELINE');
    expect(markdown).toContain('CLAIMS & EVIDENTIARY STRENGTH');
  });
});
