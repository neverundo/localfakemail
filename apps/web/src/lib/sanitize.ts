import DOMPurify from "isomorphic-dompurify";

export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ADD_ATTR: ["target"],
  });
}

/** Pull `<style>` blocks from a full email document before DOMPurify drops `<head>`. */
function extractStyleBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const css = sanitizeStyleContent(match[1]);
    if (css.trim()) blocks.push(css);
  }
  return blocks;
}

function extractBodyHtml(html: string): string {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  // Fragment or already body-only — drop leftover head chrome if present.
  return html
    .replace(/<\/?(?:!DOCTYPE|html|head|body)\b[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, "");
}

function sanitizeStyleContent(css: string): string {
  return css
    .replace(/<\/style/gi, "<\\/style")
    .replace(/@import\b[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "/*expr*/(")
    .replace(/javascript\s*:/gi, "/*js*/:")
    .replace(/-moz-binding\s*:/gi, "/*binding*/:")
    .replace(/behavior\s*:/gi, "/*behavior*/:");
}

export function buildPreviewDocument(html: string): string {
  const emailStyles = extractStyleBlocks(html);
  const safe = sanitizeEmailHtml(extractBodyHtml(html));
  const injectedStyles = emailStyles
    .map((css) => `<style type="text/css">\n${css}\n</style>`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:; font-src data: https: http:;" />
  <base target="_blank" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.5;
      word-wrap: break-word;
    }
    img { max-width: 100%; height: auto; }
    a { color: #0b57d0; }
    table { max-width: 100%; }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style>
  ${injectedStyles}
</head>
<body>${safe}</body>
</html>`;
}
