export type Address = {
  name: string | null;
  address: string | null;
};

export type EmailListItem = {
  id: string;
  from: string;
  to: Address[];
  subject: string;
  size: number;
  readAt: string | null;
  createdAt: string;
  hasHtml: boolean;
  attachmentCount: number;
};

export type AttachmentMeta = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
};

export type EmailDetail = EmailListItem & {
  cc: Address[];
  bcc: Address[];
  textBody: string | null;
  htmlBody: string | null;
  previewHtml: string | null;
  headers: Record<string, string>;
  raw: string;
  messageId: string | null;
  attachments: AttachmentMeta[];
};

export type CredentialListItem = {
  id: string;
  username: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleString();
}

export function displayAddress(from: string): string {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return match[1].trim() || match[2];
  return from || "(unknown)";
}
