/**
 * Google Doc to broadcast conversion.
 *
 * Fetches a Google Doc section by marker, converts plain text to clean HTML,
 * and prepares a broadcast-ready payload.
 */

const DEFAULT_DOC_ID = "REPLACE_WITH_GOOGLE_DOC_ID";

/**
 * Fetch the Google Doc as plain text.
 */
export const fetchDocText = async (docId = DEFAULT_DOC_ID): Promise<string> => {
  const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(url);
  if (!response.ok) {
    const { FetchError } = await import("./errors");
    throw new FetchError({ url, status: response.status });
  }
  return response.text();
};

/**
 * Extract a section from the doc by searching for a marker string.
 * Sections end at the next `___` horizontal rule or the next section marker.
 */
export const extractSection = (
  docText: string,
  sectionQuery: string,
): { marker: string; body: string; subject?: string } | null => {
  const lines = docText.split("\n");

  // Find the section start line
  let startIdx = -1;
  let markerLine = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.toLowerCase().includes(sectionQuery.toLowerCase())) {
      startIdx = i;
      markerLine = line;
      break;
    }
  }

  if (startIdx === -1) return null;

  // Find the section end (next ___ separator or next section marker)
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^_{3,}$/.test(line.trim())) {
      endIdx = i;
      break;
    }
    // Next section marker (emoji + status prefix)
    if (/^[​\s]*[🟢🟡🔴✅]/u.test(line) && i > startIdx + 5) {
      endIdx = i;
      break;
    }
  }

  // Extract everything between marker and end
  const sectionLines = lines.slice(startIdx + 1, endIdx);

  // Try to find subject line (usually after "Subject:" label)
  let subject: string | undefined;
  // Also skip metadata lines (To send:, Writing Prompt:, etc.)
  let bodyStartIdx = 0;
  for (let i = 0; i < sectionLines.length; i++) {
    const line = (sectionLines[i] ?? "").trim();
    if (/^Subject:/i.test(line)) {
      subject = line.replace(/^Subject:\s*/i, "").trim();
      bodyStartIdx = i + 1;
    } else if (
      /^(\* )?To send:/i.test(line) ||
      /^(\* )?Writing Prompt:/i.test(line) ||
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s/i.test(line)
    ) {
      bodyStartIdx = i + 1;
    } else if (line.startsWith("Hey {{") || line.startsWith("Hey ")) {
      bodyStartIdx = i;
      break;
    }
  }

  const bodyLines = sectionLines.slice(bodyStartIdx);
  const body = bodyLines.join("\n").trim();

  return { marker: markerLine.trim(), body, subject };
};

/**
 * Convert plain text (from Google Doc export) to clean HTML for Kit broadcasts.
 *
 * Handles:
 * - Paragraphs (double newlines -> <p> tags)
 * - Headers (lines that look like section titles -> <h2>)
 * - Bullet lists (* items -> <ul><li>)
 * - Numbered lists (1. items -> <ol><li>)
 * - Bold (**text** or text in ALL CAPS for emphasis)
 * - Italic (single words/phrases in emphasis context)
 * - Smart quotes and special chars -> HTML entities
 * - [CTA Text] brackets -> styled blue buttons
 * - Shortlink patterns -> full URLs
 */
export const textToHtml = (text: string, options?: { shortlinkBase?: string }): string => {
  const shortlinkBase = options?.shortlinkBase ?? "https://example.com";

  // Clean up doc artifacts
  let cleaned = text
    .replace(/\[[a-z]\]/g, "") // Remove doc comment markers like [a] [b] [c]
    .replace(/\[d\]/g, "") // Same
    .replace(/\[e\]/g, "") // Same
    .replace(/\r\n/g, "\n")
    .trim();

  // Split into blocks by double newlines
  const blocks = cleaned.split(/\n\n+/);
  const htmlParts: string[] = [];

  let inList = false;
  let listType: "ul" | "ol" = "ul";

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Check if this is a list block (multiple lines starting with * or N.)
    const listLines = trimmed.split("\n").map((l) => l.trim());
    const isBulletList = listLines.every(
      (l) => l.startsWith("* ") || l.startsWith("- ") || l === "",
    );
    const isNumberedList = listLines.every((l) => /^\d+\.\s/.test(l) || l === "");

    if (isBulletList && listLines.some((l) => /^\* |^[-] /.test(l))) {
      if (inList) htmlParts.push(`</${listType}>`);
      listType = "ul";
      inList = true;
      htmlParts.push("<ul>");
      for (const line of listLines) {
        const content = line.replace(/^\* |^[-] /, "").trim();
        if (content) htmlParts.push(`<li>${inlineFormat(content, shortlinkBase)}</li>`);
      }
      htmlParts.push("</ul>");
      inList = false;
      continue;
    }

    if (isNumberedList && listLines.some((l) => /^\d+\.\s/.test(l))) {
      if (inList) htmlParts.push(`</${listType}>`);
      listType = "ol";
      inList = true;
      htmlParts.push("<ol>");
      for (const line of listLines) {
        const content = line.replace(/^\d+\.\s*/, "").trim();
        if (content) htmlParts.push(`<li>${inlineFormat(content, shortlinkBase)}</li>`);
      }
      htmlParts.push("</ol>");
      inList = false;
      continue;
    }

    if (inList) {
      htmlParts.push(`</${listType}>`);
      inList = false;
    }

    // Check if this looks like a header (short, no period at end, often bold)
    const isHeader =
      trimmed.length < 120 &&
      !trimmed.endsWith(".") &&
      !trimmed.endsWith("!") &&
      !trimmed.startsWith("Hey") &&
      !trimmed.startsWith("Matt") &&
      !trimmed.startsWith("PS") &&
      !trimmed.startsWith("P.P") &&
      !trimmed.startsWith("See you") &&
      !trimmed.startsWith("Would love") &&
      !trimmed.startsWith("And then") &&
      !trimmed.startsWith("Check out") &&
      /^[A-Z]/.test(trimmed) &&
      !trimmed.includes(". ") &&
      trimmed.split(" ").length <= 20;

    // Check for [CTA] bracket pattern
    const ctaMatch = trimmed.match(/^\[(.+)\]$/);
    if (ctaMatch) {
      const ctaText = ctaMatch[1] ?? trimmed;
      htmlParts.push(
        '<table cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">' +
          '<tr><td align="center" bgcolor="#2563EB" style="border-radius:8px;">' +
          `<a href="${shortlinkBase}/s/broadcast-cta" style="display:inline-block;padding:16px 48px;font-size:18px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${ctaText}</a>` +
          "</td></tr></table>",
      );
      continue;
    }

    // Header detection
    if (isHeader && trimmed.length > 10) {
      htmlParts.push(`<h2>${inlineFormat(trimmed, shortlinkBase)}</h2>`);
    } else {
      // Regular paragraph - may have multiple lines that should be one <p>
      const joined = trimmed.replace(/\n/g, " ");
      htmlParts.push(`<p>${inlineFormat(joined, shortlinkBase)}</p>`);
    }
  }

  return htmlParts.join("\n\n");
};

/**
 * Apply inline formatting to a text string.
 */
const inlineFormat = (text: string, shortlinkBase: string): string => {
  let result = text;

  // Encode special chars for HTML
  result = result.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Smart quotes -> HTML entities
  result = result
    .replace(/\u2018/g, "&lsquo;")
    .replace(/\u2019/g, "&rsquo;")
    .replace(/\u201c/g, "&ldquo;")
    .replace(/\u201d/g, "&rdquo;")
    .replace(/\u2013/g, "&ndash;")
    .replace(/\u2014/g, "&ndash;") // Convert em dashes to en dashes
    .replace(/\u2026/g, "&hellip;")
    .replace(/\u2192/g, "&rarr;");

  // Curly quotes from Google Docs (sometimes come as plain text patterns)
  result = result
    .replace(/\u00e2\u0080\u0099/g, "&rsquo;")
    .replace(/\u00e2\u0080\u0098/g, "&lsquo;")
    .replace(/\u00e2\u0080\u009c/g, "&ldquo;")
    .replace(/\u00e2\u0080\u009d/g, "&rdquo;");

  // Arrow -> HTML entity
  result = result.replace(/ -> /g, " &rarr; ").replace(/->$/g, "&rarr;");
  result = result.replace(/\u2192/g, "&rarr;");

  // Watch the full video -> (with arrow)
  result = result.replace(
    /Watch the full video &rarr;/g,
    `<strong><a href="${shortlinkBase}/s/broadcast-video">Watch the full video &rarr;</a></strong>`,
  );

  // "Example Offer" as a link when standalone
  result = result.replace(
    /Example Offer(?![<])/g,
    `<a href="${shortlinkBase}/s/broadcast-cta">Example Offer</a>`,
  );

  return result;
};

/**
 * Build a broadcast-ready JSON payload from extracted doc content.
 */
export const buildBroadcastPayload = (
  content: string,
  options: {
    subject: string;
    previewText?: string;
    description?: string;
    sendAt?: string;
  },
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    subject: options.subject,
    content,
    public: false,
    subscriber_filter: [{ all: [{ type: "segment", ids: [548647] }] }],
  };

  if (options.previewText) payload.preview_text = options.previewText;
  if (options.description) payload.description = options.description;
  if (options.sendAt) {
    payload.send_at = options.sendAt;
    payload.published_at = options.sendAt;
  }

  return payload;
};
