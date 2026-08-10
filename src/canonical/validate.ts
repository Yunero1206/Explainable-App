import { CanonicalCaseRecord, CaseRevision, DispositionRelationship, IntakePart, IntakeRecord, CanonicalStatement, CanonicalEvidence } from './types.js';

export function validateCanonicalRecord(record: CanonicalCaseRecord): string[] {
  const errors: string[] = [];

  const checkUnique = (items: { id: string }[], collectionName: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) {
        errors.push(`Duplicate ID ${item.id} in ${collectionName}`);
      }
      seen.add(item.id);
    }
  };

  checkUnique(record.intake_ledger, 'intake_ledger');
  checkUnique(record.statements, 'statements');
  checkUnique(record.evidence, 'evidence');
  checkUnique(record.relationships, 'relationships');

  const seenRevs = new Set<string>();
  for (const r of record.revisions) {
    if (seenRevs.has(r.revision_id)) {
      errors.push(`Duplicate ID ${r.revision_id} in revisions`);
    }
    seenRevs.add(r.revision_id);
  }

  const currentRev = record.revisions.find(r => r.revision_id === record.current_revision_id);
  if (!currentRev) {
    errors.push(`current_revision_id ${record.current_revision_id} not found in revisions`);
  }

  const revisionOrder = new Map<string, number>();
  record.revisions.forEach((r, index) => {
    revisionOrder.set(r.revision_id, index);
  });

  for (let i = 0; i < record.revisions.length; i++) {
    const rev = record.revisions[i];
    if (rev.parent_revision_id) {
      const parentIndex = revisionOrder.get(rev.parent_revision_id);
      if (parentIndex === undefined) {
        errors.push(`Revision ${rev.revision_id} parent ${rev.parent_revision_id} not found`);
      } else if (parentIndex >= i) {
        errors.push(`Revision ${rev.revision_id} parent ${rev.parent_revision_id} is not earlier in the ledger`);
      }
    } else if (i !== 0) {
      errors.push(`Revision ${rev.revision_id} has no parent but is not the root`);
    }
  }

  for (const intake of record.intake_ledger) {
    if (!revisionOrder.has(intake.resulting_revision_id)) {
      errors.push(`Intake ${intake.id} resulting_revision_id ${intake.resulting_revision_id} not found`);
    }
  }

  const intakeIds = new Set(record.intake_ledger.map(i => i.id));
  const intakeMap = new Map<string, IntakeRecord>(record.intake_ledger.map(i => [i.id, i]));
  for (const rev of record.revisions) {
    if (rev.triggering_intake_id && !intakeIds.has(rev.triggering_intake_id)) {
      errors.push(`Revision ${rev.revision_id} triggering_intake_id ${rev.triggering_intake_id} not found`);
    }
  }

  const uxxMap = new Map<string, CanonicalStatement>(record.statements.map(s => [s.id, s]));
  const exxMap = new Map<string, CanonicalEvidence>(record.evidence.map(e => [e.id, e]));

  for (const s of record.statements) {
    if (!intakeIds.has(s.source_intake_id)) {
      errors.push(`Statement ${s.id} source_intake_id ${s.source_intake_id} not found`);
    } else {
      const intake = intakeMap.get(s.source_intake_id)!;
      const partCount = intake.parts.filter(p => p.kind === 'statement' && p.statement_id === s.id).length;
      if (partCount !== 1) {
        errors.push(`Statement ${s.id} must appear exactly once in intake ${s.source_intake_id} parts`);
      } else {
        const part = intake.parts.find(p => p.kind === 'statement' && p.statement_id === s.id);
        if (part && part.kind === 'statement' && part.raw_text !== s.text) {
          errors.push(`Statement ${s.id} raw_text must equal its canonical text`);
        }
      }
    }
  }

  for (const e of record.evidence) {
    if (!intakeIds.has(e.source_intake_id)) {
      errors.push(`Evidence ${e.id} source_intake_id ${e.source_intake_id} not found`);
    } else {
      const intake = intakeMap.get(e.source_intake_id)!;
      const partCount = intake.parts.filter(p => p.kind === 'evidence' && p.evidence_id === e.id).length;
      if (partCount !== 1) {
        errors.push(`Evidence ${e.id} must appear exactly once in intake ${e.source_intake_id} parts`);
      }
    }
  }

  for (const intake of record.intake_ledger) {
    for (const part of intake.parts) {
      if (part.kind === 'statement') {
        if (!uxxMap.has(part.statement_id)) {
          errors.push(`Intake ${intake.id} part statement_id ${part.statement_id} not found`);
        } else {
           if (uxxMap.get(part.statement_id)!.source_intake_id !== intake.id) {
             errors.push(`Intake ${intake.id} part statement_id ${part.statement_id} source_intake_id mismatch`);
           }
        }
      } else if (part.kind === 'evidence') {
        if (!exxMap.has(part.evidence_id)) {
          errors.push(`Intake ${intake.id} part evidence_id ${part.evidence_id} not found`);
        } else {
           if (exxMap.get(part.evidence_id)!.source_intake_id !== intake.id) {
             errors.push(`Intake ${intake.id} part evidence_id ${part.evidence_id} source_intake_id mismatch`);
           }
        }
      }
    }
  }

  for (let i = 0; i < record.revisions.length; i++) {
    const rev = record.revisions[i];
    for (const sid of rev.input_statement_ids) {
      if (!uxxMap.has(sid)) errors.push(`Revision ${rev.revision_id} input_statement_id ${sid} not found in canonical ledger`);
    }
    for (const eid of rev.input_evidence_ids) {
      if (!exxMap.has(eid)) errors.push(`Revision ${rev.revision_id} input_evidence_id ${eid} not found in canonical ledger`);
    }

    if (rev.parent_revision_id) {
      const parent = record.revisions.find(r => r.revision_id === rev.parent_revision_id);
      if (parent) {
         for (const sid of parent.input_statement_ids) {
           if (!rev.input_statement_ids.includes(sid)) {
             errors.push(`Revision ${rev.revision_id} dropped parent input statement ${sid}`);
           }
         }
         for (const eid of parent.input_evidence_ids) {
           if (!rev.input_evidence_ids.includes(eid)) {
             errors.push(`Revision ${rev.revision_id} dropped parent input evidence ${eid}`);
           }
         }
      }
    }
  }

  const relSourceIds = new Set(record.relationships.map(r => r.source_id));
  for (const s of record.statements) {
    if (!relSourceIds.has(s.id)) {
      errors.push(`Statement ${s.id} lacks a disposition relationship`);
    }
  }
  for (const e of record.evidence) {
    if (!relSourceIds.has(e.id)) {
      errors.push(`Evidence ${e.id} lacks a disposition relationship`);
    }
  }

  const getSourceFirstRevIndex = (sourceId: string): number => {
    for (let i = 0; i < record.revisions.length; i++) {
      if (record.revisions[i].input_statement_ids.includes(sourceId) || record.revisions[i].input_evidence_ids.includes(sourceId)) {
        return i;
      }
    }
    return -1;
  };

  for (const rel of record.relationships) {
    if (!uxxMap.has(rel.source_id) && !exxMap.has(rel.source_id)) {
      errors.push(`Relationship ${rel.id} source_id ${rel.source_id} not found in Uxx/Exx`);
    }
    
    const relRevIndex = revisionOrder.get(rel.created_in_revision_id);
    if (relRevIndex === undefined) {
      errors.push(`Relationship ${rel.id} created_in_revision_id ${rel.created_in_revision_id} not found`);
    } else {
      const rev = record.revisions[relRevIndex];
      if (!rev.input_statement_ids.includes(rel.source_id) && !rev.input_evidence_ids.includes(rel.source_id)) {
        errors.push(`Relationship ${rel.id} source_id ${rel.source_id} not available in revision ${rev.revision_id}`);
      }

      if (rel.relationship_type === 'corrects_statement') {
        if (!uxxMap.has(rel.target_id as string)) {
          errors.push(`Relationship ${rel.id} corrects_statement target ${rel.target_id} is not Uxx`);
        }
        if (!rev.input_statement_ids.includes(rel.target_id as string)) {
          errors.push(`Relationship ${rel.id} corrects_statement target ${rel.target_id} not available in revision ${rev.revision_id}`);
        }
        if (rel.source_id === rel.target_id) {
          errors.push(`Relationship ${rel.id} source corrects itself`);
        }
        
        const sourceFirstIdx = getSourceFirstRevIndex(rel.source_id);
        const targetFirstIdx = getSourceFirstRevIndex(rel.target_id as string);
        
        if (sourceFirstIdx !== -1 && targetFirstIdx !== -1 && sourceFirstIdx <= targetFirstIdx) {
          errors.push(`Relationship ${rel.id} corrects_statement target ${rel.target_id} is not earlier than source ${rel.source_id}`);
        }
      } else if (rel.relationship_type !== 'not_yet_classified') {
        const targetCxx = rev.claims.find(c => c.id === rel.target_id);
        const targetGxx = rev.gaps.find(g => g.id === rel.target_id);
        if (!targetCxx && !targetGxx) {
          errors.push(`Relationship ${rel.id} target_id ${rel.target_id} not valid in revision ${rel.created_in_revision_id}`);
        }
      }
    }
  }

  const gxxKeyMap = new Map<string, string>();

  for (let i = 0; i < record.revisions.length; i++) {
    const rev = record.revisions[i];
    const availableUxx = new Set(rev.input_statement_ids);
    const availableExx = new Set(rev.input_evidence_ids);
    
    const revCxxIds = new Set(rev.claims.map(c => c.id));
    const revGxxIds = new Set(rev.gaps.map(g => g.id));

    for (const ev of rev.events) {
      for (const eid of ev.evidence_ids) {
        if (!availableUxx.has(eid) && !availableExx.has(eid)) {
          errors.push(`Revision ${rev.revision_id} Event ${ev.id} evidence_id ${eid} not available in inputs`);
        }
      }
    }

    for (const c of rev.claims) {
      const allEv = [...c.supporting_evidence, ...c.qualifying_evidence, ...c.conflicting_evidence];
      for (const eid of allEv) {
        if (!availableUxx.has(eid) && !availableExx.has(eid)) {
          errors.push(`Revision ${rev.revision_id} Claim ${c.id} evidence ${eid} not available in inputs`);
        }
      }
    }

    for (const ei of rev.evidence_inspections) {
      if (!exxMap.has(ei.evidence_id)) {
        errors.push(`Revision ${rev.revision_id} Inspection ${ei.id} evidence_id ${ei.evidence_id} not found`);
      }
      if (!availableExx.has(ei.evidence_id)) {
        errors.push(`Revision ${rev.revision_id} Inspection ${ei.id} evidence_id ${ei.evidence_id} not available in inputs`);
      }
    }

    for (const g of rev.gaps) {
      if (gxxKeyMap.has(g.id)) {
        if (gxxKeyMap.get(g.id) !== g.question_key) {
          errors.push(`Gap ${g.id} question_key changed from ${gxxKeyMap.get(g.id)} to ${g.question_key}`);
        }
      } else {
        gxxKeyMap.set(g.id, g.question_key);
      }

      for (const cid of g.target_claim_ids) {
        if (!revCxxIds.has(cid)) {
          errors.push(`Revision ${rev.revision_id} Gap ${g.id} target_claim_id ${cid} not in revision claims`);
        }
      }

      if (g.status !== 'open') {
        if (!g.status_reason) errors.push(`Revision ${rev.revision_id} Gap ${g.id} is not open but lacks status_reason`);
        if (!g.status_revision_id) errors.push(`Revision ${rev.revision_id} Gap ${g.id} is not open but lacks status_revision_id`);
        if (!g.status_source_ids || g.status_source_ids.length === 0) errors.push(`Revision ${rev.revision_id} Gap ${g.id} is not open but lacks status_source_ids`);
        
        if (g.status_revision_id) {
           const trIndex = revisionOrder.get(g.status_revision_id);
           if (trIndex === undefined) {
             errors.push(`Revision ${rev.revision_id} Gap ${g.id} status_revision_id ${g.status_revision_id} not found`);
           } else if (trIndex > i) {
             errors.push(`Revision ${rev.revision_id} Gap ${g.id} status_revision_id ${g.status_revision_id} is in the future`);
           }
           
           if (trIndex !== undefined && trIndex <= i) {
              const trRev = record.revisions[trIndex];
              const trUxx = new Set(trRev.input_statement_ids);
              const trExx = new Set(trRev.input_evidence_ids);
              if (g.status_source_ids) {
                 for (const sid of g.status_source_ids) {
                   if (!trUxx.has(sid) && !trExx.has(sid)) {
                      errors.push(`Revision ${rev.revision_id} Gap ${g.id} status_source_id ${sid} not available in transition revision ${trRev.revision_id}`);
                   }
                 }
              }
           }
        }
      }
    }

    for (const a of rev.actions) {
      for (const gid of a.target_gap_ids) {
        if (!revGxxIds.has(gid)) {
          errors.push(`Revision ${rev.revision_id} Action ${a.id} target_gap_id ${gid} not in revision gaps`);
        }
      }
    }
    
    for (const delta of rev.delta.changes) {
       for (const sid of delta.source_ids) {
          if (!availableUxx.has(sid) && !availableExx.has(sid)) {
            errors.push(`Revision ${rev.revision_id} Delta ${delta.entity_type} ${delta.entity_id} source_id ${sid} not available in inputs`);
          }
       }
    }

    if (i > 0) {
      const parentRev = record.revisions.find(r => r.revision_id === rev.parent_revision_id);
      if (parentRev) {
        for (const pg of parentRev.gaps) {
          if (pg.status === 'open') {
            const currentGap = rev.gaps.find(g => g.id === pg.id);
            if (!currentGap) {
              errors.push(`Revision ${rev.revision_id} dropped open Gap ${pg.id} from parent ${parentRev.revision_id}`);
            }
          }
        }
      }
    }
  }

  return errors;
}
