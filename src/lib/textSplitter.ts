/**
 * Cleans excessive whitespace in the script while keeping single spaces.
 */
export function cleanScript(text: string): string {
  if (!text) return '';
  // Normalize line breaks and multiple consecutive spaces/tabs into a single space,
  // but keep reasonable paragraphs (double newlines reduced to newline)
  return text
    .replace(/[ \t\f\r]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/**
 * Splits a long script into segments of approximately targetLength (default 2500 chars).
 * Preserves sentence boundaries (. ! ? … \n), followed by phrase boundaries (, ; :),
 * then word boundaries (spaces). Avoids cutting words in half whenever possible.
 */
export function splitScript(text: string, targetLength: number = 2500): string[] {
  const cleaned = cleanScript(text);
  if (!cleaned) return [];
  if (cleaned.length <= targetLength) {
    return [cleaned];
  }

  const segments: string[] = [];
  let remaining = cleaned;

  while (remaining.length > 0) {
    if (remaining.length <= targetLength) {
      segments.push(remaining.trim());
      break;
    }

    // Try finding the best breakpoint around targetLength
    // Search window: from (targetLength * 0.75) up to targetLength
    const windowStart = Math.floor(targetLength * 0.7);
    const windowText = remaining.substring(0, targetLength);

    // 1. Try finding end of sentence (. ! ? … \n) followed by space or end
    let bestCutIndex = -1;
    const sentenceRegex = /[.!?…\n]\s+/g;
    let match: RegExpExecArray | null;

    while ((match = sentenceRegex.exec(windowText)) !== null) {
      if (match.index >= windowStart) {
        // Cut right after the punctuation
        bestCutIndex = match.index + 1;
      }
    }

    // 2. If no sentence boundary in preferred window, search for clause breaks (, ; :)
    if (bestCutIndex === -1) {
      const clauseRegex = /[,;:]\s+/g;
      while ((match = clauseRegex.exec(windowText)) !== null) {
        if (match.index >= windowStart) {
          bestCutIndex = match.index + 1;
        }
      }
    }

    // 3. If no clause break, search for any word boundary (space) in the window
    if (bestCutIndex === -1) {
      const lastSpaceIndex = windowText.lastIndexOf(' ');
      if (lastSpaceIndex >= windowStart) {
        bestCutIndex = lastSpaceIndex;
      }
    }

    // 4. Fallback: search for last space anywhere in the targetLength window
    if (bestCutIndex === -1) {
      const anySpaceIndex = windowText.lastIndexOf(' ');
      if (anySpaceIndex > 0) {
        bestCutIndex = anySpaceIndex;
      } else {
        // Last resort: hard split at targetLength
        bestCutIndex = targetLength;
      }
    }

    const segment = remaining.substring(0, bestCutIndex).trim();
    if (segment) {
      segments.push(segment);
    }
    remaining = remaining.substring(bestCutIndex).trim();
  }

  return segments;
}
