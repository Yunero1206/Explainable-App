import { CanonicalCaseRecord, CanonicalStatement, CanonicalEvidence } from '../src/canonical/types.js';
import { buildAndCommitTransition } from '../src/canonical/transition.js';
import { analyzeCaseCore } from './reconstruction.js';
import { getInferenceRuntimeInfo, InferenceMode } from '../src/inferenceProvider.js';
import { GoogleGenAI } from '@google/genai';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function computeSha256(dataUrlOrText: string): string {
  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    if (dataUrlOrText.startsWith('data:')) {
      const base64Data = dataUrlOrText.split(',')[1] || '';
      hash.update(Buffer.from(base64Data, 'base64'));
    } else {
      hash.update(dataUrlOrText, 'utf8');
    }
    return hash.digest('hex');
  } catch (e) {
    return 'unhashed';
  }
}

export async function runIntakeTransition(
  priorRecord: CanonicalCaseRecord,
  intakePayload: any,
  inferenceMode: InferenceMode = 'live'
): Promise<CanonicalCaseRecord> {
  const { message = '', attachments = [], locale = 'en' } = intakePayload;
  const timestamp = new Date().toISOString();

  const ai = inferenceMode === 'live' ? getGeminiClient() : null;
  
  const existingStatements = priorRecord.statements.map(s => ({
    id: s.id,
    text: s.text,
    submitted_at: s.submitted_at,
    attachment_ids: []
  }));

  const existingEvidence = priorRecord.evidence.map(e => ({
    id: e.id,
    label: e.label,
    claimed_source: 'Unspecified',
    acquisition_method: 'user_upload',
    input_form: e.input_form,
    evidence_time: null,
    received_at: e.submitted_at,
    subject_object_ids: [],
    content: 'Retrieved from canonical record',
    file_name: e.label,
    file_type: e.mime_type,
    file_data_url: undefined
  }));

  const newEvidenceItems = attachments.map((att: any, idx: number) => {
    return {
      label: att.name || `Uploaded Artifact`,
      claimed_source: 'Unspecified Source',
      acquisition_method: 'user_upload',
      input_form: att.type?.startsWith('image/') ? 'screenshot' : att.type === 'application/pdf' ? 'pdf' : 'document',
      mime_type: att.type,
      byte_size: att.size,
      storage_key: att.id || `temp-storage-key-${Date.now()}-${idx}`,
      content: att.extractedText || `Attached file artifact: ${att.name}`,
      file_data_url: att.dataUrl
    };
  });

  const currentCombinedEvidence = [...existingEvidence, ...newEvidenceItems.map((ne, i) => ({
    id: `E_TEMP_${i}`,
    ...ne
  }))];

  const oldRev = priorRecord.revisions.find(r => r.revision_id === priorRecord.current_revision_id);
  const objective = oldRev?.objective || '';

  const { reconstructionOutput, deterministicSummary, usedModelId } = await analyzeCaseCore(
    objective,
    existingStatements,
    currentCombinedEvidence,
    attachments.map((att: any, idx: number) => ({ ...att, evidence_id: `E_TEMP_${idx}` })),
    ai,
    newEvidenceItems.map((_, i) => `E_TEMP_${i}`),
    message.trim(),
    'U_TEMP_0',
    'E_TEMP_PASTED_0',
    locale,
    inferenceMode
  );

  const newStatementsInputs: Omit<CanonicalStatement, 'id' | 'source_intake_id'>[] = [];
  const newEvidenceInputs: Omit<CanonicalEvidence, 'id' | 'source_intake_id'>[] = [...newEvidenceItems.map(ne => ({
    label: ne.label,
    origin_type: 'file',
    input_form: ne.input_form,
    mime_type: ne.mime_type,
    byte_size: ne.byte_size,
    storage_key: ne.storage_key,
    submitted_at: timestamp
  }))];

  const segmented = reconstructionOutput.segmented_intake;
  if (segmented) {
    if (segmented.narrative_statement) {
      newStatementsInputs.push({ text: segmented.narrative_statement.text, submitted_at: timestamp });
    }
    if (Array.isArray(segmented.pasted_evidences)) {
      segmented.pasted_evidences.forEach((pe: any) => {
        newEvidenceInputs.push({
          label: pe.label || 'Pasted Evidence',
          origin_type: 'pasted_text',
          input_form: 'document',
          mime_type: 'text/plain',
          byte_size: pe.content?.length || 0,
          submitted_at: timestamp
        });
      });
    }
  } else if (message.trim()) {
    newStatementsInputs.push({ text: message.trim(), submitted_at: timestamp });
  }

  const newRecord = buildAndCommitTransition({
    priorRecord,
    reconstructionOutput,
    newStatements: newStatementsInputs,
    newEvidence: newEvidenceInputs,
    timestamp,
    modelId: usedModelId || getInferenceRuntimeInfo(inferenceMode).model_id
  });

  return newRecord;
}
