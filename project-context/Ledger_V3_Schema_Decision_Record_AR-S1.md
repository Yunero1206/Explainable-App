# Ledger V3 Schema Decision Record

**Project:** Explainable Trust V0

**Workstream:** AR — Proposal Boundary + Ledger V3

**Slice governed:** AR-S1 — Ledger V3 contract

**Decision owner:** Project owner

**Prepared:** 2026-08-11

**Repository baseline audited:** `Yunero1206/Explainable-App`, `main@ac60c26dfa56a27bc5ab3f77c198685567e297fa`

**Status:** Owner contract complete; implementation remains unapproved until the user explicitly approves this record.

## 1. Purpose and authority

This record removes schema design authority from the implementation agent. AR-S1 must implement this contract exactly; it must not invent, omit, rename, widen, default, coerce, or reinterpret a field, enum, lifecycle, formula, reference rule, or ordering rule.

The authority order is:

1. `project-context/PROJECT_CONTRACT.md`;
2. `project-context/ARCHITECTURE_TARGET.md`;
3. this Schema Decision Record for AR-S1;
4. `project-context/slice-cards/AR-S1_LEDGER_V3_CONTRACT.md`;
5. existing V2 source only where this record explicitly preserves it.

When V2 conflicts with this record, this record is the intentional V3 decision. AR-S1 adds a new, unwired contract; it does not migrate or modify V2.

## 2. Scope boundary

AR-S1 may add exactly:

- `src/ledger/types.ts`;
- `src/ledger/schema.ts`;
- `src/ledger/factory.ts`;
- `src/ledger/index.ts`;
- `tests/fixtures/ledgerV3.ts`;
- `tests/ledgerV3Schema.test.ts`.

Checkpoint-only changes after a successful implementation push remain limited to:

- `project-context/ACTIVE_WORK.md`;
- `project-context/CURRENT_STATE.md`.

AR-S1 must not implement proposal operations, ID allocation, Gemini calls, model-run records, transition application, server or React wiring, IndexedDB, V2 migration, deletion, package changes, or lockfile changes.

`parseLedgerV3()` validates a complete already-built candidate. It does not apply a proposal or construct a child revision. Parent-to-child comparisons in this record are admission invariants, not a transition engine.

## 3. Owner decisions

### D1 — Stable JSON shape

All fields listed in this record are required. Absence is represented with `null`, never by optional properties. Arrays are always present. This applies to `current_revision_id`, `parent_id`, domain-time fields, evidence content components, blob metadata, and lifecycle transition metadata.

### D2 — Case title has one authority

`LedgerV3Case.title` is the immutable case label required by the slice card. Revisions do not contain another title. This removes the V2 dual-authority risk. A revision owns the current `objective`, `explanation`, and `assistant_message`.

### D3 — No top-level `updated_at`

The case owns only immutable `created_at`. The latest accepted change time is derived from the final revision. `updated_at` is not canonical state.

### D4 — Empty case is a first-class state

A valid empty case has all five collections empty and `current_revision_id: null`. The factory creates only this state. A non-empty ledger starts only when an accepted revision exists.

### D5 — Intake is the introduction authority

Every statement and evidence record is introduced by exactly one intake part. Each intake is introduced by exactly one revision. Revision input arrays are exact cumulative source snapshots, not arbitrary subsets.

### D6 — Evidence fields have one owner

The intake evidence part contains only the evidence reference. `CanonicalEvidence` owns all immutable submission metadata, content metadata, raw/extracted text, blob reference, and provenance back to the intake. Revision-owned `EvidenceInspection` contains assessment/inspection observations and limitations. No evidence metadata is duplicated across intake and canonical evidence.

### D7 — Epistemic relationships preserve V2 behavior

V3 preserves the accepted V2 relationship vocabulary:

- `supports_claim`;
- `qualifies_claim`;
- `conflicts_with_claim`;
- `raises_gap`;
- `corrects_statement`;
- `not_yet_classified`.

Intake-to-source provenance is structural and is not represented as a relationship.

### D8 — Gap vocabulary preserves canonical V2

V3 uses:

- `open`;
- `resolved`;
- `superseded`;
- `unavailable`;
- `no_longer_material`.

The legacy presentation values `narrowed`, `abandoned`, and `no-longer-material` are not admitted. `no-longer-material` maps to `no_longer_material` only in a future migration; AR-S1 performs no migration or fallback.

### D9 — Action lifecycle is explicit

V3 introduces the bounded action states required by the architecture target:

- `pending`;
- `in_progress`;
- `completed`;
- `cancelled`.

New actions begin `pending`. Status changes use the transition matrix in Section 11.

### D10 — Causal relationship is not canonical

The legacy presentation-only `causal_relationship` field is excluded. It has no canonical V2 behavior and is not required by the architecture target. Causality may be expressed in a claim proposition/reasoning and supported by accepted sources; adding a separate enum would create an unapproved epistemic axis.

### D11 — Delta structure is deterministic; prose is preserved

The expected delta entity set, operations, and ordering are recomputed from the ledger. `reason` is accepted explanatory prose and is validated but is not falsely claimed to be derivable from object differences. Source IDs are validated, deduplicated, and canonically ordered.

### D12 — Summary preserves all five canonical V2 counts

V3 retains and exactly defines:

- `total_evidence_count`;
- `established_claims_count`;
- `unresolved_claims_count`;
- `conflicted_claims_count`;
- `user_reported_claims_count`.

Non-deterministic presentation prose such as `epistemic_warning`, `timeline_span`, or a delta summary is not stored in `DeterministicSummary`.

## 4. Exact primitive contracts

### 4.1 Branded IDs

The TypeScript representation is `Brand<string, Name>`. Each runtime schema is anchored and family-specific. Raw JSON using the wrong prefix fails even if the referenced suffix exists in another family.

| Family | Type | Exact runtime pattern |
|---|---|---|
| Case | `CaseId` | `^CASE_[A-Za-z0-9][A-Za-z0-9_-]{0,63}$` |
| Revision | `RevisionId` | `^R[0-9]{2,}$` |
| Intake | `IntakeId` | `^IN[0-9]{2,}$` |
| Statement | `StatementId` | `^U[0-9]{2,}$` |
| Evidence | `EvidenceId` | `^E[0-9]{2,}$` |
| Relationship | `RelationshipId` | `^REL[0-9]{2,}$` |
| Event | `EventId` | `^EV[0-9]{2,}$` |
| Claim | `ClaimId` | `^C[0-9]{2,}$` |
| Gap | `GapId` | `^G[0-9]{2,}$` |
| Action | `ActionId` | `^A[0-9]{2,}$` |
| Inspection | `InspectionId` | `^EI[0-9]{2,}$` |
| Model run | `ModelRunId` | `^MR[0-9]{2,}$` |
| Blob storage reference | `BlobRef` | `^BLOB_[A-Za-z0-9][A-Za-z0-9_-]{0,127}$` |

The patterns intentionally preserve the V2 entity prefixes and two-or-more-digit examples such as `R01`, while making all families distinguishable at runtime. AR-S3 will own allocation; AR-S1 only validates.

### 4.2 Structural instant

`StructuralInstant` accepts exactly:

`YYYY-MM-DDTHH:mm:ss.sssZ`

The shape regex is:

```text
^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$
```

After the shape check, explicit integer component checks must validate the real number of days in the month, including Gregorian leap-year rules. No `Date.parse()`, `new Date(input)`, coercion, normalization, offset acceptance, missing milliseconds, or leap second is allowed. The admitted string is returned byte-for-byte unchanged.

### 4.3 Text classes

No schema uses `.trim()` as a transformation.

| Class | Validation | Literal `Unknown` |
|---|---|---|
| `PreservedText` | string; field-specific nullability; returned unchanged | allowed |
| `PreservedNonBlankText` | `value.trim().length > 0`; returned unchanged | allowed |
| `DomainTimeText` | preserved non-blank string; no date parsing | allowed |
| `SemanticText` | trimmed comparison is non-empty and not case-insensitively equal to `unknown`, `tbd`, or `n/a`; returned unchanged | rejected |

`SemanticText` applies exactly to:

- relationship `reason`;
- revision `objective`, `explanation`, and `assistant_message`;
- event `actor`, `action`, `target`, and `effect`;
- claim `proposition`, `actor`, `action`, `target`, `reasoning`, and `scope`;
- every claim `limits` item;
- gap `question`, `relevance`, `resolving_evidence`, `acquisition_guidance`, and `collection_boundary`;
- lifecycle transition `reason`;
- action `title` and `description`;
- inspection `source_attribution`, `case_object_match`, `completeness_context`, `integrity_signals`, and every `limitations` item;
- delta `reason`.

Raw/preserved fields—including statement text, evidence raw/extracted text, case title, case number, claimed source, evidence label, filename, subject/object identifiers, and all domain-time text—are never subjected to sentinel rejection.

### 4.4 Other exact primitives

| Primitive | Exact validation |
|---|---|
| `SchemaVersion` | literal `3.0.0` |
| `Sha256` | `^sha256:[0-9a-f]{64}$` |
| `MimeType` | `^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$` |
| `ByteSize` | safe non-negative integer |
| Summary count | safe non-negative integer |

All arrays reject duplicate IDs or duplicate exact strings where the field represents a set. Arrays preserve their admitted order.

## 5. Exact enums

```ts
type AcquisitionMethod =
  | 'user_upload'
  | 'pasted_text'
  | 'file_drop'
  | 'manual_entry';

type InputForm =
  | 'screenshot'
  | 'image'
  | 'email_text'
  | 'pdf'
  | 'receipt'
  | 'chat_transcript'
  | 'document'
  | 'other';

type AssessmentState =
  | 'Reported'
  | 'Corroborated'
  | 'Contested'
  | 'Established within current record'
  | 'Mutually acknowledged';

type EvidenceMatchStatus =
  | 'matched'
  | 'mismatched'
  | 'unclear'
  | 'not_assessed';

type GapStatus =
  | 'open'
  | 'resolved'
  | 'superseded'
  | 'unavailable'
  | 'no_longer_material';

type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type Priority = 'high' | 'medium' | 'low';

type RelationshipType =
  | 'supports_claim'
  | 'qualifies_claim'
  | 'conflicts_with_claim'
  | 'raises_gap'
  | 'corrects_statement'
  | 'not_yet_classified';
```

No enum has a default or fallback.

## 6. Complete TypeScript contract

The following is normative. Field names, required/null shape, discriminants, and ID pairings must match exactly.

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };

type CaseId = Brand<string, 'CaseId'>;
type RevisionId = Brand<string, 'RevisionId'>;
type IntakeId = Brand<string, 'IntakeId'>;
type StatementId = Brand<string, 'StatementId'>;
type EvidenceId = Brand<string, 'EvidenceId'>;
type RelationshipId = Brand<string, 'RelationshipId'>;
type EventId = Brand<string, 'EventId'>;
type ClaimId = Brand<string, 'ClaimId'>;
type GapId = Brand<string, 'GapId'>;
type ActionId = Brand<string, 'ActionId'>;
type InspectionId = Brand<string, 'InspectionId'>;
type ModelRunId = Brand<string, 'ModelRunId'>;
type BlobRef = Brand<string, 'BlobRef'>;
type StructuralInstant = Brand<string, 'StructuralInstant'>;
type CaseNumber = Brand<string, 'CaseNumber'>;
type CaseTitle = Brand<string, 'CaseTitle'>;
type PreservedNonBlankText = Brand<string, 'PreservedNonBlankText'>;
type DomainTimeText = Brand<string, 'DomainTimeText'>;
type SemanticText = Brand<string, 'SemanticText'>;
type Sha256 = Brand<string, 'Sha256'>;
type MimeType = Brand<string, 'MimeType'>;
type ByteSize = Brand<number, 'ByteSize'>;
type NonNegativeInteger = Brand<number, 'NonNegativeInteger'>;

type SourceId = StatementId | EvidenceId;

interface LedgerV3Case {
  id: CaseId;
  schema_version: '3.0.0';
  case_number: CaseNumber;
  title: CaseTitle;
  created_at: StructuralInstant;
  current_revision_id: RevisionId | null;
  intake_ledger: IntakeRecord[];
  statements: CanonicalStatement[];
  evidence: CanonicalEvidence[];
  relationships: AcceptedRelationship[];
  revisions: Revision[];
}

interface IntakeRecord {
  id: IntakeId;
  received_at: StructuralInstant;
  parts: IntakePart[];
}

type IntakePart = StatementIntakePart | EvidenceIntakePart;

interface StatementIntakePart {
  kind: 'statement';
  statement_id: StatementId;
  raw_text: PreservedNonBlankText;
}

interface EvidenceIntakePart {
  kind: 'evidence';
  evidence_id: EvidenceId;
}

interface CanonicalStatement {
  id: StatementId;
  source_intake_id: IntakeId;
  text: PreservedNonBlankText;
}

interface BlobMetadata {
  blob_ref: BlobRef;
  submitted_filename: PreservedNonBlankText;
  mime_type: MimeType;
  byte_size: ByteSize;
  sha256: Sha256;
}

interface EvidenceContent {
  raw_text: PreservedNonBlankText | null;
  extracted_text: PreservedNonBlankText | null;
  blob: BlobMetadata | null;
}

interface CanonicalEvidence {
  id: EvidenceId;
  source_intake_id: IntakeId;
  label: PreservedNonBlankText;
  claimed_source: PreservedNonBlankText;
  acquisition_method: AcquisitionMethod;
  input_form: InputForm;
  original_domain_time: DomainTimeText | null;
  subject_object_ids: PreservedNonBlankText[];
  content: EvidenceContent;
}

type AcceptedRelationship =
  | SupportsClaimRelationship
  | QualifiesClaimRelationship
  | ConflictsWithClaimRelationship
  | GapSourceRelationship
  | StatementCorrectionRelationship
  | UnclassifiedSourceRelationship;

interface SupportsClaimRelationship {
  id: RelationshipId;
  relationship_type: 'supports_claim';
  source_id: SourceId;
  target_id: ClaimId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

interface QualifiesClaimRelationship {
  id: RelationshipId;
  relationship_type: 'qualifies_claim';
  source_id: SourceId;
  target_id: ClaimId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

interface ConflictsWithClaimRelationship {
  id: RelationshipId;
  relationship_type: 'conflicts_with_claim';
  source_id: SourceId;
  target_id: ClaimId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

interface GapSourceRelationship {
  id: RelationshipId;
  relationship_type: 'raises_gap';
  source_id: SourceId;
  target_id: GapId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

interface StatementCorrectionRelationship {
  id: RelationshipId;
  relationship_type: 'corrects_statement';
  source_id: StatementId;
  target_id: StatementId;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

interface UnclassifiedSourceRelationship {
  id: RelationshipId;
  relationship_type: 'not_yet_classified';
  source_id: SourceId;
  target_id: null;
  reason: SemanticText;
  created_in_revision_id: RevisionId;
}

interface Revision {
  id: RevisionId;
  parent_id: RevisionId | null;
  created_at: StructuralInstant;
  objective: SemanticText;
  explanation: SemanticText;
  assistant_message: SemanticText;
  accepted_model_run_id: ModelRunId;
  triggering_intake_ids: IntakeId[];
  input_statement_ids: StatementId[];
  input_evidence_ids: EvidenceId[];
  events: Event[];
  claims: Claim[];
  gaps: Gap[];
  actions: Action[];
  inspections: EvidenceInspection[];
  delta: RevisionDelta;
  summary: DeterministicSummary;
}

interface Event {
  id: EventId;
  domain_time: DomainTimeText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  effect: SemanticText;
  source_support_ids: SourceId[];
  assessment: AssessmentState;
}

interface Claim {
  id: ClaimId;
  proposition: SemanticText;
  actor: SemanticText;
  action: SemanticText;
  target: SemanticText;
  domain_time: DomainTimeText;
  assessment: AssessmentState;
  reasoning: SemanticText;
  scope: SemanticText;
  limits: SemanticText[];
  supporting_source_ids: SourceId[];
  qualifying_source_ids: SourceId[];
  conflicting_source_ids: SourceId[];
}

interface GapTransition {
  previous_status: GapStatus;
  resulting_status: GapStatus;
  transition_revision_id: RevisionId;
  reason: SemanticText;
  supporting_source_ids: SourceId[];
}

interface Gap {
  id: GapId;
  question: SemanticText;
  relevance: SemanticText;
  resolving_evidence: SemanticText;
  acquisition_guidance: SemanticText;
  collection_boundary: SemanticText;
  target_claim_ids: ClaimId[];
  status: GapStatus;
  transition: GapTransition | null;
}

interface ActionTransition {
  previous_status: ActionStatus;
  resulting_status: ActionStatus;
  transition_revision_id: RevisionId;
  reason: SemanticText;
  supporting_source_ids: SourceId[];
}

interface Action {
  id: ActionId;
  title: SemanticText;
  description: SemanticText;
  target_gap_ids: GapId[];
  priority: Priority;
  status: ActionStatus;
  transition: ActionTransition | null;
}

interface EvidenceInspection {
  id: InspectionId;
  evidence_id: EvidenceId;
  source_attribution: SemanticText;
  case_object_match: SemanticText;
  match_status: EvidenceMatchStatus;
  completeness_context: SemanticText;
  integrity_signals: SemanticText;
  limitations: SemanticText[];
}

type DeltaOperation = 'add' | 'update' | 'transition';

type DeltaEntry =
  | IntakeDeltaEntry
  | StatementDeltaEntry
  | EvidenceDeltaEntry
  | RelationshipDeltaEntry
  | EventDeltaEntry
  | ClaimDeltaEntry
  | GapDeltaEntry
  | ActionDeltaEntry
  | InspectionDeltaEntry;

interface IntakeDeltaEntry {
  entity_type: 'intake';
  entity_id: IntakeId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface StatementDeltaEntry {
  entity_type: 'statement';
  entity_id: StatementId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface EvidenceDeltaEntry {
  entity_type: 'evidence';
  entity_id: EvidenceId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface RelationshipDeltaEntry {
  entity_type: 'relationship';
  entity_id: RelationshipId;
  operation: 'add';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface EventDeltaEntry {
  entity_type: 'event';
  entity_id: EventId;
  operation: 'add' | 'update';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface ClaimDeltaEntry {
  entity_type: 'claim';
  entity_id: ClaimId;
  operation: 'add' | 'update';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface GapDeltaEntry {
  entity_type: 'gap';
  entity_id: GapId;
  operation: 'add' | 'update' | 'transition';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface ActionDeltaEntry {
  entity_type: 'action';
  entity_id: ActionId;
  operation: 'add' | 'update' | 'transition';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface InspectionDeltaEntry {
  entity_type: 'inspection';
  entity_id: InspectionId;
  operation: 'add' | 'update';
  reason: SemanticText;
  source_ids: SourceId[];
}

interface RevisionDelta {
  entries: DeltaEntry[];
}

interface DeterministicSummary {
  total_evidence_count: NonNegativeInteger;
  established_claims_count: NonNegativeInteger;
  unresolved_claims_count: NonNegativeInteger;
  conflicted_claims_count: NonNegativeInteger;
  user_reported_claims_count: NonNegativeInteger;
}
```

## 7. Structural schema rules

1. Every object above is a strict object. Unknown keys fail at the exact nested boundary where they occur.
2. Every discriminated union is strict within every variant. Fields valid in another variant remain unknown and fail.
3. Every required array is present. No schema default fills an absent array.
4. Every nullable field is present and explicitly `null` when absent.
5. `IntakeRecord.parts` is non-empty. A statement/evidence array may be empty only when that family is absent from the intake.
6. Source/category/reference arrays reject duplicates.
7. `Gap.target_claim_ids` and `Action.target_gap_ids` are non-empty.
8. `GapTransition.supporting_source_ids` and `ActionTransition.supporting_source_ids` are non-empty.
9. `Event.source_support_ids` is non-empty.
10. A claim may have an empty individual category, but the union of its three source-category arrays is non-empty and a source ID may not appear in more than one category for the same claim snapshot.
11. `EvidenceInspection.limitations` and `Claim.limits` may be empty. If present, each string is `SemanticText` and exact duplicates fail.
12. `subject_object_ids` may be empty; each item is preserved non-blank text and exact duplicates fail.

## 8. Evidence ownership and conditional rules

### 8.1 Canonical ownership

| Concern | Sole canonical owner |
|---|---|
| Intake receipt time | `IntakeRecord.received_at` |
| Statement raw text | `StatementIntakePart.raw_text`; must equal `CanonicalStatement.text` |
| Evidence submission metadata | `CanonicalEvidence` and its nested `content`/`blob` |
| Evidence claimed/original source | `CanonicalEvidence.claimed_source` |
| Original evidence time | `CanonicalEvidence.original_domain_time` |
| Source/object identifiers | `CanonicalEvidence.subject_object_ids` |
| Binary bytes | external blob store; never canonical JSON |
| Binary storage reference and hash | `CanonicalEvidence.content.blob` |
| Directly submitted text | `CanonicalEvidence.content.raw_text` |
| Derived extraction | `CanonicalEvidence.content.extracted_text` |
| Inspection observations and limitations | revision `EvidenceInspection` |

### 8.2 Content invariants

- `content.raw_text` and `content.extracted_text`, when non-null, are preserved non-blank text.
- At least one of `content.raw_text` or `content.blob` is non-null.
- For `acquisition_method` `pasted_text` or `manual_entry`:
  - `content.raw_text` is non-null;
  - `content.blob` is null.
- For `acquisition_method` `user_upload` or `file_drop`:
  - `content.blob` is non-null;
  - `content.raw_text` may be null or may preserve accompanying user-supplied text.
- `content.extracted_text` is always derived text. It may be null for any acquisition method.
- `BlobMetadata` is all-or-nothing because it is a required strict object when non-null.
- `sha256` uses exactly the `sha256:<64 lowercase hex>` form.
- `blob_ref` is an app-generated opaque reference. It is not a URL, filesystem path, Base64 string, or data URL.
- A blob reference must be unique across top-level evidence records. One canonical evidence record owns one blob reference in V0.
- No validator scans raw or extracted text for Base64-looking content or data-URL-looking prose.
- Strict object schemas reject raw byte arrays or binary-bearing unknown fields. Data URLs fail only when supplied where a `BlobRef` is required.

## 9. Ledger topology and chronology invariants

### 9.1 Identity and ordering

- Top-level `IntakeId`, `StatementId`, `EvidenceId`, `RelationshipId`, and `RevisionId` values are unique within their families across the ledger.
- `accepted_model_run_id` is unique across revisions; one accepted run cannot authorize two revisions.
- Within each revision, IDs are unique separately for events, claims, gaps, actions, and inspections.
- The same event/claim/gap/action/inspection ID may appear in successive revisions to express continuity.
- Revision IDs are globally unique and revision array order is authoritative chronology.
- Structural timestamps are non-decreasing in revision order. Equal millisecond timestamps are allowed.
- `case.created_at` is less than or equal to every intake receipt and revision creation time.
- Every intake receipt time is less than or equal to the creation time of the revision that introduces it.

### 9.2 Empty and current revision

- If `revisions.length === 0`, then `current_revision_id` is `null` and intake, statement, evidence, and relationship arrays are all empty.
- If `revisions.length > 0`, `current_revision_id` equals the final revision ID and is not null.
- No non-empty top-level source collection is valid without a revision.

### 9.3 Parent chain

- First revision: `parent_id === null`.
- Revision at index `i > 0`: `parent_id === revisions[i - 1].id`.
- No missing, skipped, self, future, or merely-earlier parent is accepted.

### 9.4 Intake introduction

- Every revision has at least one `triggering_intake_id`.
- Every `IntakeId` appears exactly once across all revision `triggering_intake_ids`.
- Every triggering ID resolves to a top-level intake.
- Intake array order equals flattened `triggering_intake_ids` in revision order.
- Parts within one intake may mix statements and evidence and preserve user submission order.

### 9.5 Intake-to-source bijection

- Every statement part references one existing canonical statement.
- Every evidence part references one existing canonical evidence.
- Every canonical statement appears in exactly one statement part.
- Every canonical evidence appears in exactly one evidence part.
- The source record's `source_intake_id` equals the containing intake ID.
- Statement `raw_text` equals canonical statement `text` byte-for-byte.
- A source ID cannot occur in two parts, two intakes, or the wrong part family.
- Top-level statement order equals statement-part order flattened across the intake ledger.
- Top-level evidence order equals evidence-part order flattened across the intake ledger.

### 9.6 Exact source availability

For revision index `i`, define `introducedIntakes(i)` as the flattened triggering intakes from revisions `0..i`.

Then:

- `input_statement_ids` equals, in top-level statement order, every statement whose `source_intake_id` is in `introducedIntakes(i)`;
- `input_evidence_ids` equals, in top-level evidence order, every evidence whose `source_intake_id` is in `introducedIntakes(i)`.

The equality is exact. Missing, extra, duplicated, reordered, future, or wrong-family source IDs fail. This rule implies parent carry-forward and closes the source-availability definition.

## 10. Relationship invariants

### 10.1 Discriminated families

| `relationship_type` | Source family | Target family |
|---|---|---|
| `supports_claim` | Statement or Evidence | Claim |
| `qualifies_claim` | Statement or Evidence | Claim |
| `conflicts_with_claim` | Statement or Evidence | Claim |
| `raises_gap` | Statement or Evidence | Gap |
| `corrects_statement` | Statement only | Statement |
| `not_yet_classified` | Statement or Evidence | exactly `null` |

### 10.2 Creation chronology

- `created_in_revision_id` resolves to an existing revision.
- The source is available in the creation revision.
- A claim/gap target exists in the creation revision snapshot.
- A corrected statement target is available in the creation revision and was introduced in a strictly earlier revision than the correcting statement.
- A statement cannot correct itself.
- Top-level relationships are ordered by non-decreasing creation-revision index.

### 10.3 Disposition batches

A source's relationship batch at revision `R` is every relationship for that source whose `created_in_revision_id` is `R`.

- Every new source has a non-empty relationship batch in the same revision that introduces its intake.
- An older source may receive a later replacement batch.
- Within one source/revision batch, the tuple `(relationship_type, target_id)` is unique.
- Within one source/revision batch, a source may have at most one of `supports_claim`, `qualifies_claim`, or `conflicts_with_claim` for the same claim target.
- If a batch contains `not_yet_classified`, it contains exactly that one relationship.
- For any revision, the effective relationship batch for a source is the batch with the greatest creation-revision index not later than that revision.
- Earlier batches remain immutable history but are not the current disposition after a later batch is accepted.

### 10.4 Claim category equality

For every claim snapshot, its three source arrays must exactly equal the effective relationship batches at that revision:

- `supporting_source_ids` ↔ effective `supports_claim` edges targeting that claim;
- `qualifying_source_ids` ↔ effective `qualifies_claim` edges targeting that claim;
- `conflicting_source_ids` ↔ effective `conflicts_with_claim` edges targeting that claim.

Expected order is revision `input_statement_ids`, followed by `input_evidence_ids`. A source cannot occupy more than one category for the same claim snapshot.

This equality prevents relationships and claim source categories from becoming competing authorities.

## 11. Snapshot continuity and lifecycle invariants

### 11.1 No deletion or reorder by omission

For each entity family, a child revision's ID sequence begins with the complete parent ID sequence in the same order. New IDs may only be appended. A missing or reordered parent ID fails.

### 11.2 Immutable identity fields

For a stable ID carried from parent to child, these fields may not change:

| Entity | Immutable across revisions |
|---|---|
| Event | `domain_time`, `actor`, `action`, `target` |
| Claim | `proposition`, `actor`, `action`, `target`, `domain_time` |
| Gap | `question`, `target_claim_ids` |
| Action | `title`, `target_gap_ids` |
| Inspection | `evidence_id` |

Other non-status fields may change and produce an `update` delta. Status changes use `transition`.

### 11.3 Inspection coverage and continuity

- Every revision contains exactly one inspection for every ID in `input_evidence_ids`.
- It contains no inspection for unavailable evidence.
- An evidence record keeps the same `InspectionId` across successive revisions.
- A new evidence source receives one new inspection in its introduction revision.

### 11.4 Gap lifecycle

New gap rule:

- `status === 'open'`;
- `transition === null`.

Allowed transitions:

| From | Allowed to |
|---|---|
| `open` | `resolved`, `superseded`, `unavailable`, `no_longer_material` |
| `resolved` | `open` |
| `unavailable` | `open`, `resolved`, `no_longer_material` |
| `no_longer_material` | `open` |
| `superseded` | none |

When status changes in revision `R`:

- transition is non-null;
- `previous_status` equals the parent status;
- `resulting_status` equals the owning gap status;
- the pair exists in the matrix;
- `transition_revision_id === R.id`;
- `reason` is `SemanticText`;
- `supporting_source_ids` is non-empty, available in `R`, deduplicated, and in canonical source order.

When status does not change:

- for a carried gap, `transition` equals the parent transition byte-for-byte;
- for a new gap, `transition` is null.

### 11.5 Action lifecycle

New action rule:

- `status === 'pending'`;
- `transition === null`.

Allowed transitions:

| From | Allowed to |
|---|---|
| `pending` | `in_progress`, `completed`, `cancelled` |
| `in_progress` | `pending`, `completed`, `cancelled` |
| `completed` | none |
| `cancelled` | `pending` |

The same required transition metadata, source availability, ordering, and carry-forward rules used for gaps apply using `ActionStatus`.

## 12. Referential integrity inside each revision

- Every event source support ID is available in the containing revision.
- Every claim source ID is available and obeys relationship equality.
- Every gap target claim exists in the same revision.
- Every action target gap exists in the same revision.
- Every inspection evidence ID is available evidence in the same revision.
- Every lifecycle source ID is available in the transition revision.
- Every delta source ID is available in the containing revision.
- Runtime prefix schemas reject wrong-family raw strings before graph resolution.

## 13. Deterministic delta contract

### 13.1 Expected change set

For revision `R`, compare with an empty parent for genesis or the immediately preceding revision otherwise.

The expected entries are exactly:

1. every intake in `R.triggering_intake_ids` — `intake/add`;
2. every statement introduced by those intakes — `statement/add`;
3. every evidence record introduced by those intakes — `evidence/add`;
4. every relationship whose `created_in_revision_id === R.id` — `relationship/add`;
5. every new event — `event/add`;
6. every changed carried event — `event/update`;
7. every new claim — `claim/add`;
8. every changed carried claim — `claim/update`;
9. every new gap — `gap/add`;
10. every changed carried gap with unchanged status — `gap/update`;
11. every carried gap with changed status — `gap/transition`;
12. every new action — `action/add`;
13. every changed carried action with unchanged status — `action/update`;
14. every carried action with changed status — `action/transition`;
15. every new inspection — `inspection/add`;
16. every changed carried inspection — `inspection/update`.

No entry exists for an unchanged entity. No missing, extra, duplicate, wrong-operation, or wrong-ID-family entry is accepted.

Deep comparison uses every canonical field and exact array order after the immutable-identity and lifecycle rules have passed.

### 13.2 Exact entry ordering

Group order is:

`intake → statement → evidence → relationship → event → claim → gap → action → inspection`

Within each group:

- top-level introductions follow their top-level collection order;
- snapshot changes follow the child snapshot array order.

The supplied `delta.entries` must equal this expected entity/operation sequence exactly.

### 13.3 Reason rules

- Every reason is `SemanticText` and is preserved byte-for-byte.
- Intake additions use exactly `Accepted intake`.
- Statement additions use exactly `Accepted source statement`.
- Evidence additions use exactly `Accepted evidence source`.
- Relationship-add reason equals the relationship's `reason` byte-for-byte.
- Gap/action transition reason equals the lifecycle transition `reason` byte-for-byte.
- Semantic entity add/update reasons are accepted explanatory provenance; they are not derived from the object diff.

### 13.4 Source rules

All `source_ids` arrays are duplicate-free and follow the containing revision's canonical source order: statement IDs first in `input_statement_ids` order, followed by evidence IDs in `input_evidence_ids` order.

Exact special cases:

- intake/add: source IDs are that intake's parts, reordered to canonical statement-then-evidence source order;
- statement/add: exactly `[entity_id]`;
- evidence/add: exactly `[entity_id]`;
- relationship/add: exactly `[relationship.source_id]`;
- gap/action transition: exactly the transition's `supporting_source_ids`;
- inspection add/update: non-empty and includes the inspection's `evidence_id`;
- event/claim/gap/action add/update: non-empty and otherwise validated as accepted explanatory provenance available in the revision.

## 14. Deterministic summary formulas

For each revision, the supplied summary must equal a recomputed summary exactly.

| Field | Exact formula |
|---|---|
| `total_evidence_count` | `revision.input_evidence_ids.length` |
| `established_claims_count` | count of claims with assessment exactly `Established within current record` |
| `unresolved_claims_count` | count of claims with assessment `Reported`, `Corroborated`, or `Contested` |
| `conflicted_claims_count` | count of claims with assessment exactly `Contested` |
| `user_reported_claims_count` | count of claims with assessment exactly `Reported` |

`Mutually acknowledged` is not counted as unresolved, established, conflicted, or user-reported. It remains a distinct assessment state rather than being silently recoded.

Incorrect, negative, fractional, unsafe-integer, missing, or extra summary values fail.

## 15. Parser and factory API

### 15.1 Admission parser

`src/ledger/schema.ts` exports:

```ts
function parseLedgerV3(raw: unknown): LedgerV3Case;
```

It performs, in one public admission call:

1. strict Zod structural parsing at every boundary;
2. primitive runtime format validation;
3. all semantic graph, chronology, lifecycle, delta, and summary invariants in this record;
4. returns only the validated value, with no coercion or placeholder insertion.

The module may export named strict schemas and primitive constructor/parsers for tests and caller-owned branded inputs. `parseLedgerV3()` is the only function that admits an arbitrary complete ledger JSON object.

### 15.2 Primitive constructors

The schema module exports strict constructors for caller-owned values:

```ts
parseCaseId(raw: unknown): CaseId;
parseCaseNumber(raw: unknown): CaseNumber;
parseCaseTitle(raw: unknown): CaseTitle;
parseStructuralInstant(raw: unknown): StructuralInstant;
```

They preserve admitted strings byte-for-byte.

### 15.3 Empty factory

```ts
function createEmptyLedgerCase(input: {
  id: CaseId;
  case_number: CaseNumber;
  title: CaseTitle;
  created_at: StructuralInstant;
}): LedgerV3Case;
```

It returns exactly:

```ts
{
  id: input.id,
  schema_version: '3.0.0',
  case_number: input.case_number,
  title: input.title,
  created_at: input.created_at,
  current_revision_id: null,
  intake_ledger: [],
  statements: [],
  evidence: [],
  relationships: [],
  revisions: []
}
```

The factory does not read the clock, allocate IDs, create an intake or revision, invent text, add placeholders, accept raw unbranded primitives, or validate arbitrary ledger input. Test builders remain exclusively in `tests/fixtures/ledgerV3.ts`.

## 16. Required test matrix

Each row must be an explicit test or a table-driven family whose cases are visible in test data. A generic test name without the listed variants is insufficient.

### 16.1 Positive proofs

| ID | Proof |
|---|---|
| P01 | Primitive constructors preserve valid values and return family-specific brands. |
| P02 | Empty factory result passes `parseLedgerV3()`. |
| P03 | One full revision containing mixed intake parts, rich evidence/blob metadata, all relationship variants that do not require earlier history, all entity families, inspections, complete delta, and exact summary passes. |
| P04 | Two revisions preserve stable entity IDs, append new IDs, add a valid `corrects_statement` relationship to an earlier statement, update allowed fields, transition one gap/action, replace one relationship disposition batch, and pass. |
| P05 | Parse → JSON serialize → parse preserves every rich field and explanation byte-for-byte. |
| P06 | Raw statement/evidence text containing literal `Unknown` passes unchanged. |
| P07 | Domain-time text `next Friday` passes unchanged. |
| P08 | Base64-looking and data-URL-looking prose in raw/extracted evidence text passes unchanged. |
| P09 | Valid leap-day instant `2028-02-29T23:59:59.999Z` passes. |
| P10 | All allowed gap and action transitions pass in table-driven tests. |

### 16.2 Strict structure and primitives

| ID | Counterexample |
|---|---|
| N01 | Unknown-key table covers case, intake, both intake-part variants, statement, evidence, evidence content, blob metadata, all six relationship variants, revision, event, claim, gap, gap transition, action, action transition, inspection, delta, every delta-entry variant, and summary. |
| N02 | Missing required and omitted-null fields fail at each nullable boundary. |
| N03 | Every invalid enum value fails for acquisition, input form, assessment, match status, gap status, action status, priority, relationship type, and delta operation. |
| N04 | Invalid runtime pattern for every ID family and wrong-family raw ID for every reference field fails. |
| N05 | Invalid SHA-256 format, MIME type, negative/fractional/unsafe byte size, and malformed blob reference fail. |
| N06 | Empty preserved required text fails while literal `Unknown` remains allowed there. |
| N07 | Empty, `Unknown`, `unknown`, `TBD`, and `N/A` fail in every `SemanticText` field family without transforming valid whitespace/casing. |

### 16.3 Timestamp proofs

| ID | Counterexample |
|---|---|
| N08 | Missing milliseconds, offset timezone, missing timezone, natural language, impossible month/day, non-leap Feb 29, hour 24/25, minute/second 60, and native-Date rollover examples fail. |
| N09 | Revision timestamps decreasing, case creation after intake/revision, and intake receipt after its introduction revision fail. |

### 16.4 Empty, parent, identity, and ordering

| ID | Counterexample |
|---|---|
| N10 | Every invalid empty/current-revision combination fails. |
| N11 | Duplicate IDs fail separately for intake, statement, evidence, relationship, revision, and every per-revision entity family. |
| N12 | Genesis with non-null parent, later null parent, dangling parent, self-parent, skipped/non-immediate parent, and wrong final current ID fail. |
| N13 | Stable IDs across revisions pass, but missing/reordered parent entities and immutable identity-field changes fail for every snapshot family. |

### 16.5 Intake, provenance, and availability

| ID | Counterexample |
|---|---|
| N14 | Empty intake parts fail. |
| N15 | Orphan intake, intake triggered zero times, intake triggered twice, wrong trigger order, and dangling triggering intake fail. |
| N16 | Missing, duplicate, cross-intake, wrong-family, and dangling intake-part/source mappings fail for statements and evidence. |
| N17 | Statement raw/canonical text mismatch fails byte-for-byte. |
| N18 | Top-level statement/evidence order differing from flattened part order fails. |
| N19 | Revision input arrays with missing, extra, duplicate, reordered, future, or wrong-family source IDs fail. |
| N20 | Every evidence acquisition/content conditional fails in its invalid form; partial blob metadata fails. |
| N21 | Duplicate blob refs fail; byte arrays and binary-bearing unknown fields fail; data URL in `blob_ref` fails; raw Base64/data-URL-looking text remains covered by P08. |

### 16.6 Relationships

| ID | Counterexample |
|---|---|
| N22 | Each relationship discriminant rejects every wrong source/target family and wrong nullability. |
| N23 | Dangling source, target, or creation revision; source unavailable at creation; claim/gap target absent in creation snapshot; future-created relationship; and out-of-order relationship array fail. |
| N24 | Statement self-correction, evidence correction source, same/later-introduced correction target, and unavailable correction target fail. |
| N25 | New source without same-revision disposition batch fails. |
| N26 | Duplicate semantic edge and a `not_yet_classified` edge coexisting with another edge in the same batch fail. |
| N27 | Claim support/qualifying/conflicting arrays that are missing, extra, duplicated, reordered, cross-categorized, or inconsistent with the effective batch fail. |

### 16.7 Entity references, lifecycle, and inspection

| ID | Counterexample |
|---|---|
| N28 | Dangling/wrong-family event source, gap target claim, action target gap, inspection evidence, lifecycle source, and delta source fail separately. |
| N29 | Missing, duplicate, extra, wrong-evidence, or changed-ID inspection coverage fails. |
| N30 | Every forbidden gap transition pair fails; every invalid initial gap state/metadata combination fails. |
| N31 | Every forbidden action transition pair fails; every invalid initial action state/metadata combination fails. |
| N32 | Transition previous/resulting/owner status mismatch, wrong transition revision, empty sources, unavailable sources, missing reason, and altered metadata without status change fail for both lifecycle families. |

### 16.8 Delta and summary

| ID | Counterexample |
|---|---|
| N33 | Delta discriminant/ID-family mismatch and operation incompatibility fail for every variant. |
| N34 | Missing, extra, duplicate, reordered, unchanged-entity, and wrong-operation delta entries fail against recomputation. |
| N35 | Wrong fixed introduction reason, relationship-reason mismatch, transition-reason mismatch, missing/extra/reordered delta sources, and inspection source omitting its evidence ID fail. |
| N36 | Each of the five summary fields fails independently when off by one. |
| N37 | Negative, fractional, unsafe, missing, and unknown summary values fail. |
| N38 | Exact `@ts-expect-error` assignments prove wrong branded families fail at compile time for relationship targets, revision inputs, gap targets, action targets, inspection evidence, lifecycle sources, and every delta variant. Each directive sits on the single negative expression it proves. |

## 17. Implementation constraints

- Use Zod 4 already present in the repository; do not change dependencies.
- Use `.strict()` at every object boundary.
- Use discriminated unions whose variants encode ID families, not one union-valued generic relationship or delta object.
- Do not use `z.any()`, broad explicit `any`, `as any`, `as unknown as`, schema defaults, coercion, placeholder insertion, or fallback enums.
- Do not transform admitted canonical text.
- Shared test builders live only in `tests/fixtures/ledgerV3.ts`.
- Production factory creates only the valid empty case.
- `src/ledger/index.ts` exports the exact public types, constants, parsers, schemas, and factory needed by later slices; it contains no runtime wiring.

## 18. Gates and completion protocol

The package exposes `lint` as `tsc --noEmit`; it does not expose a separate `typecheck` script. Use:

```bash
npm test -- tests/ledgerV3Schema.test.ts
npm run lint
git diff --check
```

After gates pass:

1. inspect the complete unstaged diff and exact changed-path list;
2. stage exactly the six Ledger V3 implementation/test paths;
3. run and inspect:

   ```bash
   git diff --cached --check
   git diff --cached --name-status
   git diff --cached --stat
   git diff --cached
   ```

4. commit the implementation with a slice-scoped message;
5. capture exact identity with:

   ```bash
   git rev-parse HEAD
   git rev-parse HEAD^
   git show --check --format=fuller --stat HEAD
   ```

6. push with `git push origin HEAD:main`; if push fails, stop immediately;
7. update only `ACTIVE_WORK.md` and verified facts in `CURRENT_STATE.md`, recording gates, complete implementation SHA and parent, changed paths, AR-S1 status `COMPLETE — AWAITING USER CONTINUE`, and AR-S2 queued but inactive;
8. stage and fully review exactly those two checkpoint files;
9. commit and push the checkpoint separately;
10. verify branch, full HEAD, upstream relationship, and complete worktree status;
11. stop without activating AR-S2.

## 19. Implementation-agent instruction

The implementation agent must first return a short conformance handshake mapping this record to the six authorized files. It must surface only a genuine contradiction between this record and higher project truth. It must not propose alternative fields, enums, patterns, lifecycle values, formulas, or topology.

After explicit approval, it implements the record exactly, runs the stated gates and completion protocol, then stops. Passing focused AR-S1 tests proves only the Ledger V3 contract slice; it does not accept Phase 1A-R, persistence/reload, or V0.
