/**
 * Broadcast content helpers for text extraction, surgical replacement, and lint.
 *
 * Pure functions. No API calls. No side effects.
 */

// HTML entity map for decoding
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&rdquo;": "\u201c",
  "&ldquo;": "\u201d",
  "&ndash;": "\u2013",
  "&mdash;": "\u2014",
  "&rarr;": "\u2192",
  "&larr;": "\u2190",
  "&hellip;": "\u2026",
  "&nbsp;": " ",
  "&trade;": "\u2122",
  "&copy;": "\u00a9",
  "&reg;": "\u00ae",
};

// Friendlier replacements for plain text output
const TEXT_REPLACEMENTS: Record<string, string> = {
  "\u2019": "'", // right single quote -> apostrophe
  "\u2018": "'", // left single quote -> apostrophe
  "\u201c": '"', // left double quote
  "\u201d": '"', // right double quote
  "\u2013": "-", // en dash
  "\u2014": "-", // em dash
  "\u2192": "->", // right arrow
  "\u2190": "<-", // left arrow
  "\u2026": "...", // ellipsis
};

/**
 * Convert broadcast HTML content to readable plain text.
 */
export const htmlToText = (html: string): string => {
  let text = html;

  // Preserve line breaks from block elements
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<li>/gi, "  - ");
  text = text.replace(/<\/tr>/gi, "\n");

  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    text = text.replaceAll(entity, char);
  }

  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );

  // Replace smart quotes and special chars with plain equivalents
  for (const [from, to] of Object.entries(TEXT_REPLACEMENTS)) {
    text = text.replaceAll(from, to);
  }

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
};

/**
 * Find/replace pair for surgical content editing.
 */
export type ReplacePair = {
  find: string;
  replace: string;
};

/**
 * Result of a single replacement operation.
 */
export type ReplaceResult = {
  find: string;
  replace: string;
  found: boolean;
  occurrences: number;
  context?: string;
};

/**
 * Apply find/replace pairs to broadcast HTML content.
 * Operates on the raw HTML so replacements work on the actual content
 * that Kit stores and renders.
 */
export const replaceBroadcastContent = (
  content: string,
  pairs: ReplacePair[],
): { content: string; results: ReplaceResult[] } => {
  let updated = content;
  const results: ReplaceResult[] = [];

  for (const { find, replace } of pairs) {
    const occurrences = updated.split(find).length - 1;
    const found = occurrences > 0;

    let context: string | undefined;
    if (found) {
      const idx = updated.indexOf(find);
      const start = Math.max(0, idx - 30);
      const end = Math.min(updated.length, idx + find.length + 30);
      const snippet = htmlToText(updated.slice(start, end));
      context = `...${snippet}...`;
      updated = updated.replaceAll(find, replace);
    }

    results.push({ find, replace, found, occurrences, context });
  }

  return { content: updated, results };
};

/**
 * Lint issue found in broadcast content.
 */
export type LintIssue = {
  rule: string;
  severity: "error" | "warning";
  message: string;
  match?: string;
  position?: number;
};

// Em dashes: U+2014 and HTML entity
const EM_DASH_PATTERNS = [/\u2014/g, /&mdash;/g];

// Stiff/corporate language
const STIFF_LANGUAGE = [
  { pattern: /\bparlance\b/gi, suggestion: "drop it or say 'in' instead" },
  { pattern: /\butilize\b/gi, suggestion: "use" },
  { pattern: /\bleverage\b/gi, suggestion: "use" },
  { pattern: /\bfacilitate\b/gi, suggestion: "help" },
  { pattern: /\bendeavor\b/gi, suggestion: "try" },
  { pattern: /\bcommence\b/gi, suggestion: "start" },
  { pattern: /\baforementioned\b/gi, suggestion: "drop it" },
  { pattern: /\bhenceforth\b/gi, suggestion: "drop it" },
  { pattern: /\bnotwithstanding\b/gi, suggestion: "despite" },
  { pattern: /\bindependently actionable\b/gi, suggestion: "separate" },
  { pattern: /\bsynergy\b/gi, suggestion: "drop it" },
  { pattern: /\bparadigm\b/gi, suggestion: "drop it" },
  { pattern: /\bthis coming Monday\b/gi, suggestion: "Monday" },
  { pattern: /\bthis coming\b/gi, suggestion: "drop 'this coming'" },
];

// Signature patterns (Front adds signatures)
const SIGNATURE_PATTERNS = [
  /\nBest,?\s*$/im,
  /\nThanks,?\s*$/im,
  /\nCheers,?\s*$/im,
  /\nSincerely,?\s*$/im,
  /\nKind regards,?\s*$/im,
  /\nBest regards,?\s*$/im,
];

// Bare bracket CTAs that should be buttons
const BRACKET_CTA = /\[([A-Z][^\]]{3,})\]/g;

/**
 * Lint broadcast content for common copy problems.
 */
export const lintBroadcastContent = (html: string): LintIssue[] => {
  const issues: LintIssue[] = [];
  const text = htmlToText(html);

  // Em dashes
  for (const pattern of EM_DASH_PATTERNS) {
    let match: RegExpExecArray | null;
    // biome-ignore lint: assignment in while
    while ((match = pattern.exec(html)) !== null) {
      issues.push({
        rule: "no-em-dash",
        severity: "error",
        message: "Em dash found. Use a comma, period, or 'and' instead.",
        match: html.slice(Math.max(0, match.index - 20), match.index + 20),
        position: match.index,
      });
    }
  }

  // Stiff language
  for (const { pattern, suggestion } of STIFF_LANGUAGE) {
    let match: RegExpExecArray | null;
    // biome-ignore lint: assignment in while
    while ((match = pattern.exec(text)) !== null) {
      issues.push({
        rule: "plain-language",
        severity: "warning",
        message: `"${match[0]}" sounds stiff. Try: ${suggestion}`,
        match: text.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20),
        position: match.index,
      });
    }
  }

  // Signatures
  for (const pattern of SIGNATURE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      issues.push({
        rule: "no-signature",
        severity: "warning",
        message: "Looks like a signature. Kit/Front templates add signatures automatically.",
        match: match[0].trim(),
      });
    }
  }

  // Bare bracket CTAs
  let bracketMatch: RegExpExecArray | null;
  // biome-ignore lint: assignment in while
  while ((bracketMatch = BRACKET_CTA.exec(text)) !== null) {
    // Only flag if it looks like a CTA (contains action words)
    const inner = bracketMatch[1] ?? "";
    if (/enroll|buy|sign up|join|get|start|save|register/i.test(inner)) {
      issues.push({
        rule: "bracket-cta",
        severity: "warning",
        message: `"[${inner}]" should be a styled button, not a bracket link.`,
        match: bracketMatch[0],
        position: bracketMatch.index,
      });
    }
  }

  return issues;
};
