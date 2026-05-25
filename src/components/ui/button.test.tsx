import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button Component", () => {
  it("renders correctly with children text", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("applies the default classes", () => {
    render(<Button>Default Button</Button>);
    const button = screen.getByRole("button", { name: /default button/i });
    expect(button).toHaveClass("bg-primary");
    expect(button).toHaveClass("text-primary-foreground");
  });

  it("applies custom variant and size classes", () => {
    render(
      <Button variant="destructive" size="sm">
        Destructive Sm
      </Button>
    );
    const button = screen.getByRole("button", { name: /destructive sm/i });
    expect(button).toHaveClass("bg-destructive");
    expect(button).toHaveClass("h-8");
  });

  it("supports user click interactions", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Interactive</Button>);
    const button = screen.getByRole("button", { name: /interactive/i });

    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick when disabled", async () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button", { name: /disabled/i });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");

    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders custom slot when asChild is true", () => {
    render(
      <Button asChild>
        <a href="https://example.com">Link Button</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveClass("bg-primary");
  });
});
