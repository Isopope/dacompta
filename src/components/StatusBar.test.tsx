// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("met en évidence l'état courant", () => {
    render(<StatusBar etats={["Brouillon", "Validé"]} courant="Validé" />);
    const courant = screen.getByText("Validé");
    expect(courant.getAttribute("data-courant")).toBe("true");
  });
});
