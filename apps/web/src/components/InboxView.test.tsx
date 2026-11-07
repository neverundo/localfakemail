import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InboxView } from "./InboxView";
import type { EmailDetail, EmailListItem } from "@/lib/types";

const listItem: EmailListItem = {
  id: "mail-1",
  from: "Ada <ada@example.com>",
  to: [{ name: "Bob", address: "bob@example.com" }],
  subject: "Hello world",
  size: 2048,
  readAt: null,
  createdAt: new Date().toISOString(),
  hasHtml: true,
  attachmentCount: 1,
};

const detail: EmailDetail = {
  ...listItem,
  readAt: new Date().toISOString(),
  cc: [{ name: null, address: "cc@example.com" }],
  bcc: [],
  textBody: "Plain body",
  htmlBody: "<p>HTML body</p>",
  previewHtml: "<p>HTML body</p>",
  headers: {},
  raw: "Raw MIME",
  messageId: "<id@example.com>",
  attachments: [
    {
      id: "att-1",
      filename: "note.txt",
      contentType: "text/plain",
      size: 12,
    },
  ],
};

function mockFetchSequence(
  handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>,
) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const handler = handlers[Math.min(call, handlers.length - 1)];
      call += 1;
      return handler(url, init);
    }),
  );
}

describe("InboxView", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows empty state when inbox has no messages", async () => {
    mockFetchSequence([
      () =>
        Response.json({ emails: [] }),
    ]);

    render(<InboxView />);

    expect(await screen.findByText("No emails yet")).toBeInTheDocument();
    expect(screen.getByText(/127\.0\.0\.1:1025/)).toBeInTheDocument();
  });

  it("lists messages, opens detail tabs, switches viewport, and deletes", async () => {
    const user = userEvent.setup();
    mockFetchSequence([
      () => Response.json({ emails: [listItem] }),
      (url) => {
        expect(url).toContain("/api/emails/mail-1");
        return Response.json({ email: detail });
      },
      (url, init) => {
        expect(url).toContain("/api/emails/mail-1");
        expect(init?.method).toBe("DELETE");
        return new Response(null, { status: 204 });
      },
      () => Response.json({ emails: [] }),
    ]);

    render(<InboxView />);

    expect(await screen.findByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("1 attachment")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hello world/i }));

    expect(await screen.findByRole("heading", { name: "Hello world" })).toBeInTheDocument();
    expect(screen.getByText(/cc@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /note\.txt/i })).toHaveAttribute(
      "href",
      "/api/emails/mail-1/attachments/att-1",
    );

    const iframe = screen.getByTitle("Email HTML preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("data-viewport", "desktop");
    expect(screen.queryByTestId("device-frame-tablet")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tablet" }));
    expect(screen.getByTestId("device-frame-tablet")).toBeInTheDocument();
    expect(screen.getByTitle("Email HTML preview")).toHaveAttribute("data-viewport", "tablet");

    await user.click(screen.getByRole("button", { name: "Smartphone" }));
    expect(screen.getByTestId("device-frame-smartphone")).toBeInTheDocument();
    expect(screen.getByTitle("Email HTML preview")).toHaveAttribute(
      "data-viewport",
      "smartphone",
    );

    await user.click(screen.getByRole("button", { name: "Text" }));
    expect(screen.getByText("Plain body")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Raw" }));
    expect(screen.getByText("Raw MIME")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByText("No emails yet")).toBeInTheDocument();
    });
  });

  it("clears the inbox after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    mockFetchSequence([
      () => Response.json({ emails: [listItem] }),
      (url, init) => {
        expect(url).toBe("/api/emails");
        expect(init?.method).toBe("DELETE");
        return new Response(null, { status: 204 });
      },
      () => Response.json({ emails: [] }),
    ]);

    render(<InboxView />);
    expect(await screen.findByText("Hello world")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => {
      expect(screen.getByText("No emails yet")).toBeInTheDocument();
    });
  });

  it("shows an error when the list request fails", async () => {
    mockFetchSequence([() => new Response("nope", { status: 500 })]);

    render(<InboxView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load emails");
  });

  it("falls back to text/raw tabs when HTML preview is missing", async () => {
    const user = userEvent.setup();
    const textOnly: EmailDetail = {
      ...detail,
      previewHtml: null,
      htmlBody: null,
      hasHtml: false,
      attachmentCount: 0,
      attachments: [],
      cc: [],
    };

    mockFetchSequence([
      () => Response.json({ emails: [{ ...listItem, attachmentCount: 0, hasHtml: false }] }),
      () => Response.json({ email: textOnly }),
    ]);

    render(<InboxView />);
    await user.click(await screen.findByRole("button", { name: /Hello world/i }));

    expect(await screen.findByText("Plain body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HTML" })).toBeDisabled();
    expect(screen.queryByTitle("Email HTML preview")).not.toBeInTheDocument();
  });

  it("renders the select-message placeholder before a selection", async () => {
    mockFetchSequence([() => Response.json({ emails: [listItem] })]);
    render(<InboxView />);
    expect(await screen.findByText("Select a message")).toBeInTheDocument();
    expect(screen.getByText("1 message")).toBeInTheDocument();
  });
});
