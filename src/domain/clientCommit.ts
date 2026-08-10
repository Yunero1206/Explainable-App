import { CanonicalCaseRecord } from '../canonical/types.js';
import { parseCanonicalRecord } from '../canonical/boundary.js';

/**
 * Pure client module for atomic validation and commit of an intake response.
 *
 * @param priorCollection The current collection of CanonicalCaseRecords in state.
 * @param rawResponse The unparsed response body from the server.
 * @param replacingCaseId The ID of the case that was submitted.
 * @returns A new array of CanonicalCaseRecord objects safely replacing the old record.
 * @throws If validation fails or the case ID mismatches.
 */
export function commitIntakeResponse(
  priorCollection: CanonicalCaseRecord[],
  rawResponse: any,
  replacingCaseId: string
): CanonicalCaseRecord[] {
  if (!rawResponse || typeof rawResponse !== 'object') {
    throw new Error('Invalid response format: expected an object.');
  }

  if (!rawResponse.success || !rawResponse.case) {
    throw new Error('Response did not indicate success or missing case data.');
  }

  // Deep parse and validate the returned canonical record
  const validatedRecord = parseCanonicalRecord(rawResponse.case);

  if (validatedRecord.id !== replacingCaseId) {
    throw new Error(`Response case ID '${validatedRecord.id}' does not match the requested case ID '${replacingCaseId}'.`);
  }

  // Atomically replace the case in the collection
  const newCollection = priorCollection.map(c => 
    c.id === replacingCaseId ? validatedRecord : c
  );

  return newCollection;
}
