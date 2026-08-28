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

export function buildPreviewDocument(html: string): string {
  const safe = sanitizeEmailHtml(html);
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
      padding: 16px;
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
</head>
<body>${safe}</body>
</html>`;
}
