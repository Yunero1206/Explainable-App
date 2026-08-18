/**
 * Cleans Markdown code blocks and trims whitespace before parsing JSON.
 * Throws a descriptive Error if the string is not valid JSON.
 */
export function cleanAndParseJson<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  
  if (cleaned.length === 0) {
    throw new Error('Received empty string, expected JSON content.');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid JSON syntax.';
    const snippet = cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
    throw new Error(`Failed to parse JSON (${message}). Input snippet: ${snippet}`);
  }
}
