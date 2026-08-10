import quickbiteFixture from '../dev/fixtures/quickbite.replay.json';

export type InferenceMode = 'live' | 'replay';

export interface InferenceRuntimeInfo {
  mode: InferenceMode;
  model_id: string;
}

export function getInferenceRuntimeInfo(mode: InferenceMode): InferenceRuntimeInfo {
  if (mode === 'replay') {
    return {
      mode: 'replay',
      model_id: 'replay-fixture-quickbite',
    };
  }
  return {
    mode: 'live',
    model_id: 'gemini-3.6-flash',
  };
}

export async function runReconstructionProvider(
  mode: InferenceMode,
  promptParts: any[],
  systemInstruction: string,
  ai: any,
  intakeMessage: string,
  existingStatementsCount: number = 0
): Promise<{ text: string; modelId: string }> {
  const runtimeInfo = getInferenceRuntimeInfo(mode);

  if (mode === 'replay') {
    const fixtureObj = quickbiteFixture as { turns?: { input_match?: string; output?: unknown }[] };
    const turns = Array.isArray(fixtureObj.turns) ? fixtureObj.turns : [];

    const normalizeText = (str: string): string => {
      return (str || '')
        .trim()
        .toLowerCase()
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, ' ');
    };

    const normMsg = normalizeText(intakeMessage);

    let matchedTurnIndex = existingStatementsCount;
    if (
      matchedTurnIndex < 0 ||
      matchedTurnIndex >= turns.length ||
      normalizeText(turns[matchedTurnIndex]?.input_match) !== normMsg
    ) {
      // Search for turn index matching input_match
      const foundIdx = turns.findIndex((t: any) => normalizeText(t.input_match) === normMsg);
      if (foundIdx !== -1) {
        matchedTurnIndex = foundIdx;
      }
    }

    if (matchedTurnIndex < 0 || matchedTurnIndex >= turns.length) {
      const err: any = new Error(
        `Replay sequence complete or out of bounds. No Gemini request was made.`
      );
      err.stage = 'REPLAY_MISMATCH';
      throw err;
    }

    const expectedTurn = turns[matchedTurnIndex];
    const expectedMsg = normalizeText(expectedTurn.input_match);

    if (normMsg !== expectedMsg) {
      console.warn(`[REPLAY_MISMATCH] Turn ${matchedTurnIndex + 1} expected "${expectedTurn.input_match}" but got "${intakeMessage}"`);
      const err: any = new Error(
        `Replay mismatch on turn ${matchedTurnIndex + 1}: Expected "${expectedTurn.input_match}", but received "${intakeMessage}". No Gemini request was made.`
      );
      err.stage = 'REPLAY_MISMATCH';
      throw err;
    }

    return {
      text: JSON.stringify(expectedTurn.output, null, 2),
      modelId: runtimeInfo.model_id,
    };
  }

  // Live Mode: call Gemini API
  if (!ai) {
    const err: any = new Error('Gemini API client not initialized (missing GEMINI_API_KEY).');
    err.stage = 'ANALYSIS_FAILED';
    throw err;
  }

  const { z } = await import('zod');
  const { CaseReconstructionOutputSchema } = await import('./schema.js');
  const jsonSchema = z.toJSONSchema(CaseReconstructionOutputSchema);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: { parts: promptParts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
      },
    });

    if (!response || !response.text) {
      throw new Error('Gemini returned empty response.');
    }

    return {
      text: response.text,
      modelId: runtimeInfo.model_id,
    };
  } catch (apiErr: any) {
    console.error('[ANALYSIS_FAILED] Gemini generateContent error:', apiErr?.message || apiErr);
    const err: any = new Error(`Gemini API call failed: ${apiErr?.message || 'API error'}`);
    err.stage = 'ANALYSIS_FAILED';
    throw err;
  }
}
