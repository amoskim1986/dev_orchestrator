/**
 * Response parser for Claude CLI output
 * Handles JSON extraction from various output formats
 */

export interface ParseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Parse Claude CLI response, attempting to extract JSON if expected
 */
export function parseClaudeResponse<T = unknown>(
  raw: string,
  expectJson: boolean
): ParseResult<T> {
  const trimmed = raw.trim();

  if (!expectJson) {
    return {
      success: true,
      data: trimmed as T,
    };
  }

  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(trimmed);
    return { success: true, data: parsed };
  } catch {
    // Continue to extraction attempts
  }

  // Try extracting from markdown code fences
  const extracted = extractJsonFromMarkdown(trimmed);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted);
      return { success: true, data: parsed };
    } catch {
      // Continue to other methods
    }
  }

  // Try finding JSON object/array boundaries
  const bounded = extractJsonByBrackets(trimmed);
  if (bounded) {
    try {
      const parsed = JSON.parse(bounded);
      return { success: true, data: parsed };
    } catch {
      // Final fallback
    }
  }

  // Return raw as fallback
  return {
    success: false,
    data: trimmed as T,
    error: 'Failed to parse response as JSON',
  };
}

/**
 * Extract JSON from markdown code fences
 * Handles ```json, ```, or just plain fences
 */
function extractJsonFromMarkdown(text: string): string | null {
  // Try ```json ... ``` first
  const jsonFenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonFenceMatch) {
    return jsonFenceMatch[1].trim();
  }

  // Try generic ``` ... ```
  const genericFenceMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (genericFenceMatch) {
    const content = genericFenceMatch[1].trim();
    // Verify it looks like JSON
    if (content.startsWith('{') || content.startsWith('[')) {
      return content;
    }
  }

  return null;
}

/**
 * Extract JSON by finding matching brackets
 * Handles cases where JSON is surrounded by text
 */
function extractJsonByBrackets(text: string): string | null {
  // Find first { or [
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');

  let startIdx: number;
  let openBracket: string;
  let closeBracket: string;

  if (objectStart === -1 && arrayStart === -1) {
    return null;
  } else if (objectStart === -1) {
    startIdx = arrayStart;
    openBracket = '[';
    closeBracket = ']';
  } else if (arrayStart === -1) {
    startIdx = objectStart;
    openBracket = '{';
    closeBracket = '}';
  } else {
    // Use whichever comes first
    if (objectStart < arrayStart) {
      startIdx = objectStart;
      openBracket = '{';
      closeBracket = '}';
    } else {
      startIdx = arrayStart;
      openBracket = '[';
      closeBracket = ']';
    }
  }

  // Find matching close bracket
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openBracket) {
      depth++;
    } else if (char === closeBracket) {
      depth--;
      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }
  }

  return null;
}

/**
 * Validate parsed data against expected shape (basic type checking)
 */
export function validateShape<T>(data: unknown, requiredKeys: (keyof T)[]): data is T {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  for (const key of requiredKeys) {
    if (!(key in data)) {
      return false;
    }
  }

  return true;
}
