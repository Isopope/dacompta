// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Hello() { return <span>ok</span>; }

describe("env jsdom", () => {
  it("rend un composant", () => {
    render(<Hello />);
    expect(screen.getByText("ok")).toBeTruthy();
  });
});
