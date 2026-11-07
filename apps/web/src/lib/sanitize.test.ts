import { describe, expect, it } from "vitest";
import { buildPreviewDocument, sanitizeEmailHtml } from "./sanitize";

describe("sanitizeEmailHtml", () => {
  it("strips dangerous tags and event handlers", () => {
    const dirty =
      '<p onclick="alert(1)">Hi</p><script>evil()</script><img src=x onerror="alert(2)">';
    const clean = sanitizeEmailHtml(dirty);
    expect(clean).toContain("<p>");
    expect(clean).toContain("Hi");
    expect(clean.toLowerCase()).not.toContain("<script");
    expect(clean.toLowerCase()).not.toContain("onclick");
    expect(clean.toLowerCase()).not.toContain("onerror");
  });
});

describe("buildPreviewDocument", () => {
  it("wraps a fragment in a CSP document", () => {
    const doc = buildPreviewDocument("<p>Hello</p>");
    expect(doc).toContain("<!DOCTYPE html>");
    expect(doc).toContain("Content-Security-Policy");
    expect(doc).toContain("<body><p>Hello</p></body>");
  });

  it("preserves sanitized style blocks from a full email", () => {
    const html = `<!DOCTYPE html><html><head><style>p { color: red; }</style></head><body><p>Hi</p></body></html>`;
    const doc = buildPreviewDocument(html);
    expect(doc).toContain("p { color: red; }");
    expect(doc).toContain("<body><p>Hi</p></body>");
  });

  it("neutralizes risky CSS constructs", () => {
    const html = `<html><head><style>@import url("x"); body { behavior: url(x); expression(alert(1)); background: javascript:alert(1); }</style></head><body>x</body></html>`;
    const doc = buildPreviewDocument(html);
    expect(doc.toLowerCase()).not.toContain("@import");
    expect(doc.toLowerCase()).not.toContain("expression(");
    expect(doc.toLowerCase()).not.toContain("javascript:");
    expect(doc.toLowerCase()).not.toContain("behavior:");
  });
});
