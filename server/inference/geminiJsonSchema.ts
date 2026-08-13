const UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  '$schema',
  'pattern',
  'minLength',
  'maxLength',
]);

function sanitizeSchemaNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeSchemaNode);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const source = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    if (key === 'const' || UNSUPPORTED_SCHEMA_KEYWORDS.has(key)) continue;

    if (key === 'properties' || key === '$defs') {
      const entries = typeof child === 'object' && child !== null && !Array.isArray(child)
        ? Object.entries(child as Record<string, unknown>)
        : [];
      sanitized[key] = Object.fromEntries(entries.map(([name, schema]) => [name, sanitizeSchemaNode(schema)]));
      continue;
    }

    sanitized[key] = sanitizeSchemaNode(child);
  }

  if (Object.prototype.hasOwnProperty.call(source, 'const')) {
    sanitized.enum = [source.const];
  }
  return sanitized;
}

/**
 * Converts Zod-produced JSON Schema to the subset accepted by Gemini's
 * responseJsonSchema field. Runtime Zod parsing remains the authoritative
 * validator, so removing generation-only constraints does not relax the
 * acceptance boundary.
 */
export function sanitizeGeminiResponseJsonSchema(schema: unknown): unknown {
  return sanitizeSchemaNode(schema);
}
