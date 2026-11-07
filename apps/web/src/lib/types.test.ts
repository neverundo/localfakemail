import { afterEach, describe, expect, it, vi } from "vitest";
import { displayAddress, formatBytes, formatRelativeTime } from "./types";

describe("formatBytes", () => {
  it("formats bytes, KB and MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns relative buckets", () => {
    const now = new Date("2026-11-07T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatRelativeTime("2026-11-07T11:59:30.000Z")).toBe("just now");
    expect(formatRelativeTime("2026-11-07T11:45:00.000Z")).toBe("15m ago");
    expect(formatRelativeTime("2026-11-07T09:00:00.000Z")).toBe("3h ago");
    expect(formatRelativeTime("2026-11-05T12:00:00.000Z")).toBe(
      new Date("2026-11-05T12:00:00.000Z").toLocaleString(),
    );
  });
});

describe("displayAddress", () => {
  it("prefers display name when present", () => {
    expect(displayAddress("Ada <ada@example.com>")).toBe("Ada");
  });

  it("falls back to email when name is blank", () => {
    expect(displayAddress(" <ada@example.com>")).toBe("ada@example.com");
  });

  it("returns raw string or unknown", () => {
    expect(displayAddress("plain@example.com")).toBe("plain@example.com");
    expect(displayAddress("")).toBe("(unknown)");
  });
});
