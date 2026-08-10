import { CanonicalCaseRecord, CanonicalStatement, CanonicalEvidence } from '../src/canonical/types.js';
import { buildAndCommitTransition } from '../src/canonical/transition.js';
import { analyzeCaseCore } from './reconstruction.js';
import { getInferenceRuntimeInfo, InferenceMode } from '../src/inferenceProvider.js';
import { GoogleGenAI } from '@google/genai';

interface IntakePayload {
  message?: string;
  attachments?: unknown[];
  locale?: string;
  dev_inference_mode?: string;
}

interface AttachmentInput {
  name?: string;
  type?: string;
  size?: number;
  id?: string;
  dataUrl?: string;
  extractedText?: string;
}

function narrowAttachment(raw: unknown): AttachmentInput {
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;
  return {
    name: typeof obj.name === 'string' ? obj.name : undefined,
    type: typeof obj.type === 'string' ? obj.type : undefined,
    size: typeof obj.size === 'number' ? obj.size : undefined,
    id: typeof obj.id === 'string' ? obj.id : undefined,
    dataUrl: typeof obj.dataUrl === 'string' ? obj.dataUrl : undefined,
    extractedText: typeof obj.extractedText === 'string' ? obj.extractedText : undefined,
  };
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

export async function runIntakeTransition(
  priorRecord: CanonicalCaseRecord,
  intakePayload: IntakePayload,
  inferenceMode: InferenceMode = 'live'
): Promise<CanonicalCaseRecord> {
  const { message = '', locale = 'en' } = intakePayload;
  const rawAttachments = Array.isArray(intakePayload.attachments) ? intakePayload.attachments : [];
  const attachments = rawAttachments.map(narrowAttachment);
  const timestamp = new Date().toISOString();

  const ai = inferenceMode === 'live' ? getGeminiClient() : null;
  
  const existingStatements = priorRecord.statements.map(s => ({
    id: s.id,
    text: s.text,
    submitted_at: s.submitted_at,
    attachment_ids: [] as string[],
  }));

  const existingEvidence = priorRecord.evidence.map(e => ({
    id: e.id,
    label: e.label,
    claimed_source: 'Unspecified',
    acquisition_method: 'user_upload',
    input_form: e.input_form,
    evidence_time: null,
    received_at: e.submitted_at,
    subject_object_ids: [] as string[],
    content: 'Retrieved from canonical record',
    file_name: e.label,
    file_type: e.mime_type,
    file_data_url: undefined as string | undefined,
  }));

  // Build new evidence items with tracked temporary IDs
  const evidenceTempIds: string[] = [];
  const newEvidenceItems = attachments.map((att, idx) => {
    const tempId = `E_TEMP_${idx}`;
    evidenceTempIds.push(tempId);
    const inputForm = att.type?.startsWith('image/') ? 'screenshot'
      : att.type === 'application/pdf' ? 'pdf'
      : 'document';
    return {
      label: att.name || 'Uploaded Artifact',
      claimed_source: 'Unspecified Source',
      acquisition_method: 'user_upload',
      input_form: inputForm,
      mime_type: att.type,
      byte_size: att.size,
      storage_key: att.id || `temp-storage-key-${Date.now()}-${idx}`,
      content: att.extractedText || `Attached file artifact: ${att.name || 'unknown'}`,
      file_data_url: att.dataUrl,
    };
  });

  const currentCombinedEvidence = [...existingEvidence, ...newEvidenceItems.map((ne, i) => ({
    id: `E_TEMP_${i}`,
    ...ne,
  }))];

  const oldRev = priorRecord.revisions.find(r => r.revision_id === priorRecord.current_revision_id);
  const objective = oldRev?.objective || '';

  // Track the temporary statement ID
  const statementTempId = 'U_TEMP_0';
  const pastedEvidenceTempId = 'E_TEMP_PASTED_0';

  const { reconstructionOutput, deterministicSummary, usedModelId } = await analyzeCaseCore(
    objective,
    existingStatements,
    currentCombinedEvidence,
    attachments.map((att, idx) => ({ ...att, evidence_id: `E_TEMP_${idx}` })),
    ai,
    newEvidenceItems.map((_, i) => `E_TEMP_${i}`),
    message.trim(),
    statementTempId,
    pastedEvidenceTempId,
    locale,
    inferenceMode
  );

  // Build the list of new statements and evidence for transition
  const newStatementsInputs: Omit<CanonicalStatement, 'id' | 'source_intake_id'>[] = [];
  const newEvidenceInputs: Omit<CanonicalEvidence, 'id' | 'source_intake_id'>[] = [
    ...newEvidenceItems.map(ne => ({
      label: ne.label,
      origin_type: 'file' as string,
      input_form: ne.input_form,
      mime_type: ne.mime_type,
      byte_size: ne.byte_size,
      storage_key: ne.storage_key,
      submitted_at: timestamp,
    })),
  ];

  // Track all temporary IDs for the remap table
  const statementTempIds: string[] = [];
  const allEvidenceTempIds = [...evidenceTempIds];

  const segmented = reconstructionOutput.segmented_intake;
  if (segmented) {
    if (segmented.narrative_statement) {
      newStatementsInputs.push({ text: segmented.narrative_statement.text, submitted_at: timestamp });
      statementTempIds.push(statementTempId);
    }
    if (Array.isArray(segmented.pasted_evidences)) {
      segmented.pasted_evidences.forEach((pe) => {
        newEvidenceInputs.push({
          label: pe.label || 'Pasted Evidence',
          origin_type: 'pasted_text',
          input_form: 'document',
          mime_type: 'text/plain',
          byte_size: pe.content?.length || 0,
          submitted_at: timestamp,
        });
        allEvidenceTempIds.push(pe.id || pastedEvidenceTempId);
      });
    }
  } else if (message.trim()) {
    newStatementsInputs.push({ text: message.trim(), submitted_at: timestamp });
    statementTempIds.push(statementTempId);
  }

  const newRecord = buildAndCommitTransition({
    priorRecord,
    reconstructionOutput,
    newStatements: newStatementsInputs,
    newEvidence: newEvidenceInputs,
    timestamp,
    modelId: usedModelId || getInferenceRuntimeInfo(inferenceMode).model_id,
    tempIdRemap: {
      statementTempIds,
      evidenceTempIds: allEvidenceTempIds,
    },
  });

  return newRecord;
}
