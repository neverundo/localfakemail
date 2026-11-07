import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREVIEW_LENGTH } from "@/lib/character-counter";
import { resetRememberedPreviewLength } from "@/lib/character-counter-memory";
import { CharacterCounterView } from "./CharacterCounterView";

afterEach(() => {
  cleanup();
  resetRememberedPreviewLength();
});

describe("CharacterCounterView", () => {
  it("counts characters and truncates the preview", async () => {
    const user = userEvent.setup();
    render(<CharacterCounterView />);

    const input = screen.getByLabelText("Text to count");
    await user.clear(input);
    await user.type(input, "abcdefghij");

    expect(screen.getByText("10")).toBeInTheDocument();

    const lengthInput = screen.getByLabelText("Show only N characters");
    fireEvent.change(lengthInput, { target: { value: "4" } });

    const preview = screen.getByLabelText("Truncated preview");
    expect(preview).toHaveValue("abcd...");
  });

  it("copies the truncated preview", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CharacterCounterView />);
    await user.type(screen.getByLabelText("Text to count"), "hello world");
    await user.click(screen.getByRole("button", { name: /Copy/i }));

    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: /Copied/i })).toBeInTheDocument();
  });

  it("defaults N to 50 before the user changes it", () => {
    render(<CharacterCounterView />);
    expect(screen.getByLabelText("Show only N characters")).toHaveValue(
      DEFAULT_PREVIEW_LENGTH,
    );
  });

  it("keeps the user-defined N after leaving and returning to /counter", () => {
    const { unmount } = render(<CharacterCounterView />);
    fireEvent.change(screen.getByLabelText("Show only N characters"), {
      target: { value: "42" },
    });
    expect(screen.getByLabelText("Show only N characters")).toHaveValue(42);

    unmount();

    render(<CharacterCounterView />);
    expect(screen.getByLabelText("Show only N characters")).toHaveValue(42);
    expect(screen.getByLabelText("Preview length slider")).toHaveValue("42");
  });

  it("persists N when set via the range slider", () => {
    const { unmount } = render(<CharacterCounterView />);
    fireEvent.change(screen.getByLabelText("Preview length slider"), {
      target: { value: "75" },
    });
    unmount();

    render(<CharacterCounterView />);
    expect(screen.getByLabelText("Show only N characters")).toHaveValue(75);
  });
});
