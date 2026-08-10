import express from 'express';
import { analyzeCaseCore } from './server/reconstruction.js';
import { reconcileNextRevision } from './src/domain/reconcile.js';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { z } from 'zod';
import {
  CaseReconstructionOutputSchema,
  validateReconstructionInvariants,
  CaseReconstructionOutput,
} from './src/schema.js';
import {
  runReconstructionProvider,
  getInferenceRuntimeInfo,
  InferenceMode,
} from './src/inferenceProvider.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Helper to determine request-scoped inference mode with production safety
function getRequestInferenceMode(req: express.Request): InferenceMode {
  const isProd = process.env.NODE_ENV === 'production';
  const headerMode = (req.headers['x-et-dev-inference-mode'] as string)?.toLowerCase();
  const bodyMode = req.body?.dev_inference_mode?.toLowerCase();
  const requestedMode = headerMode || bodyMode || 'live';

  if (isProd && requestedMode === 'replay') {
    console.warn('[SECURITY] Forged Replay mode request rejected in production environment.');
    const err: any = new Error('Replay mode is not available in production environment.');
    err.stage = 'FORGED_REPLAY_REJECTED';
    throw err;
  }

  return requestedMode === 'replay' ? 'replay' : 'live';
}

// Increase payload limit for image/PDF uploads
app.use(express.json({ limit: '20mb' }));

// Lazy init for Gemini API
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to compute SHA-256 hash for raw file data
function computeSha256(dataUrlOrText: string): string {
  try {
    const hash = crypto.createHash('sha256');
    if (dataUrlOrText.startsWith('data:')) {
      const base64Data = dataUrlOrText.split(',')[1] || '';
      const buffer = Buffer.from(base64Data, 'base64');
      hash.update(buffer);
    } else {
      hash.update(dataUrlOrText, 'utf8');
    }
    return hash.digest('hex');
  } catch (e) {
    return 'unhashed';
  }
}

// Helper to safely merge original evidence with AI inspection results
function mergeEvidenceInspection(originalEvidence: any[], inspectionList: any[]) {
  const inspectionMap = new Map(
    (inspectionList ?? []).map((item: any) => [item.id, item])
  );

  return (originalEvidence ?? []).map((original: any) => {
    const inspection = inspectionMap.get(original.id) ?? {};

    const originalLabel = original.label || '';
    const hasPlaceholderLabel = !originalLabel || originalLabel.startsWith('Uploaded Artifact') || originalLabel.startsWith('Evidence E');
    const label = hasPlaceholderLabel ? (inspection.label || originalLabel || `Evidence ${original.id}`) : originalLabel;

    const originalClaimed = original.claimed_source || '';
    const hasUnspecifiedSource = !originalClaimed || originalClaimed === 'Unspecified Source';
    const claimed_source = hasUnspecifiedSource ? (inspection.claimed_source || originalClaimed || 'Unspecified Source') : originalClaimed;

    const originalContent = original.content || '';
    const rawContent = originalContent || 'Provided artifact without extracted text.';
    const contentSummary = inspection.content_summary?.trim() || original.content_summary || null;

    return {
      ...original,
      ...inspection,

      // Immutable raw source fields always preserved
      id: original.id,
      label,
      claimed_source,
      acquisition_method: original.acquisition_method || 'user_upload',
      input_form: original.input_form || 'document',
      content: rawContent,
      content_summary: contentSummary,
      received_at: original.received_at || new Date().toISOString().split('T')[0],
      raw_submission: original.raw_submission,
      file_data_url: original.file_data_url,
      file_name: original.file_name,
      file_type: original.file_type,

      evidence_time: inspection.evidence_time ?? original.evidence_time ?? null,
      subject_object_ids: inspection.subject_object_ids ?? original.subject_object_ids ?? [],
      source_attribution:
        inspection.source_attribution ||
        `Claimed source: ${claimed_source}. Supplied by user.`,
      case_object_match: inspection.case_object_match || 'Subject identity not independently verified.',
      case_object_match_status: inspection.case_object_match_status || 'not_assessed',
      completeness_context: inspection.completeness_context || 'Submitted artifact evaluated as provided.',
      integrity_signals:
        inspection.integrity_signals ||
        'User-submitted item. Original-source authenticity not independently verified.',
      corroborated_by: inspection.corroborated_by ?? original.corroborated_by ?? [],
      qualified_by: inspection.qualified_by ?? original.qualified_by ?? [],
      conflicted_by: inspection.conflicted_by ?? original.conflicted_by ?? [],
      limitations: inspection.limitations?.length
        ? inspection.limitations
        : original.limitations?.length
        ? original.limitations
        : [
            `Claimed source: ${claimed_source} · Supplied by user · Original-source authenticity not independently verified.`,
          ],
    };
  });
}// API Route for Conversational Case Intake & Atomic Reconstruction
app.post('/api/intake', async (req, res) => {
  console.log('INTAKE_RECEIVED');
  try {
    const inferenceMode = getRequestInferenceMode(req);
    const {
      message = '',
      attachments = [],
      existing_statements = [],
      existing_evidence = [],
      existing_objective = '',
      existing_revisions = [],
      locale = 'en',
    } = req.body;

    if (!message.trim() && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Please provide a text message or attach files.' });
    }

    const ai = inferenceMode === 'live' ? getGeminiClient() : null;

    // Step 1: Assign deterministic IDs for new file uploads first
    const turnTimestamp = new Date().toISOString();
    const startEvIdx = existing_evidence.length;
    const newAttachmentIds: string[] = [];
    const fileEvidenceItems: any[] = [];

    attachments.forEach((att: any, idx: number) => {
      const itemNum = startEvIdx + idx + 1;
      const evId = `E${itemNum < 10 ? '0' : ''}${itemNum}`;
      const attId = att.id || `att-${Date.now()}-${idx}`;
      newAttachmentIds.push(evId);

      const isImage = att.type?.startsWith('image/');
      const isPdf = att.type === 'application/pdf';
      const sha256 = att.sha256_hash || computeSha256(att.dataUrl || att.extractedText || att.name);

      fileEvidenceItems.push({
        id: evId,
        label: att.name || `Uploaded Artifact ${itemNum}`,
        claimed_source: 'Unspecified Source',
        acquisition_method: 'user_upload',
        input_form: isImage ? 'screenshot' : isPdf ? 'pdf' : 'document',
        evidence_time: null,
        received_at: turnTimestamp.split('T')[0],
        subject_object_ids: [],
        content: att.extractedText || `Attached file artifact: ${att.name}`,
        file_name: att.name,
        file_type: att.type,
        file_data_url: att.dataUrl,
        raw_submission: {
          attachment_id: attId,
          acquisition_method: 'user_upload',
          received_at: turnTimestamp,
          file_name: att.name,
          file_type: att.type,
          byte_size: att.size,
          sha256_hash: sha256,
          raw_preserved_state: att.dataUrl ? 'preserved_bytes' : 'extracted_text_only',
        },
        source_attribution: `Supplied by user as file upload (${att.name}). Claimed source unspecified.`,
        case_object_match: 'Subject identity not independently verified.',
        case_object_match_status: 'not_assessed',
        completeness_context: 'Submitted artifact evaluated as provided.',
        integrity_signals: 'File received and fixity hash calculated. Original-source authenticity unverified.',
        limitations: [
          `Supplied by user · File fixity hash: ${sha256.slice(0, 12)}... · Original-source authenticity not independently verified.`
        ],
      });
    });

    // Compute next IDs for narrative statement and pasted text evidence
    const nextStatementId = `U${(existing_statements.length + 1).toString().padStart(2, '0')}`;
    const nextEvidenceId = `E${(startEvIdx + attachments.length + 1).toString().padStart(2, '0')}`;

    // Combine current evidence so far (existing + new files)
    const currentCombinedEvidence = [...existing_evidence, ...fileEvidenceItems];

    // Infer or preserve objective
    let objective = existing_objective;
    if (!objective || objective === 'Customer or operational dispute intake') {
      objective = message.trim().length > 60
        ? `${message.trim().substring(0, 60)}...`
        : message.trim() || 'Dispute and Case Reconstruction';
    }

    // Step 2: Call Gemini or Replay Provider for Single Full-Case Reconstruction
    const { reconstructionOutput, deterministicSummary, usedModelId } = await analyzeCaseCore(
      objective,
      existing_statements,
      currentCombinedEvidence,
      attachments.map((att: any, idx: number) => {
        const itemNum = startEvIdx + idx + 1;
        const evId = `E${itemNum < 10 ? '0' : ''}${itemNum}`;
        return { ...att, evidence_id: evId };
      }),
      ai,
      fileEvidenceItems.map((item) => item.id),
      message.trim(),
      nextStatementId,
      nextEvidenceId,
      locale,
      inferenceMode
    );

    // Step 3: Segment the intake message and ingest parsed records
    let updatedStatements = [...existing_statements];
    let finalNewEvidenceItems = [...fileEvidenceItems];

    const segmented = reconstructionOutput.segmented_intake;
    if (segmented) {
      if (segmented.narrative_statement) {
        updatedStatements.push({
          id: segmented.narrative_statement.id,
          text: segmented.narrative_statement.text,
          submitted_at: turnTimestamp,
          attachment_ids: [
            ...fileEvidenceItems.map((e) => e.id),
            ...(segmented.pasted_evidences || []).map((pe: any) => pe.id),
          ],
        });
      }
      if (Array.isArray(segmented.pasted_evidences)) {
        segmented.pasted_evidences.forEach((pe: any) => {
          finalNewEvidenceItems.push({
            id: pe.id,
            label: pe.label || `Pasted Evidence ${pe.id}`,
            claimed_source: pe.claimed_source || 'Unspecified Source',
            acquisition_method: 'pasted_text',
            input_form: 'document',
            evidence_time: pe.evidence_time || null,
            received_at: turnTimestamp.split('T')[0],
            subject_object_ids: [],
            content: pe.content,
            file_name: null,
            file_type: 'text/plain',
            file_data_url: null,
            raw_submission: {
              acquisition_method: 'pasted_text',
              received_at: turnTimestamp,
              file_name: 'Pasted Text',
              file_type: 'text/plain',
              byte_size: pe.content.length,
              sha256_hash: computeSha256(pe.content),
              raw_preserved_state: 'extracted_text_only',
            },
            source_attribution: `Pasted by user in chat. Claimed source: ${pe.claimed_source || 'Unspecified'}.`,
            case_object_match: 'Subject identity not independently verified.',
            case_object_match_status: 'not_assessed',
            completeness_context: 'Submitted artifact evaluated as provided.',
            integrity_signals: 'Text pasted directly in chat. Original-source authenticity unverified.',
            limitations: [
              `Pasted by user · Original-source authenticity not independently verified.`
            ],
          });
        });
      }
    } else if (message.trim()) {
      // Fallback
      updatedStatements.push({
        id: nextStatementId,
        text: message.trim(),
        submitted_at: turnTimestamp,
        attachment_ids: fileEvidenceItems.map((e) => e.id),
      });
    }

    // Merge dispositions
    const dispositionsMap = new Map((reconstructionOutput.input_dispositions || []).map((d: any) => [d.id, d]));
    
    updatedStatements = updatedStatements.map(s => {
      const disp = dispositionsMap.get(s.id);
      if (disp) {
        return { ...s, disposition: disp.disposition, disposition_reason: disp.reason, corrects_statement_ids: disp.disposition === 'corrects_statement' ? disp.related_object_ids : [] };
      }
      return s;
    });

    // Compile dynamic user_story from immutable statement history
    const compiledUserStory = updatedStatements
      .map((s) => `[${s.id} - ${s.submitted_at.split('T')[0]}]: ${s.text}`)
      .join('\n\n');

    const allEvidence = [...existing_evidence, ...finalNewEvidenceItems];

    // Merge AI inspections onto evidence items
    const mergedEvidence = mergeEvidenceInspection(
      allEvidence,
      reconstructionOutput.evidence_inspection
    ).map((e: any) => {
      const disp = dispositionsMap.get(e.id);
      if (disp) {
        return { ...e, disposition: disp.disposition, disposition_reason: disp.reason };
      }
      return e;
    });

    // Create new immutable CaseRevision
    const newRevision = reconcileNextRevision({
      existingRevisions: existing_revisions,
      reconstructionOutput,
      updatedStatements,
      mergedEvidence,
      turnTimestamp,
      deterministicSummary,
      usedModelId,
      inferenceModeModelId: getInferenceRuntimeInfo(inferenceMode).model_id,
    });


    const updatedRevisions = [...existing_revisions, newRevision];

    const fullCase = {
      id: req.body.case_id || `case-${Date.now().toString().slice(-4)}`,
      case_number: req.body.case_number || 'C-0001',
      title: objective,
      objective: objective,
      user_story: compiledUserStory,
      statements: updatedStatements,
      evidence: mergedEvidence,
      current_revision_id: newRevision.revision_id,
      revisions: updatedRevisions,
      events: reconstructionOutput.events,
      claims: reconstructionOutput.claims,
      gaps: reconstructionOutput.gaps,
      actions: reconstructionOutput.actions,
      summary: deterministicSummary,
    };

    console.log('REVISION_COMMITTED');
    console.log(`statements: ${fullCase.statements.length}`);
    console.log(`evidence: ${fullCase.evidence.length}`);
    console.log(`events: ${fullCase.events.length}`);
    console.log(`claims: ${fullCase.claims.length}`);
    console.log(`gaps: ${fullCase.gaps.length}`);
    console.log(`actions: ${fullCase.actions.length}`);
    console.log(`revisions: ${fullCase.revisions.length}`);

    return res.json({
      success: true,
      case: fullCase,
      revision: newRevision,
    });
  } catch (error: any) {
    const stage = error.stage || 'REQUEST_FAILED';
    console.error(`Error in /api/intake [${stage}]:`, error);
    const statusCode = stage === 'REPLAY_MISMATCH' ? 400 : 500;
    return res.status(statusCode).json({
      error: 'RECONSTRUCTION_FAILED',
      stage,
      message: error.message || 'Intake processing failed.',
    });
  }
});

// API Route for Representational-Only Localization of Case Record (No new CaseRevision!)
app.post('/api/translate-case', async (req, res) => {
  console.log('TRANSLATE_RECEIVED');
  try {
    const inferenceMode = getRequestInferenceMode(req);
    const {
      events = [],
      claims = [],
      gaps = [],
      actions = [],
      title = '',
      objective = '',
      summary = {},
      locale = 'en',
    } = req.body;

    if (inferenceMode === 'replay') {
      console.log('TRANSLATE_SKIPPED_FOR_REPLAY');
      return res.json({
        success: true,
        title,
        objective,
        events,
        claims,
        gaps,
        actions,
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini client not initialized.' });
    }

    const systemInstruction = `
You are a highly professional translation assistant.
Your task is to translate the human-prose descriptions of the provided case record into the target language: "${locale}".
You MUST preserve all IDs (e.g. EV01, C01, G01, A01, U01, E01, etc.), all numeric values, enums, dates, and non-prose keys.
Do NOT change the logical structure, assessments, causal relationships, priority values, or IDs.
Only translate the human-prose descriptions.
Keep original quotes, raw evidence titles, raw statements, code snippets, or brand names as-is if they are technical or reference original sources.
Return the output as strict JSON matching the requested schema.
`;

    const promptText = `
Translate the following case elements to "${locale}":

TITLE:
${title}

OBJECTIVE:
${objective}

EVENTS (Translate 'action' and 'effect' fields only):
${JSON.stringify(events, null, 2)}

CLAIMS (Translate 'text', 'reasoning', and 'limits' fields only):
${JSON.stringify(claims, null, 2)}

GAPS (Translate 'what_is_unknown', 'why_it_matters', 'what_evidence_could_resolve_it', 'where_how_to_obtain', and 'what_not_to_over_collect' fields only):
${JSON.stringify(gaps, null, 2)}

ACTIONS (Translate 'title' and 'description' fields only):
${JSON.stringify(actions, null, 2)}
`;

    const TranslationOutputSchema = z.object({
      title: z.string(),
      objective: z.string(),
      events: z.array(z.object({
        id: z.string(),
        action: z.string(),
        effect: z.string(),
      })),
      claims: z.array(z.object({
        id: z.string(),
        text: z.string(),
        reasoning: z.string(),
        limits: z.array(z.string()),
      })),
      gaps: z.array(z.object({
        id: z.string(),
        what_is_unknown: z.string(),
        why_it_matters: z.string(),
        what_evidence_could_resolve_it: z.string(),
        where_how_to_obtain: z.string(),
        what_not_to_over_collect: z.string(),
      })),
      actions: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
      })),
    });

    const jsonSchema = z.toJSONSchema(TranslationOutputSchema);

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
      },
    });

    if (!response || !response.text) {
      throw new Error('Empty response from translation model.');
    }

    const translatedData = JSON.parse(response.text.trim());

    // Map translations back onto original elements to ensure no fields are lost
    const translatedEvents = events.map((orig: any) => {
      const match = translatedData.events?.find((t: any) => t.id === orig.id);
      return match ? { ...orig, action: match.action, effect: match.effect } : orig;
    });

    const translatedClaims = claims.map((orig: any) => {
      const match = translatedData.claims?.find((t: any) => t.id === orig.id);
      return match ? { ...orig, text: match.text, reasoning: match.reasoning, limits: match.limits } : orig;
    });

    const translatedGaps = gaps.map((orig: any) => {
      const match = translatedData.gaps?.find((t: any) => t.id === orig.id);
      return match ? {
        ...orig,
        what_is_unknown: match.what_is_unknown,
        why_it_matters: match.why_it_matters,
        what_evidence_could_resolve_it: match.what_evidence_could_resolve_it,
        where_how_to_obtain: match.where_how_to_obtain,
        what_not_to_over_collect: match.what_not_to_over_collect,
      } : orig;
    });

    const translatedActions = actions.map((orig: any) => {
      const match = translatedData.actions?.find((t: any) => t.id === orig.id);
      return match ? { ...orig, title: match.title, description: match.description } : orig;
    });

    return res.json({
      success: true,
      title: translatedData.title || title,
      objective: translatedData.objective || objective,
      events: translatedEvents,
      claims: translatedClaims,
      gaps: translatedGaps,
      actions: translatedActions,
    });
  } catch (error: any) {
    console.warn('Translation failed or quota exceeded, falling back to original presentation:', error.message);
    const {
      events = [],
      claims = [],
      gaps = [],
      actions = [],
      title = '',
      objective = '',
    } = req.body;
    return res.json({
      success: true,
      title,
      objective,
      events,
      claims,
      gaps,
      actions,
    });
  }
});