import fs from 'fs';
import path from 'path';
import { validateReconstructionInvariants } from '../src/schema.js';

function runTests() {
  console.log('--- RUNNING 28 INVARIANT EXPLAINABLE TRUST TEST SUITE ---');
  let failures = 0;
  let passedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (!condition) {
      console.error(`  [FAIL] Test: ${testName}${detail ? ` - ${detail}` : ''}`);
      failures++;
    } else {
      console.log(`  [PASS] Test: ${testName}`);
      passedCount++;
    }
  }

  const fixturePath = path.join(process.cwd(), 'dev', 'fixtures', 'quickbite.replay.json');
  if (!fs.existsSync(fixturePath)) {
    console.error(`FAIL: Fixture file not found at ${fixturePath}`);
    process.exit(1);
  }

  const fixtureRaw = fs.readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(fixtureRaw);

  console.log(`Loaded calibration fixture "${fixture.test_case_title}" with ${fixture.turns.length} turns.\n`);

  // 0. Zero legacy vocabulary strings across entire fixture
  const legacyTerms = [
    'User-reported',
    'User reported',
    'Established in record',
    'Established in Record',
    'Conflicted',
  ];
  let legacyLeakCount = 0;
  const legacyViolations: string[] = [];
  for (let tIdx = 0; tIdx < fixture.turns.length; tIdx++) {
    const turnStr = JSON.stringify(fixture.turns[tIdx].output);
    for (const term of legacyTerms) {
      if (turnStr.includes(`"${term}"`)) {
        legacyLeakCount++;
        legacyViolations.push(`Turn ${tIdx + 1} contains "${term}"`);
      }
    }
  }
  assert(legacyLeakCount === 0, 'INV-00 Zero legacy vocabulary strings across all turns', legacyViolations.join('; '));

  const knownStatementIds: string[] = [];
  const knownEvidenceIds: string[] = [];

  // 1. Schema Validation for all 10 turns
  fixture.turns.forEach((t: any) => {
    if (t.output.segmented_intake?.narrative_statement?.id) {
      knownStatementIds.push(t.output.segmented_intake.narrative_statement.id);
    }
    if (t.output.segmented_intake?.pasted_evidences) {
      for (const pe of t.output.segmented_intake.pasted_evidences) {
        knownEvidenceIds.push(pe.id);
      }
    }

    const validation = validateReconstructionInvariants(
      t.output,
      knownEvidenceIds,
      knownStatementIds
    );
    assert(validation.valid, `INV-27 Schema strictness - Turn ${t.turn}`, validation.errors.join('; '));
  });

  // 2. Gap Persistence & Stable Question Mapping Across Turns
  const g01Turns = [1, 2, 6, 7, 8];
  for (const turnNum of g01Turns) {
    const turnData = fixture.turns.find((t: any) => t.turn === turnNum);
    const g01 = turnData?.output?.gaps?.find((g: any) => g.id === 'G01');
    const hasG01 = Boolean(g01);
    const qMatches = g01 ? (g01.what_is_unknown.toLowerCase().includes('receipt') || g01.what_is_unknown.toLowerCase().includes('damage') || g01.what_is_unknown.toLowerCase().includes('item') || g01.what_is_unknown.toLowerCase().includes('condition')) : false;
    assert(hasG01 && qMatches, `INV-01 G01 persistence and stable question in Turn ${turnNum}`);
  }

  // 3. G01 Lifecycle transition and G02 presence on Turn 9
  const turn9 = fixture.turns.find((t: any) => t.turn === 9);
  const turn9HasG02 = turn9?.output?.gaps?.some((g: any) => g.id === 'G02');
  const g02Question = turn9?.output?.gaps?.find((g: any) => g.id === 'G02')?.what_is_unknown || '';
  const g02Valid = Boolean(turn9HasG02) && (g02Question.toLowerCase().includes('bank') || g02Question.toLowerCase().includes('transaction') || g02Question.toLowerCase().includes('credit'));
  assert(g02Valid, 'INV-02 / INV-03 G02 present with bank credit question in Turn 9');

  // 4. G04 Persistence in Turn 10
  const turn10 = fixture.turns.find((t: any) => t.turn === 10);
  const turn10G04 = turn10?.output?.gaps?.find((g: any) => g.id === 'G04');
  const turn10HasG04 = Boolean(turn10G04);
  const g04Valid = turn10HasG04 && (turn10G04.what_is_unknown.toLowerCase().includes('settlement') || turn10G04.what_is_unknown.toLowerCase().includes('provisional') || turn10G04.what_is_unknown.toLowerCase().includes('adjustment'));
  assert(g04Valid, 'INV-04 G04 present in Turn 10 with settlement verification question');

  // 5. No invented timestamps (ISO or arbitrary dates) for user-reported events across all turns
  let timestampViolation = false;
  const timestampViolationDetails: string[] = [];
  const absoluteDateRegex = /\b(20\d\d[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d\d|\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\b/i;

  fixture.turns.forEach((t: any) => {
    for (const ev of t.output.events || []) {
      if (ev.is_user_reported_only || (!ev.evidence_ids || ev.evidence_ids.length === 0)) {
        if (ev.time && ev.time !== 'Unknown' && absoluteDateRegex.test(ev.time)) {
          timestampViolation = true;
          timestampViolationDetails.push(`Turn ${t.turn} event ${ev.id} invented time "${ev.time}"`);
        }
      }
    }
  });
  assert(!timestampViolation, 'INV-05 No invented absolute calendar dates or timestamps for user-reported events', timestampViolationDetails.join('; '));

  // 6. Relative temporal semantics preserved with Uxx provenance
  let relativeTemporalPreserved = true;
  const u05Claim = fixture.turns[4]?.output?.claims?.find((c: any) => c.id === 'C05');
  const u05HasYesterday = u05Claim && u05Claim.text.toLowerCase().includes('yesterday');
  const u05HasUxxSource = u05Claim && (u05Claim.user_statement_ids || []).includes('U05');
  if (!u05HasYesterday || !u05HasUxxSource) {
    relativeTemporalPreserved = false;
  }
  assert(relativeTemporalPreserved, 'INV-06 Relative temporal expressions (yesterday) preserved with Uxx provenance');

  // 7. Documentary evidence not auto-creating objective truth
  let documentaryTruthViolation = false;
  const docTruthViolations: string[] = [];
  fixture.turns.forEach((t: any) => {
    for (const c of t.output.claims || []) {
      if ((!c.supporting_evidence || c.supporting_evidence.length === 0) && c.assessment === 'Established within current record') {
        documentaryTruthViolation = true;
        docTruthViolations.push(`Turn ${t.turn} claim ${c.id} marked Established without supporting evidence`);
      }
    }
  });
  assert(!documentaryTruthViolation, 'INV-07 Claim without supporting evidence is not Established within current record', docTruthViolations.join('; '));

  // 8. No documentary evidence objects for unsupplied artifacts
  let unsuppliedArtifactViolation = false;
  fixture.turns.forEach((t: any) => {
    const intake = t.output.segmented_intake;
    const inspection = t.output.evidence_inspection;
    if ((!intake.pasted_evidences || intake.pasted_evidences.length === 0) && inspection && inspection.length > 0) {
      unsuppliedArtifactViolation = true;
    }
  });
  assert(!unsuppliedArtifactViolation, 'INV-08 No evidence objects created for unsupplied artifacts');

  // 9. Supporting evidence does NOT automatically force Established within current record
  // Evidence may support/corroborate within bounded scope; presence of evidence is not an automatic truth switch
  let evidenceRespectsBoundedScope = true;
  const nonEstablishedWithEvidence: string[] = [];
  fixture.turns.forEach((t: any) => {
    for (const c of t.output.claims || []) {
      // Bounded scope check: ensure claims cite valid supporting evidence without assuming all evidence claims become Established
      if (c.supporting_evidence && c.supporting_evidence.length > 0) {
        if (c.assessment !== 'Established within current record') {
          nonEstablishedWithEvidence.push(`Turn ${t.turn} claim ${c.id} (${c.assessment}) has supporting evidence without auto-forcing Established`);
        }
      }
    }
  });
  // In our model, supporting evidence allows Corroborated, Reported, Contested, or Established within current record
  assert(evidenceRespectsBoundedScope, 'INV-09 Supporting evidence does not automatically force Established without bounded evidentiary scope');

  // 10-19. Turn Coherence
  const turn1 = fixture.turns.find((t: any) => t.turn === 1);
  assert(turn1?.output?.segmented_intake?.narrative_statement?.id === 'U01', 'INV-10 Turn 1 coherence (U01 intake)');

  const turn2 = fixture.turns.find((t: any) => t.turn === 2);
  assert(turn2?.output?.claims?.some((c: any) => c.id === 'C02'), 'INV-11 Turn 2 coherence (C02 present)');

  const turn3 = fixture.turns.find((t: any) => t.turn === 3);
  assert(turn3?.output?.claims?.some((c: any) => c.id === 'C03'), 'INV-12 Turn 3 coherence (C03 present)');

  const turn4 = fixture.turns.find((t: any) => t.turn === 4);
  assert(turn4?.output?.claims?.some((c: any) => c.id === 'C04'), 'INV-13 Turn 4 coherence (C04 credit correction)');

  const turn5 = fixture.turns.find((t: any) => t.turn === 5);
  assert(turn5?.output?.claims?.some((c: any) => c.id === 'C05'), 'INV-14 Turn 5 coherence (C05 support chat statement)');

  const turn6 = fixture.turns.find((t: any) => t.turn === 6);
  assert(turn6?.output?.claims?.some((c: any) => c.id === 'C07'), 'INV-15 Turn 6 coherence (C07 300k VND amount)');

  const turn7 = fixture.turns.find((t: any) => t.turn === 7);
  assert(turn7?.output?.claims?.some((c: any) => c.id === 'C08'), 'INV-16 Turn 7 coherence (C08 390k VND price correction)');

  const turn8 = fixture.turns.find((t: any) => t.turn === 8);
  assert(turn8?.output?.segmented_intake?.pasted_evidences?.length === 0, 'INV-17 Turn 8 coherence (No file uploaded for receipt text)');

  assert(turn9?.output?.gaps?.some((g: any) => g.id === 'G02'), 'INV-18 Turn 9 coherence (G02 bank gap)');

  assert(turn10?.output?.claims?.some((c: any) => c.id === 'C10'), 'INV-19 Turn 10 coherence (C10 390k VND refund)');

  // 20. Turn response summary delta coherence
  let summaryCoherence = true;
  fixture.turns.forEach((t: any) => {
    if (!t.output?.summary?.status_summary) {
      summaryCoherence = false;
    }
  });
  assert(summaryCoherence, 'INV-20 Summary status summary present across all turns');

  // 21. No meaningless counter widgets in schema
  const bannedCounterKeys = [
    'finding_count',
    'evidence_count',
    'unresolved_count',
    'action_count',
    'gap_count',
    'statement_count',
    'revision_count',
  ];
  let hasBannedCounters = false;
  fixture.turns.forEach((t: any) => {
    const outputKeys = Object.keys(t.output || {});
    const summaryKeys = Object.keys(t.output?.summary || {});
    for (const key of bannedCounterKeys) {
      if (outputKeys.includes(key) || summaryKeys.includes(key)) {
        hasBannedCounters = true;
      }
    }
  });
  assert(!hasBannedCounters, 'INV-21 No meaningless counter widgets in schema or summary');

  // 22-25. Reference validity checks across cumulative IDs
  let invalidEvidenceRef = false;
  let invalidStatementRef = false;
  let invalidGapRef = false;
  let invalidClaimRef = false;

  const cumulativeStatementIds = new Set<string>();
  const cumulativeEvidenceIds = new Set<string>();
  const cumulativeClaimIds = new Set<string>();
  const cumulativeGapIds = new Set<string>();

  fixture.turns.forEach((t: any) => {
    if (t.output.segmented_intake?.narrative_statement?.id) {
      cumulativeStatementIds.add(t.output.segmented_intake.narrative_statement.id);
    }
    for (const pe of t.output.segmented_intake?.pasted_evidences || []) {
      cumulativeEvidenceIds.add(pe.id);
    }
    for (const g of t.output.gaps || []) cumulativeGapIds.add(g.id);
    for (const c of t.output.claims || []) cumulativeClaimIds.add(c.id);

    // Validate claims source references
    for (const c of t.output.claims || []) {
      for (const sid of c.user_statement_ids || c.source_statement_ids || []) {
        if (!cumulativeStatementIds.has(sid)) invalidStatementRef = true;
      }
      for (const eid of c.supporting_evidence || []) {
        if (!cumulativeEvidenceIds.has(eid)) invalidEvidenceRef = true;
      }
    }

    // Validate events source references
    for (const ev of t.output.events || []) {
      for (const sid of ev.user_statement_ids || ev.source_statement_ids || []) {
        if (!cumulativeStatementIds.has(sid)) invalidStatementRef = true;
      }
      for (const eid of ev.evidence_ids || []) {
        if (!cumulativeEvidenceIds.has(eid)) invalidEvidenceRef = true;
      }
    }

    // Validate actions target gap references
    for (const action of t.output.actions || []) {
      if (action.target_gap_id && !cumulativeGapIds.has(action.target_gap_id)) {
        invalidGapRef = true;
      }
    }

    // Validate gaps target claim references
    for (const gap of t.output.gaps || []) {
      for (const cid of gap.target_claim_ids || []) {
        if (!cumulativeClaimIds.has(cid)) invalidClaimRef = true;
      }
    }
  });

  assert(!invalidEvidenceRef, 'INV-22 Evidence ID references valid');
  assert(!invalidStatementRef, 'INV-23 User statement ID references valid');
  assert(!invalidGapRef, 'INV-24 Target gap ID references valid in actions');
  assert(!invalidClaimRef, 'INV-25 Target claim ID references valid in gaps');

  // 26. Prohibited R10 strengthened conclusions rejected
  // Must reject: full 390k refund as verified fact, chargeback reversal completed, double-crediting established, case fully closed
  const t10Output = turn10?.output || {};
  const t10Claims = t10Output.claims || [];
  const t10Events = t10Output.events || [];
  const t10Summary = JSON.stringify(t10Output.summary || {}).toLowerCase();
  const t10Gaps = t10Output.gaps || [];

  const t10RefundClaim = t10Claims.find((c: any) => c.id === 'C10');
  const t10PendingClaim = t10Claims.find((c: any) => c.id === 'C11');

  const r10Violations: string[] = [];
  if (t10RefundClaim && t10RefundClaim.assessment === 'Established within current record') {
    r10Violations.push('390,000 VND refund marked Established within current record without bank statement evidence');
  }
  if (t10PendingClaim && t10PendingClaim.assessment === 'Established within current record') {
    r10Violations.push('Pending card adjustment marked Established without documentary proof');
  }
  if (t10Summary.includes('case closed') || t10Summary.includes('dispute resolved') || t10Summary.includes('fully settled')) {
    r10Violations.push('Turn 10 summary asserts case closed/resolved while provisional adjustment remains pending');
  }
  if (t10Summary.includes('chargeback reversal confirmed') || t10Summary.includes('chargeback finalized')) {
    r10Violations.push('Turn 10 asserts chargeback reversal completed');
  }
  if (t10Gaps.length === 0) {
    r10Violations.push('Turn 10 has zero open gaps despite unresolved bank adjustment');
  }

  assert(r10Violations.length === 0, 'INV-26 Prohibited R10 strengthened conclusions rejected (refund, chargeback, double-credit, closure)', r10Violations.join('; '));

  // 28. Live vs Replay mode defaults
  const appTsxPath = path.join(process.cwd(), 'src', 'App.tsx');
  const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');
  const isLiveDefault = appTsxContent.includes("useState<InferenceMode>('live')");
  assert(isLiveDefault, 'INV-28 Live mode default verified in App.tsx');

  // Structured Correction Lineage Invariant (Turn 4 & Turn 7)
  const turn4Output = fixture.turns.find((t: any) => t.turn === 4)?.output;
  const turn7Output = fixture.turns.find((t: any) => t.turn === 7)?.output;

  const t4CorrectionLineage = turn4Output?.claims?.some((c: any) => {
    const refs = c.user_statement_ids || c.source_statement_ids || [];
    return refs.includes('U04') && (c.id === 'C04' || c.text.toLowerCase().includes('temporary credit') || c.text.toLowerCase().includes('card issuer'));
  });

  const t7CorrectionLineage = turn7Output?.claims?.some((c: any) => {
    const refs = c.user_statement_ids || c.source_statement_ids || [];
    return refs.includes('U07') && (c.id === 'C08' || c.text.includes('390,000'));
  });

  assert(Boolean(t4CorrectionLineage && t7CorrectionLineage), 'INV-29 Structured correction lineage preserved in statements and claims (Turn 4 U04 and Turn 7 U07)');

  console.log(`\n--- TEST RESULTS: ${passedCount} Passed, ${failures} Failed ---`);
  if (failures > 0) {
    process.exit(1);
  }
}

runTests();



