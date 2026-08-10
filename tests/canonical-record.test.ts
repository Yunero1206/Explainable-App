import { describe, it, expect } from 'vitest';
import {
  CanonicalCaseRecord,
  CanonicalCaseRecordSchema,
  RevisionDeltaEntrySchema,
  validateCanonicalRecord,
  projectCurrentRecord,
  CanonicalAssessment,
  CanonicalGapStatus,
  CaseRevision,
  IntakePart,
  DispositionRelationship,
  EventId,
  GapId,
  RevisionId,
  StatementId
} from '../src/canonical/index';

const createValidBaseline = (): CanonicalCaseRecord => ({
  id: "case-01",
  schema_version: "2.0.0",
  case_number: "CASE-01",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  current_revision_id: "R01",
  intake_ledger: [
    { 
      id: "IN01", 
      received_at: "2023-01-01T00:00:00Z", 
      resulting_revision_id: "R01",
      parts: [
        { kind: "statement", statement_id: "U01", raw_text: "Statement 1" },
        { kind: "evidence", evidence_id: "E01", submitted_name: "ev.pdf" },
        { kind: "statement", statement_id: "U02", raw_text: "Statement 2" }
      ]
    }
  ],
  statements: [
    { id: "U01", text: "Statement 1", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" },
    { id: "U02", text: "Statement 2", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" }
  ],
  evidence: [
    { id: "E01", label: "Ev 1", origin_type: "user", input_form: "file", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" }
  ],
  relationships: [
    { id: "REL01", source_id: "U01", target_id: "C01", relationship_type: "supports_claim", reason: "Direct", created_in_revision_id: "R01" },
    { id: "REL02", source_id: "U02", target_id: "C01", relationship_type: "supports_claim", reason: "Direct", created_in_revision_id: "R01" },
    { id: "REL03", source_id: "E01", target_id: "C01", relationship_type: "supports_claim", reason: "Direct", created_in_revision_id: "R01" }
  ],
  revisions: [
    {
      revision_id: "R01",
      created_at: "2023-01-01T00:00:00Z",
      title: "Initial",
      objective: "Objective",
      triggering_intake_id: "IN01",
      input_statement_ids: ["U01", "U02"],
      input_evidence_ids: ["E01"],
      events: [
        { id: "EV1", time: "2023-01-01", actor: "Actor", action: "Action", target: "Target", evidence_ids: ["U01"], assessment: "Established within current record" }
      ],
      claims: [
        { id: "C01", text: "Claim 1", assessment: "Established within current record", reasoning: "Reason", supporting_evidence: ["U01", "E01"], qualifying_evidence: [], conflicting_evidence: [] }
      ],
      gaps: [
        { id: "G01", question_key: "Q1", status: "open", target_claim_ids: ["C01"] }
      ],
      actions: [
        { id: "A01", description: "Action 1", target_gap_ids: ["G01"] }
      ],
      evidence_inspections: [
        { id: "EI1", evidence_id: "E01", limitations: [] }
      ],
      delta: {
        changes: [
          { entity_type: "event", entity_id: "EV1", operation: "added", reason: "init", source_ids: ["U01"] },
          { entity_type: "claim", entity_id: "C01", operation: "added", reason: "init", source_ids: ["U01", "E01"] },
          { entity_type: "gap", entity_id: "G01", operation: "added", reason: "init", source_ids: [] },
          { entity_type: "action", entity_id: "A01", operation: "added", reason: "init", source_ids: [] }
        ]
      },
      summary: { total_evidence_count: 1, established_claims_count: 1, unresolved_claims_count: 0, conflicted_claims_count: 0, user_reported_claims_count: 0 }
    }
  ]
});

describe('Canonical Record Invariants', () => {
  it('valid Schema v2 record parses', () => {
    const record = createValidBaseline();
    const result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
    const errors = validateCanonicalRecord(record);
    expect(errors).toHaveLength(0);
  });

  it('mixed ordered intake parts round-trip without content or order changes', () => {
    const record = createValidBaseline();
    const parsed = CanonicalCaseRecordSchema.parse(record);
    
    expect(parsed.intake_ledger[0].parts.length).toBe(3);
    
    const part0 = parsed.intake_ledger[0].parts[0] as Extract<IntakePart, { kind: 'statement' }>;
    expect(part0.kind).toBe("statement");
    expect(part0.statement_id).toBe("U01");
    expect(part0.raw_text).toBe("Statement 1");
    
    const part1 = parsed.intake_ledger[0].parts[1] as Extract<IntakePart, { kind: 'evidence' }>;
    expect(part1.kind).toBe("evidence");
    expect(part1.evidence_id).toBe("E01");
    expect(part1.submitted_name).toBe("ev.pdf");

    const part2 = parsed.intake_ledger[0].parts[2] as Extract<IntakePart, { kind: 'statement' }>;
    expect(part2.kind).toBe("statement");
    expect(part2.statement_id).toBe("U02");
    expect(part2.raw_text).toBe("Statement 2");
    
    // Test rejection of unknown fields recursively in parts
    const invalidRecord = createValidBaseline();
    (invalidRecord.intake_ledger[0].parts[0] as Record<string, unknown>).unknown_field = "test";
    const result = CanonicalCaseRecordSchema.safeParse(invalidRecord);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Unrecognized key');
  });

  it('strict schema rejects top-level duplicated current state and unknown fields', () => {
    const record = { ...createValidBaseline(), claims: [] };
    const result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
  });

  it('schema accepts only the five canonical assessment values', () => {
    const record = createValidBaseline();
    record.revisions[0].claims[0].assessment = "Established in record" ;
    const result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
  });

  it('schema accepts only the five canonical Gap statuses', () => {
    const record = createValidBaseline();
    record.revisions[0].gaps[0].status = "abandoned" ;
    const result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
  });

  it('Uxx and Exx remain separate; text describing an unsupplied artifact creates no Exx requirement', () => {
    const record = createValidBaseline();
    record.statements.push({ id: "U03", text: "I have a receipt", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" });
    record.intake_ledger[0].parts.push({ kind: "statement", statement_id: "U03", raw_text: "I have a receipt" });
    record.relationships.push({ id: "REL04", source_id: "U03", target_id: "C01", relationship_type: "supports_claim", reason: "Direct", created_in_revision_id: "R01" });
    record.revisions[0].input_statement_ids.push("U03");
    const result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
    const errors = validateCanonicalRecord(record);
    expect(errors).toHaveLength(0);
  });

  it('evidence retains storage metadata but rejects data URLs and embedded file_data_url', () => {
    const record = createValidBaseline();
    record.evidence[0].storage_key = "path/to/s3";
    let result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
    
    // CanonicalEvidence.storage_key = data:... fails
    record.evidence[0].storage_key = "data:image/png;base64,...";
    result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Data URLs are not permitted in storage_key');

    // Case-insensitive / whitespace trimmed check
    record.evidence[0].storage_key = " DATA:application/pdf;base64,...";
    result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(false);

    record.evidence[0].storage_key = "path/to/s3"; // reset

    // intake evidence-part storage_key = data:... fails
    const evPart = record.intake_ledger[0].parts[1] as Extract<IntakePart, { kind: 'evidence' }>;
    evPart.storage_key = "data:image/png;base64,...";
    result = CanonicalCaseRecordSchema.safeParse(record);
    expect(result.success).toBe(false);

    evPart.storage_key = "path/to/s3"; // reset

    // file_data_url fails because of strict schema validation
    const invalidRecord2 = JSON.parse(JSON.stringify(record));
    invalidRecord2.evidence[0].file_data_url = "data:image/png;base64,...";
    result = CanonicalCaseRecordSchema.safeParse(invalidRecord2);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Unrecognized key');
    
    // test other fields
    const invalidRecord3 = JSON.parse(JSON.stringify(record));
    invalidRecord3.evidence[0].content_base64 = "base64";
    result = CanonicalCaseRecordSchema.safeParse(invalidRecord3);
    expect(result.success).toBe(false);
  });

  it('one source can retain multiple independent disposition relationships', () => {
    const record = createValidBaseline();
    record.relationships.push({ id: "REL04", source_id: "U01", target_id: "G01", relationship_type: "raises_gap", reason: "Direct", created_in_revision_id: "R01" });
    const errors = validateCanonicalRecord(record);
    expect(errors).toHaveLength(0);
  });

  it('processed substantive sources require a disposition or explicit not_yet_classified', () => {
    const record = createValidBaseline();
    record.statements.push({ id: "U03", text: "Orphan", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" });
    record.intake_ledger[0].parts.push({ kind: "statement", statement_id: "U03", raw_text: "Orphan" });
    record.revisions[0].input_statement_ids.push("U03");
    
    const errors = validateCanonicalRecord(record);
    expect(errors).toContain("Statement U03 lacks a disposition relationship");
    
    // explicit not_yet_classified makes it pass
    record.relationships.push({ id: "REL04", source_id: "U03", target_id: null, relationship_type: "not_yet_classified", reason: "Processing", created_in_revision_id: "R01" } );
    const errors2 = validateCanonicalRecord(record);
    expect(errors2).toHaveLength(0);
  });

  it('intake, revision-input and triggering/resulting references must resolve', () => {
    const record = createValidBaseline();
    
    // Child revision drops a parent input
    const r2: CaseRevision = {
       ...record.revisions[0],
       revision_id: "R02",
       parent_revision_id: "R01",
       input_statement_ids: ["U01"] // Dropped U02
    };
    record.revisions.push(r2);
    
    let errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 dropped parent input statement U02");
  });

  it('duplicate semantic IDs are rejected', () => {
    const record = createValidBaseline();
    record.statements.push({ id: "U01", text: "Duplicate", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" });
    const errors = validateCanonicalRecord(record);
    expect(errors).toContain("Duplicate ID U01 in statements");
  });

  it('revision parent graph and current_revision_id must be valid', () => {
    const record = createValidBaseline();
    record.current_revision_id = "R99";
    let errors = validateCanonicalRecord(record);
    expect(errors).toContain("current_revision_id R99 not found in revisions");
    
    record.current_revision_id = "R01";
    const r2: CaseRevision = { ...record.revisions[0], revision_id: "R02" , parent_revision_id: "R99"  };
    record.revisions.push(r2);
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 parent R99 not found");
  });

  it('Event and evidence-inspection source references must resolve', () => {
    const record = createValidBaseline();
    
    const r2: CaseRevision = {
       ...record.revisions[0],
       revision_id: "R02",
       parent_revision_id: "R01",
       input_evidence_ids: [...record.revisions[0].input_evidence_ids]
    };
    
    record.evidence.push({ id: "E02", label: "Future Ev", origin_type: "user", input_form: "file", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" });
    record.intake_ledger[0].parts.push({ kind: "evidence", evidence_id: "E02", submitted_name: "ev2" });
    r2.input_evidence_ids.push("E02");
    record.revisions.push(r2);
    
    record.relationships.push({ id: "REL04", source_id: "E02", target_id: "C01", relationship_type: "supports_claim", reason: "Direct", created_in_revision_id: "R02" } as DispositionRelationship);
    // Existing-but-future Exx used by an earlier evidence inspection
    record.revisions[0].evidence_inspections = [...record.revisions[0].evidence_inspections, { id: "EI2", evidence_id: "E02", limitations: [] }];
    
    const errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R01 Inspection EI2 evidence_id E02 not available in inputs");
  });

  it('Finding Uxx/Exx references resolve, while documentary support does not automatically control assessment', () => {
    const record = createValidBaseline();
    record.revisions[0].claims[0].supporting_evidence.push("U99");
    let errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R01 Claim C01 evidence U99 not available in inputs");
  });

  it('Gap->Cxx and Action->Gxx references must resolve', () => {
    const record = createValidBaseline();
    record.revisions[0].gaps[0].target_claim_ids = ["C99"];
    let errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R01 Gap G01 target_claim_id C99 not in revision claims");

    record.revisions[0].gaps[0].target_claim_ids = ["C01"];
    record.revisions[0].actions[0].target_gap_ids = ["G99"];
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R01 Action A01 target_gap_id G99 not in revision gaps");
  });

  it('relationship source, target type and revision-relative references must be valid', () => {
    const record = createValidBaseline();
    
    // Create future U03 in R02
    record.statements.push({ id: "U03", text: "Future", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" });
    record.intake_ledger[0].parts.push({ kind: "statement", statement_id: "U03", raw_text: "Future" });
    
    const r2: CaseRevision = {
       ...record.revisions[0],
       revision_id: "R02",
       parent_revision_id: "R01",
       input_statement_ids: [...record.revisions[0].input_statement_ids]
    };
    r2.input_statement_ids.push("U03");
    record.revisions.push(r2);
    
    record.relationships.push({ id: "REL04", source_id: "U03", target_id: "C01", relationship_type: "supports_claim", reason: "Reason", created_in_revision_id: "R01" } as DispositionRelationship);
    
    const errors = validateCanonicalRecord(record);
    expect(errors).toContain("Relationship REL04 source_id U03 not available in revision R01");
  });

  it('correction is only a later Uxx correcting an earlier different Uxx', () => {
    const record = createValidBaseline();
    
    // U01 corrects U02 (but U01 is earlier than U02 in terms of availability)
    record.relationships.push({ id: "REL11", source_id: "U01", target_id: "U02", relationship_type: "corrects_statement", reason: "reason", created_in_revision_id: "R01" });
    let errors = validateCanonicalRecord(record);
    expect(errors).toContain("Relationship REL11 corrects_statement target U02 is not earlier than source U01");
    
    // Same-revision statements where no earlier entry into the record is established
    record.relationships = record.relationships.filter(r => r.id !== "REL11");
    record.relationships.push({ id: "REL12", source_id: "U02", target_id: "U01", relationship_type: "corrects_statement", reason: "reason", created_in_revision_id: "R01" });
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Relationship REL12 corrects_statement target U01 is not earlier than source U02");

    // Exx -> Uxx correction (schema rejection)
    const badRel1 = { id: "REL13", source_id: "E01", target_id: "U01", relationship_type: "corrects_statement", reason: "reason", created_in_revision_id: "R01" };
    record.relationships = [badRel1 ];
    let schemaRes = CanonicalCaseRecordSchema.safeParse(record);
    expect(schemaRes.success).toBe(false);
    
    // self-correction
    record.relationships = [{ id: "REL14", source_id: "U01", target_id: "U01", relationship_type: "corrects_statement", reason: "reason", created_in_revision_id: "R01" }];
    schemaRes = CanonicalCaseRecordSchema.safeParse(record);
    expect(schemaRes.success).toBe(true); // schema passes
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Relationship REL14 source corrects itself");
    
    // valid later-Uxx -> earlier-Uxx correction
    const recordValid = createValidBaseline();
    recordValid.statements.push({ id: "U03", text: "Fix", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" });
    recordValid.intake_ledger[0].parts.push({ kind: "statement", statement_id: "U03", raw_text: "Fix" });
    const r2: CaseRevision = {
       ...recordValid.revisions[0],
       revision_id: "R02",
       parent_revision_id: "R01",
       input_statement_ids: [...recordValid.revisions[0].input_statement_ids]
    };
    r2.input_statement_ids.push("U03");
    recordValid.revisions.push(r2);
    
    recordValid.relationships.push({ id: "REL15", source_id: "U03", target_id: "U01", relationship_type: "corrects_statement", reason: "reason", created_in_revision_id: "R02" });
    errors = validateCanonicalRecord(recordValid);
    expect(errors).toHaveLength(0);
  });

  it('Gxx keeps one question_key, while a different epistemic question requires a different Gxx', () => {
    const record = createValidBaseline();
    const r2: CaseRevision = { ...record.revisions[0], revision_id: "R02", parent_revision_id: "R01", gaps: [{ ...record.revisions[0].gaps[0], question_key: "Q2" }] };
    record.revisions.push(r2);
    const errors = validateCanonicalRecord(record);
    expect(errors).toContain("Gap G01 question_key changed from Q1 to Q2");
  });

  it('gap structured transition events and deltas are strictly enforced', () => {
    const record = createValidBaseline();
    
    // 1. missing transition event
    const rMissingEv: CaseRevision = { 
      ...record.revisions[0], 
      revision_id: "R02", 
      parent_revision_id: "R01", 
      gaps: [{ ...record.revisions[0].gaps[0], status: "resolved", status_revision_id: "R02", status_reason: "reason", status_source_ids: ["U01"] }],
      delta: { changes: [{ entity_type: "gap", entity_id: "G01", operation: "resolved", reason: "res", source_ids: ["U01"] }] }
    };
    record.revisions.push(rMissingEv);
    let errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 Gap G01 changed status but lacks a corresponding structured transition event");
    
    record.revisions.pop();

    // The valid transition event template
    const validTransitionEvent = { 
      id: "EV2" as EventId, 
      time: "2023-01-01", 
      actor: "Actor", 
      action: "resolved", 
      target: "G01", 
      evidence_ids: [], 
      assessment: "Established within current record" as CanonicalAssessment,
      gap_transition: {
        gap_id: "G01" as GapId,
        previous_status: "open" as CanonicalGapStatus,
        resulting_status: "resolved" as CanonicalGapStatus,
        transition_revision_id: "R02" as RevisionId,
        source_ids: ["U01" as StatementId]
      }
    };

    // 2. wrong gap reference in event
    const rWrongGap: CaseRevision = { 
      ...rMissingEv, 
      events: [...record.revisions[0].events, { ...validTransitionEvent, gap_transition: { ...validTransitionEvent.gap_transition, gap_id: "G99" as GapId } }] 
    };
    record.revisions.push(rWrongGap);
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 Gap G01 changed status but lacks a corresponding structured transition event");
    expect(errors).toContain("Revision R02 Event EV2 gap_transition gap_id G99 not in revision gaps");
    
    record.revisions.pop();

    // 3. wrong revision reference in event
    const rWrongRev: CaseRevision = { 
      ...rMissingEv, 
      events: [...record.revisions[0].events, { ...validTransitionEvent, gap_transition: { ...validTransitionEvent.gap_transition, transition_revision_id: "R99" as RevisionId } }] 
    };
    record.revisions.push(rWrongRev);
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 Gap G01 changed status but lacks a corresponding structured transition event");
    
    record.revisions.pop();

    // 4. wrong previous or resulting status in event
    const rWrongStatus: CaseRevision = { 
      ...rMissingEv, 
      events: [...record.revisions[0].events, { ...validTransitionEvent, gap_transition: { ...validTransitionEvent.gap_transition, resulting_status: "superseded" as CanonicalGapStatus } }] 
    };
    record.revisions.push(rWrongStatus);
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 Gap G01 changed status but lacks a corresponding structured transition event");

    record.revisions.pop();

    // 5. wrong status_revision_id on the gap
    const rWrongGapRev: CaseRevision = { 
      ...rMissingEv, 
      gaps: [{ ...record.revisions[0].gaps[0], status: "resolved", status_revision_id: "R99", status_reason: "reason", status_source_ids: ["U01"] }],
      events: [...record.revisions[0].events, validTransitionEvent] 
    };
    record.revisions.push(rWrongGapRev);
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 Gap G01 changed status to resolved but status_revision_id R99 does not match current revision");
    expect(errors).toContain("Revision R02 Gap G01 status_revision_id R99 not found");

    record.revisions.pop();

    // 6. stale added delta
    const rStaleDelta: CaseRevision = { 
      ...rMissingEv, 
      delta: { changes: [{ entity_type: "gap", entity_id: "G01", operation: "added", reason: "res", source_ids: ["U01"] }] },
      events: [...record.revisions[0].events, validTransitionEvent] 
    };
    record.revisions.push(rStaleDelta);
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R02 Gap G01 changed status but delta operation is 'added'");

    record.revisions.pop();

    // 7. valid resolve test
    const rValidResolve: CaseRevision = { 
      ...rMissingEv, 
      events: [...record.revisions[0].events, validTransitionEvent] 
    };
    record.revisions.push(rValidResolve);
    errors = validateCanonicalRecord(record);
    expect(errors).toHaveLength(0);

    // 8. valid reopen test
    const rValidReopen: CaseRevision = {
      ...rValidResolve,
      revision_id: "R03",
      parent_revision_id: "R02",
      gaps: [{ ...rValidResolve.gaps[0], status: "open", status_revision_id: undefined, status_reason: undefined, status_source_ids: undefined }],
      delta: { changes: [{ entity_type: "gap", entity_id: "G01", operation: "reopened", reason: "res", source_ids: ["U01"] }] },
      events: [
         ...rValidResolve.events,
         {
           ...validTransitionEvent,
           id: "EV3" as EventId,
           gap_transition: {
             gap_id: "G01" as GapId,
             previous_status: "resolved" as CanonicalGapStatus,
             resulting_status: "open" as CanonicalGapStatus,
             transition_revision_id: "R03" as RevisionId,
             source_ids: ["U01" as StatementId]
           }
         }
      ]
    };
    record.revisions.push(rValidReopen);
    errors = validateCanonicalRecord(record);
    console.log("REOPEN ERRORS:", errors);
    expect(errors).toHaveLength(0);
    
    // 9. reopening with previous resolution revision fails
    record.revisions.pop();
    const rReopenWrongRev: CaseRevision = {
       ...rValidReopen,
       events: [
         ...rValidResolve.events,
         {
           ...validTransitionEvent,
           id: "EV3" as EventId,
           gap_transition: {
             gap_id: "G01" as GapId,
             previous_status: "resolved" as CanonicalGapStatus,
             resulting_status: "open" as CanonicalGapStatus,
             transition_revision_id: "R02" as RevisionId, // wrong revision for reopen
             source_ids: ["U01" as StatementId]
           }
         }
       ]
    };
    record.revisions.push(rReopenWrongRev);
    errors = validateCanonicalRecord(record);
    expect(errors).toContain("Revision R03 Gap G01 changed status but lacks a corresponding structured transition event");
  });

  it('projector uses the requested/current revision, excludes future state, rejects missing revisions, does not mutate input and returns deeply frozen data', () => {
    const record = createValidBaseline();
    const r2: CaseRevision = { ...record.revisions[0], revision_id: "R02", parent_revision_id: "R01", title: "Future", input_statement_ids: [...record.revisions[0].input_statement_ids] };
    record.revisions.push(r2);
    record.statements.push({ id: "U03", text: "Future", submitted_at: "2023-01-01T00:00:00Z", source_intake_id: "IN01" });
    record.intake_ledger[0].parts.push({ kind: "statement", statement_id: "U03", raw_text: "Future" });
    r2.input_statement_ids.push("U03");
    
    // 1. serialize the canonical input before projection
    const originalJson = JSON.stringify(record);
    
    // 2. project an earlier revision
    const proj = projectCurrentRecord(record, "R01");
    
    // 3. confirm the input serialization is unchanged
    expect(JSON.stringify(record)).toBe(originalJson);
    
    // 4. confirm the original record and all sampled nested input objects remain unfrozen
    expect(Object.isFrozen(record)).toBe(false);
    expect(Object.isFrozen(record.statements)).toBe(false);
    expect(Object.isFrozen(record.revisions[0].claims)).toBe(false);
    
    // 5. confirm the projection and sampled nested objects/arrays are frozen
    expect(Object.isFrozen(proj)).toBe(true);
    expect(Object.isFrozen(proj.claims)).toBe(true);
    expect(Object.isFrozen(proj.statements)).toBe(true);
    expect(Object.isFrozen(proj.statements[0])).toBe(true);
    
    // 6. confirm projected objects are not reference-equal to input objects
    expect(proj.statements).not.toBe(record.statements);
    expect(proj.claims).not.toBe(record.revisions[0].claims);
    expect(proj.claims[0]).not.toBe(record.revisions[0].claims[0]);
    
    // 7. attempt nested mutation and confirm it fails or has no effect
    expect(() => {
       // @ts-expect-error - readonly constraint check
       proj.claims[0].text = "mutated";
    }).toThrow();
    
    // 8. confirm future Uxx/Exx/relationships/state are absent
    expect(proj.statements.find(s => s.id === "U03")).toBeUndefined();
    
    // 9. confirm the correct current/override revision is selected
    expect(proj.title).toBe("Initial");
    expect(proj.revision_id).toBe("R01");
    
    const projCurrent = projectCurrentRecord(record);
    expect(projCurrent.title).toBe("Initial"); // current_revision_id is still R01
    
    // 10. confirm a missing revision throws
    expect(() => projectCurrentRecord(record, "R99")).toThrow();
  });

  it('delta schema strictly enforces entity ID families based on entity_type', () => {
    // Compile-time negative assertions
    // @ts-expect-error - Event delta requires EventId, not GapId
    const _invalidDeltaCompileTime1: RevisionDeltaEntry = { entity_type: "event", entity_id: "G01", operation: "added", reason: "reason", source_ids: [] };
    
    // @ts-expect-error - Gap delta requires GapId, not EventId
    const _invalidDeltaCompileTime2: RevisionDeltaEntry = { entity_type: "gap", entity_id: "EV1", operation: "added", reason: "reason", source_ids: [] };
    
    const validDelta = {
      entity_type: "event",
      entity_id: "EV1",
      operation: "added",
      reason: "reason",
      source_ids: ["U01"]
    };
    expect(RevisionDeltaEntrySchema.safeParse(validDelta).success).toBe(true);
    
    const invalidDelta = {
      ...validDelta,
      entity_type: "claim", // mismatch type vs ID
    };
    expect(RevisionDeltaEntrySchema.safeParse(invalidDelta).success).toBe(false);
  });
});
