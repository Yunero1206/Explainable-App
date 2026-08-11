import {
  ActionIdSchema,
  ClaimIdSchema,
  EvidenceIdSchema,
  EventIdSchema,
  GapIdSchema,
  InspectionIdSchema,
  IntakeIdSchema,
  ModelRunIdSchema,
  RelationshipIdSchema,
  RevisionIdSchema,
  StatementIdSchema,
} from './schema';
import type {
  ActionId,
  ClaimId,
  EvidenceId,
  EventId,
  GapId,
  InspectionId,
  IntakeId,
  LedgerV3Case,
  ModelRunId,
  RelationshipId,
  RevisionId,
  StatementId,
} from './types';

interface Counter {
  prefix: string;
  value: number;
}

function highestSuffix(ids: readonly string[], prefix: string): number {
  let highest = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const suffix = id.slice(prefix.length);
    if (!/^[0-9]+$/.test(suffix)) continue;
    highest = Math.max(highest, Number.parseInt(suffix, 10));
  }
  return highest;
}

function next(counter: Counter): string {
  counter.value += 1;
  return counter.prefix + String(counter.value).padStart(2, '0');
}

export interface LedgerIdAllocator {
  nextRevisionId(): RevisionId;
  nextIntakeId(): IntakeId;
  nextStatementId(): StatementId;
  nextEvidenceId(): EvidenceId;
  nextRelationshipId(): RelationshipId;
  nextEventId(): EventId;
  nextClaimId(): ClaimId;
  nextGapId(): GapId;
  nextActionId(): ActionId;
  nextInspectionId(): InspectionId;
  nextModelRunId(): ModelRunId;
}

export function createLedgerIdAllocator(ledger: LedgerV3Case): LedgerIdAllocator {
  const revisions = ledger.revisions;
  const counters = {
    revision: { prefix: 'R', value: highestSuffix(revisions.map((item) => item.id), 'R') },
    intake: { prefix: 'IN', value: highestSuffix(ledger.intake_ledger.map((item) => item.id), 'IN') },
    statement: { prefix: 'U', value: highestSuffix(ledger.statements.map((item) => item.id), 'U') },
    evidence: { prefix: 'E', value: highestSuffix(ledger.evidence.map((item) => item.id), 'E') },
    relationship: { prefix: 'REL', value: highestSuffix(ledger.relationships.map((item) => item.id), 'REL') },
    event: { prefix: 'EV', value: highestSuffix(revisions.flatMap((item) => item.events.map((event) => event.id)), 'EV') },
    claim: { prefix: 'C', value: highestSuffix(revisions.flatMap((item) => item.claims.map((claim) => claim.id)), 'C') },
    gap: { prefix: 'G', value: highestSuffix(revisions.flatMap((item) => item.gaps.map((gap) => gap.id)), 'G') },
    action: { prefix: 'A', value: highestSuffix(revisions.flatMap((item) => item.actions.map((action) => action.id)), 'A') },
    inspection: { prefix: 'EI', value: highestSuffix(revisions.flatMap((item) => item.inspections.map((inspection) => inspection.id)), 'EI') },
    modelRun: { prefix: 'MR', value: highestSuffix(revisions.map((item) => item.accepted_model_run_id), 'MR') },
  } satisfies Record<string, Counter>;

  return {
    nextRevisionId: () => RevisionIdSchema.parse(next(counters.revision)),
    nextIntakeId: () => IntakeIdSchema.parse(next(counters.intake)),
    nextStatementId: () => StatementIdSchema.parse(next(counters.statement)),
    nextEvidenceId: () => EvidenceIdSchema.parse(next(counters.evidence)),
    nextRelationshipId: () => RelationshipIdSchema.parse(next(counters.relationship)),
    nextEventId: () => EventIdSchema.parse(next(counters.event)),
    nextClaimId: () => ClaimIdSchema.parse(next(counters.claim)),
    nextGapId: () => GapIdSchema.parse(next(counters.gap)),
    nextActionId: () => ActionIdSchema.parse(next(counters.action)),
    nextInspectionId: () => InspectionIdSchema.parse(next(counters.inspection)),
    nextModelRunId: () => ModelRunIdSchema.parse(next(counters.modelRun)),
  };
}
