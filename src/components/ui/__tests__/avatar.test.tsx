import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/components/ui/avatar";

describe("Avatar", () => {
  it("derives initials from a two-word display name", () => {
    render(<Avatar name="Alice Baker" />);
    expect(screen.getByLabelText("Alice Baker").textContent).toBe("AB");
  });

  it("derives initials from a single-word display name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByLabelText("Alice").textContent).toBe("AL");
  });

  it("falls back when display name is empty", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("renders an image when src is provided", () => {
    render(<Avatar name="Alice" src="https://example.com/a.webp" />);
    expect(screen.getByRole("img", { name: "Alice" })).toBeTruthy();
  });
});
