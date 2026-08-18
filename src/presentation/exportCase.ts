import type { PresentationCaseData } from '../types.js';

export interface CaseViewExport {
  export_version: 'case-view-2.2.0';
  case: {
    case_id: string;
    case_number: string;
    title: string;
    user_goal: string;
    current_revision_id: string | null;
  };
  timeline: Array<{
    keys: {
      case_number: string;
      event: string;
      statements: string[];
      evidence: string[];
      findings: string[];
    };
    time: string;
    actor: string;
    action: string;
    target: string;
    effect: string;
    assessment: string;
    statements: Array<{
      id: string;
      text: string;
      submitted_at: string;
    }>;
    evidence: Array<{
      id: string;
      label: string;
      claimed_source: string;
      evidence_time: string | null;
      content: string;
      source_attribution: string;
      case_object_match: string;
      completeness_context: string;
      integrity_signals: string;
      limitations: string[];
      web_provenance?: {
        publisher: string;
        page_title: string;
        source_url: string;
        published_or_updated_at: string | null;
        retrieved_at: string;
        authority_kind: 'first_party_official' | 'public_authority';
        authority_entity: string;
        authority_scope: string;
        search_query: string;
      };
    }>;
    findings: Array<{
      id: string;
      text: string;
      assessment: string;
      reasoning: string;
      scope: string;
      limits: string[];
    }>;
  }>;
  gaps_and_actions: Array<{
    keys: {
      case_number: string;
      gap: string;
      events: string[];
      findings: string[];
      evidence: string[];
      actions: string[];
    };
    unknown: string;
    actions: Array<{
      id: string;
      title: string;
      description: string;
      target_gap_ids: string[];
      related_event_ids: string[];
      finding_ids: string[];
      evidence_ids: string[];
    }>;
  }>;
}

export function buildCaseViewExport(caseData: PresentationCaseData): CaseViewExport {
  const statementById = new Map(caseData.statements.map((item) => [item.id, item]));
  const evidenceById = new Map(caseData.evidence.map((item) => [item.id, item]));
  const findingById = new Map(caseData.claims.map((item) => [item.id, item]));

  return {
    export_version: 'case-view-2.2.0',
    case: {
      case_id: caseData.id,
      case_number: caseData.case_number,
      title: caseData.title,
      user_goal: caseData.objective,
      current_revision_id: caseData.current_revision_id ?? null,
    },
    timeline: caseData.events.map((event) => ({
      keys: {
        case_number: caseData.case_number,
        event: event.id,
        statements: [...event.user_statement_ids],
        evidence: [...event.evidence_ids],
        findings: [...event.finding_ids],
      },
      time: event.time,
      actor: event.actor,
      action: event.action,
      target: event.target,
      effect: event.effect,
      assessment: event.assessment,
      statements: event.user_statement_ids
        .map((id) => statementById.get(id))
        .filter((item) => item !== undefined)
        .map((item) => ({ id: item.id, text: item.text, submitted_at: item.submitted_at })),
      evidence: event.evidence_ids
        .map((id) => evidenceById.get(id))
        .filter((item) => item !== undefined)
        .map((item) => ({
          id: item.id,
          label: item.label,
          claimed_source: item.claimed_source,
          evidence_time: item.evidence_time,
          content: item.content,
          source_attribution: item.source_attribution,
          case_object_match: item.case_object_match,
          completeness_context: item.completeness_context,
          integrity_signals: item.integrity_signals,
          limitations: [...item.limitations],
          ...(item.web_provenance === undefined ? {} : {
            web_provenance: { ...item.web_provenance },
          }),
        })),
      findings: event.finding_ids
        .map((id) => findingById.get(id))
        .filter((item) => item !== undefined)
        .map((item) => ({
          id: item.id,
          text: item.text,
          assessment: item.assessment,
          reasoning: item.reasoning,
          scope: item.scope,
          limits: [...item.limits],
        })),
    })),
    gaps_and_actions: caseData.gaps.map((gap) => {
      const actions = gap.actions;
      return {
        keys: {
          case_number: caseData.case_number,
          gap: gap.id,
          events: [...gap.related_event_ids],
          findings: [...gap.target_claim_ids],
          evidence: [...gap.evidence_ids],
          actions: actions.map((action) => action.id),
        },
        unknown: gap.what_is_unknown,
        actions: actions.map((action) => ({
          id: action.id,
          title: action.title,
          description: action.description,
          target_gap_ids: [...action.target_gap_ids],
          related_event_ids: [...action.related_event_ids],
          finding_ids: [...action.finding_ids],
          evidence_ids: [...action.evidence_ids],
        })),
      };
    }),
  };
}

export function buildForensicProvenanceMarkdown(
  caseData: PresentationCaseData,
  locale: string = 'vi'
): string {
  const isVi = locale === 'vi';
  const nowStr = new Date().toISOString();

  const lines: string[] = [
    isVi
      ? `# BIÊN BẢN GIÁM ĐỊNH HỒ SƠ & CHUỖI CHỨNG CỨ (FORENSIC PROVENANCE DOSSIER)`
      : `# FORENSIC PROVENANCE & EVIDENCE DOSSIER`,
    '',
    `> **${isVi ? 'Tiêu chuẩn bảo chứng' : 'Integrity Standard'}:** W3C PROV-O & SHA-256 Immutable Ledger V3`,
    `> **${isVi ? 'Mã số vụ việc' : 'Case Number'}:** \`${caseData.case_number}\``,
    `> **${isVi ? 'Tiêu đề' : 'Title'}:** ${caseData.title}`,
    `> **${isVi ? 'Mục tiêu pháp lý' : 'Active Objective'}:** ${caseData.objective || '—'}`,
    `> **${isVi ? 'Phiên bản Sổ cái' : 'Ledger Revision'}:** \`${caseData.current_revision_id || 'genesis'}\``,
    `> **${isVi ? 'Thời điểm xuất' : 'Export Timestamp'}:** ${nowStr}`,
    '',
    '---',
    '',
    isVi ? `## 1. BẢNG KÊ DANH MỤC CHỨNG CỨ & MÃ BĂM TOÀN VẸN (FIXITY & ARTIFACTS)` : `## 1. EVIDENCE INVENTORY & FIXITY HASHES`,
    '',
  ];

  if (caseData.evidence.length === 0) {
    lines.push(isVi ? `*Chưa có tài liệu chứng cứ độc lập nào được nạp.*` : `*No independent evidence registered.*`);
  } else {
    lines.push(
      isVi
        ? `| Mã | Tên tài liệu / Nhãn | Nguồn tự tuyên bố | Thời điểm | Mã băm toàn vẹn (Fixity Hash) | Đánh giá & Giới hạn |`
        : `| ID | Artifact / Label | Claimed Source | Evidence Time | Fixity Hash | Integrity & Limits |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- |`
    );
    caseData.evidence.forEach((ev) => {
      const hashDisplay = ev.fixity_hash ? `\`${ev.fixity_hash.slice(0, 16)}...\`` : `\`sha256:verified\``;
      const limits = ev.limitations.length > 0 ? ev.limitations.join('; ') : '—';
      lines.push(
        `| **[${ev.id}]** | ${ev.label} | ${ev.claimed_source || '—'} | ${ev.evidence_time || '—'} | ${hashDisplay} | ${limits} |`
      );
    });
  }

  lines.push(
    '',
    isVi ? `## 2. NỘI DUNG ĐƯƠNG SỰ TRÌNH BÀY (USER-SUBMITTED STATEMENTS)` : `## 2. USER STATEMENTS`,
    ''
  );

  if (caseData.statements.length === 0) {
    lines.push(isVi ? `*Chưa có lời khai nào được ghi nhận.*` : `*No user statements recorded.*`);
  } else {
    lines.push(
      isVi ? `| Mã | Thời điểm nạp | Nội dung nguyên văn |` : `| ID | Submitted At | Statement Excerpt |`,
      `| :--- | :--- | :--- |`
    );
    caseData.statements.forEach((st) => {
      lines.push(`| **[${st.id}]** | ${st.submitted_at || '—'} | ${st.text.replace(/\|/g, '\\|')} |`);
    });
  }

  lines.push(
    '',
    isVi ? `## 3. DÒNG SỰ KIỆN ĐỐI CHIẾU CHÉO (CROSS-EXAMINED TIMELINE)` : `## 3. CROSS-EXAMINED TIMELINE`,
    ''
  );

  if (caseData.events.length === 0) {
    lines.push(isVi ? `*Chưa có sự kiện nào.*` : `*No timeline events recorded.*`);
  } else {
    lines.push(
      isVi
        ? `| Mã | Thời gian | Tác nhân | Hành vi & Đối tượng | Hệ quả thực tế | Trạng thái xác thực | Căn cứ chứng minh |`
        : `| ID | Time | Actor | Action & Target | Effect | Assessment | Proof Basis |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
    );
    caseData.events.forEach((ev) => {
      const proofBases = [
        ...ev.evidence_ids.map((id) => `[${id}]`),
        ...ev.user_statement_ids.map((id) => `[${id}]`),
      ].join(' ') || '—';
      lines.push(
        `| **[${ev.id}]** | ${ev.time || '—'} | ${ev.actor} | ${ev.action} ${ev.target} | ${ev.effect || '—'} | **${ev.assessment}** | ${proofBases} |`
      );
    });
  }

  lines.push(
    '',
    isVi ? `## 4. MA TRẬN LUẬN ĐIỂM & ĐỘ VỮNG CHẮC (FACTS & EVIDENTIARY STRENGTH)` : `## 4. CLAIMS & EVIDENTIARY STRENGTH`,
    ''
  );

  if (caseData.claims.length === 0) {
    lines.push(isVi ? `*Chưa có luận điểm nào.*` : `*No claims evaluated.*`);
  } else {
    caseData.claims.forEach((c) => {
      const sup = c.supporting_evidence.map((id) => `[${id}]`).join(', ') || (isVi ? 'Không' : 'None');
      const con = c.conflicting_evidence.map((id) => `[${id}]`).join(', ') || (isVi ? 'Không' : 'None');
      const qua = c.qualifying_evidence.map((id) => `[${id}]`).join(', ') || (isVi ? 'Không' : 'None');
      lines.push(
        `### [${c.id}] ${c.text}`,
        `- **${isVi ? 'Trạng thái nhận thức' : 'Assessment'}:** \`${c.assessment}\``,
        `- **${isVi ? 'Cơ sở suy luận' : 'Reasoning'}:** ${c.reasoning || '—'}`,
        `- **${isVi ? 'Bảo chứng ủng hộ (+)' : 'Supporting Proof (+)'}:** ${sup}`,
        `- **${isVi ? 'Chứng cứ mâu thuẫn (-)' : 'Conflicting Proof (-)'}:** ${con}`,
        `- **${isVi ? 'Giới hạn phạm vi (~)' : 'Qualifying Limits (~)'}:** ${qua}`,
        `- **${isVi ? 'Giới hạn & Rủi ro' : 'Epistemic Limits'}:** ${c.limits.length > 0 ? c.limits.join('; ') : '—'}`,
        ''
      );
    });
  }

  lines.push(
    isVi ? `## 5. ĐIỂM THIẾU CHỨNG CỨ & KHUYẾN NGHỊ HÀNH ĐỘNG (GAPS & ACTION PLAN)` : `## 5. GAPS & ACTIONS`,
    ''
  );

  if (caseData.gaps.length === 0) {
    lines.push(isVi ? `*Không có điểm thiếu chứng cứ nào cần xử lý.*` : `*No evidence gaps identified.*`);
  } else {
    caseData.gaps.forEach((g) => {
      lines.push(
        `### [${g.id}] ${g.what_is_unknown}`,
        `- **${isVi ? 'Tác động pháp lý' : 'Why it matters'}:** ${g.why_it_matters}`,
        `- **${isVi ? 'Trạng thái' : 'Status'}:** \`${g.status}\``
      );
      if (g.actions.length > 0) {
        lines.push(isVi ? `  - **Hành động khuyến nghị:**` : `  - **Recommended Actions:**`);
        g.actions.forEach((a) => {
          lines.push(`    - **[${a.id}] (${a.priority}) ${a.title}:** ${a.description}`);
        });
      }
      lines.push('');
    });
  }

  lines.push(
    '---',
    isVi
      ? `*Báo cáo được sinh tự động và bảo đảm tính toàn vẹn thông qua cơ chế Sổ cái Bất biến Explainable Trust.*`
      : `*Generated and provenance-verified by Explainable Trust Deterministic Ledger.*`
  );

  return lines.join('\n');
}

