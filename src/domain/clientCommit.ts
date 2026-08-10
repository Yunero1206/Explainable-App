import { CanonicalCaseRecord } from '../canonical/types.js';
import { parseCanonicalRecord } from '../canonical/boundary.js';

/**
 * Pure client module for atomic validation and commit of an intake response.
 *
 * Accepts `unknown` input. Validates:
 * 1. Response envelope has { success: true, case: {...} }
 * 2. The case parses as a complete valid canonical record
 * 3. Exactly one prior record matches the requested case ID
 * 4. The returned record's case ID matches the requested case ID
 *
 * @param priorCollection The current collection of CanonicalCaseRecords in state.
 * @param rawResponse The unparsed response body from the server (unknown).
 * @param replacingCaseId The ID of the case that was submitted.
 * @returns A new array of CanonicalCaseRecord objects safely replacing the old record.
 * @throws If validation fails, case ID mismatches, or target not found / duplicated.
 */
export function commitIntakeResponse(
  priorCollection: CanonicalCaseRecord[],
  rawResponse: unknown,
  replacingCaseId: string
): CanonicalCaseRecord[] {
  // 1. Validate response is an object
  if (typeof rawResponse !== 'object' || rawResponse === null) {
    throw new Error('Invalid response format: expected an object.');
  }

  const envelope = rawResponse as Record<string, unknown>;

  // 2. Validate response envelope
  if (envelope.success !== true) {
    throw new Error('Response did not indicate success.');
  }
  if (typeof envelope.case !== 'object' || envelope.case === null) {
    throw new Error('Response missing case data.');
  }

  // 3. Deep parse and validate the returned canonical record
  const validatedRecord = parseCanonicalRecord(envelope.case);

  // 4. Verify returned case ID matches what we requested
  if (validatedRecord.id !== replacingCaseId) {
    throw new Error(
      `Response case ID '${validatedRecord.id}' does not match the requested case ID '${replacingCaseId}'.`
    );
  }

  // 5. Verify exactly one prior record matches the requested case ID
  const matchCount = priorCollection.filter(c => c.id === replacingCaseId).length;
  if (matchCount === 0) {
    throw new Error(
      `No existing record found for case ID '${replacingCaseId}'. Cannot replace a missing target.`
    );
  }
  if (matchCount > 1) {
    throw new Error(
      `Multiple records found for case ID '${replacingCaseId}'. Collection has duplicate targets.`
    );
  }

  // 6. Atomically replace the case in the collection
  const newCollection = priorCollection.map(c =>
    c.id === replacingCaseId ? validatedRecord : c
  );

  return newCollection;
}
