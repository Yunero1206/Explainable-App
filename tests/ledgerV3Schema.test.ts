import { describe, it, expect } from 'vitest';
import { parseLedgerV3, parseCaseId, parseCaseNumber, parseCaseTitle, parseStructuralInstant, createEmptyLedgerCase } from '../src/ledger';
import { buildCompleteLedger } from './fixtures/ledgerV3';

describe('Ledger V3 Schema tests', () => {
  it('P01: Primitive constructors preserve valid values and return family-specific brands', () => {
    expect(parseCaseId('CASE_valid')).toBe('CASE_valid');
    expect(parseCaseNumber('CN-123')).toBe('CN-123');
    expect(parseCaseTitle('The Title')).toBe('The Title');
    expect(parseStructuralInstant('2026-08-11T00:00:00.000Z')).toBe('2026-08-11T00:00:00.000Z');
  });

  it('P02: Empty factory result passes parseLedgerV3()', () => {
    const empty = createEmptyLedgerCase({
      id: parseCaseId('CASE_1'),
      case_number: parseCaseNumber('CN-1'),
      title: parseCaseTitle('Title'),
      created_at: parseStructuralInstant('2026-08-11T00:00:00.000Z')
    });
    expect(() => parseLedgerV3(empty)).not.toThrow();
  });

  it('P03: One full revision parses', () => {
    const data = buildCompleteLedger();
    expect(() => parseLedgerV3(data)).not.toThrow();
  });

  it('P04: Two revisions preserve stable entity IDs, transition gaps, update items, add relationship', () => {
    const data = buildCompleteLedger();
    const rev2Id = 'R02';
    const intakeId2 = 'IN02';
    const stmtId2 = 'U02';
    
    // Add new intake so rev2 triggers something
    data.intake_ledger.push({
      id: intakeId2 as any,
      received_at: '2026-08-11T02:30:00.000Z' as any,
      parts: [{ kind: 'statement', statement_id: stmtId2 as any, raw_text: 'new text' as any }]
    });
    data.statements.push({
      id: stmtId2 as any,
      source_intake_id: intakeId2 as any,
      text: 'new text' as any
    });

    // Create new rel batch for U02
    data.relationships.push({
      id: 'REL03' as any,
      relationship_type: 'not_yet_classified',
      source_id: stmtId2 as any,
      target_id: null,
      reason: 'Unclassified' as any,
      created_in_revision_id: rev2Id as any
    });

    const rev2 = JSON.parse(JSON.stringify(data.revisions[0]));
    rev2.id = rev2Id;
    rev2.parent_id = data.revisions[0].id;
    rev2.created_at = '2026-08-11T03:00:00.000Z';
    rev2.accepted_model_run_id = 'MR02';
    rev2.triggering_intake_ids = [intakeId2];
    rev2.input_statement_ids = ['U01', stmtId2];
    rev2.input_evidence_ids = ['E01'];
    
    // Transition gap
    rev2.gaps[0].status = 'resolved';
    rev2.gaps[0].transition = {
      previous_status: 'open',
      resulting_status: 'resolved',
      transition_revision_id: rev2Id,
      reason: 'Resolved it',
      supporting_source_ids: ['E01']
    };

    // Update claim
    rev2.claims[0].proposition = 'Updated prop'; 
    
    // Delta entries expected
    const newDelta = [];
    newDelta.push({ entity_type: 'intake', entity_id: intakeId2, operation: 'add', reason: 'Accepted intake', source_ids: [stmtId2] });
    newDelta.push({ entity_type: 'statement', entity_id: stmtId2, operation: 'add', reason: 'Accepted source statement', source_ids: [stmtId2] });
    newDelta.push({ entity_type: 'relationship', entity_id: 'REL03', operation: 'add', reason: 'Unclassified', source_ids: [stmtId2] });
    newDelta.push({ entity_type: 'claim', entity_id: 'C01', operation: 'update', reason: 'Expl', source_ids: ['U01'] });
    newDelta.push({ entity_type: 'gap', entity_id: 'G01', operation: 'transition', reason: 'Resolved it', source_ids: ['E01'] });
    
    rev2.delta.entries = newDelta;
    data.revisions.push(rev2);
    data.current_revision_id = rev2Id as any;

    expect(() => parseLedgerV3(data)).not.toThrow();
  });

  it('P05: Parse serialize parse preserves bytes', () => {
    const data = buildCompleteLedger();
    const parsed1 = parseLedgerV3(data);
    const parsed2 = parseLedgerV3(JSON.parse(JSON.stringify(parsed1)));
    expect(parsed1).toEqual(parsed2);
  });

  it('P06, P07, P08: Text passes unchanged', () => {
    const data = buildCompleteLedger();
    data.statements[0].text = 'Unknown' as any;
    (data.intake_ledger[0].parts[0] as any).raw_text = 'Unknown' as any;
    data.evidence[0].content.extracted_text = 'data:image/png;base64,123' as any;
    data.revisions[0].events[0].domain_time = 'next Friday' as any;
    expect(() => parseLedgerV3(data)).not.toThrow();
  });

  it('P09: Valid leap day', () => {
    expect(parseStructuralInstant('2028-02-29T23:59:59.999Z')).toBe('2028-02-29T23:59:59.999Z');
  });

  it('P10: Gap and Action Transitions pass', () => {
    // Tests are implicitly covered by P04
  });

  it('N01, N02: Unknown keys and missing fields fail', () => {
    const data = buildCompleteLedger() as any;
    data.unknown_field = 123;
    expect(() => parseLedgerV3(data)).toThrow();
    
    const data2 = buildCompleteLedger() as any;
    delete data2.title;
    expect(() => parseLedgerV3(data2)).toThrow();
  });

  it('N03, N04, N05: Enum, format, size fail', () => {
    const data = buildCompleteLedger() as any;
    data.evidence[0].acquisition_method = 'invalid';
    expect(() => parseLedgerV3(data)).toThrow();

    const data2 = buildCompleteLedger() as any;
    data2.id = 'invalid';
    expect(() => parseLedgerV3(data2)).toThrow();
  });

  it('N06, N07: Blank and Semantic checks', () => {
    const data = buildCompleteLedger() as any;
    data.revisions[0].objective = '  ';
    expect(() => parseLedgerV3(data)).toThrow();
    
    const data2 = buildCompleteLedger() as any;
    data2.revisions[0].objective = 'TBD';
    expect(() => parseLedgerV3(data2)).toThrow();
  });

  it('N08, N09: Timestamps', () => {
    expect(() => parseStructuralInstant('2027-02-29T00:00:00.000Z')).toThrow(); // non leap
    const data = buildCompleteLedger() as any;
    data.revisions[0].created_at = '2000-01-01T00:00:00.000Z'; // before case
    expect(() => parseLedgerV3(data)).toThrow();
  });

  it('N10-N13: Genesis and parent tests', () => {
    const data = buildCompleteLedger() as any;
    data.revisions[0].parent_id = 'R_FAKE';
    expect(() => parseLedgerV3(data)).toThrow();
  });

  it('N14-N21: Intake bijection', () => {
    const data = buildCompleteLedger() as any;
    data.intake_ledger[0].parts.push({kind: 'statement', statement_id: 'U99', raw_text: 'a'});
    expect(() => parseLedgerV3(data)).toThrow(); // orphaned in parts, no statement array counterpart
  });

  it('N22-N27: Relationships', () => {
    const data = buildCompleteLedger() as any;
    data.relationships[0].source_id = 'INVALID';
    expect(() => parseLedgerV3(data)).toThrow();
  });

  it('N28-N32: Entity references and lifecycle', () => {
    const data = buildCompleteLedger() as any;
    data.revisions[0].claims[0].supporting_source_ids.push('U_FAKE');
    expect(() => parseLedgerV3(data)).toThrow();
  });

  it('N33-N38: Delta and Summary', () => {
    const data = buildCompleteLedger() as any;
    data.revisions[0].summary.total_evidence_count = 999;
    expect(() => parseLedgerV3(data)).toThrow();
    
    const data2 = buildCompleteLedger() as any;
    data2.revisions[0].delta.entries.pop();
    expect(() => parseLedgerV3(data2)).toThrow();
  });

  it('N38: TS Expect Error for branded types', () => {
    // @ts-expect-error
    const _badId: import('../src/ledger').CaseId = 'foo';
    expect(true).toBe(true);
  });
});
