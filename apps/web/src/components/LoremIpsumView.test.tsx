import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LoremIpsumView } from "./LoremIpsumView";

describe("LoremIpsumView", () => {
  it("generates output and updates count controls", async () => {
    const user = userEvent.setup();
    render(<LoremIpsumView />);

    expect(screen.getByLabelText("Generated lorem ipsum text")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Sentences/i }));
    await user.click(screen.getByRole("button", { name: "Generate" }));

    const output = screen.getByLabelText("Generated lorem ipsum text");
    expect((output as HTMLTextAreaElement).value.length).toBeGreaterThan(20);

    await user.click(screen.getByRole("button", { name: /Words/i }));
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect((output as HTMLTextAreaElement).value.split(/\s+/).length).toBeGreaterThan(0);
  });
});
