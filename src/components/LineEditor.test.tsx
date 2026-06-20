// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LineEditor } from "./LineEditor";

describe("LineEditor", () => {
  it("ajoute une ligne via le bouton", () => {
    const onChange = vi.fn();
    render(<LineEditor comptes={[{ numero: "707000", intitule: "Ventes" }]}
                       taxes={[{ code: "TVA18", nom: "TVA 18%", taux: 18 }]}
                       lignes={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText(/ajouter une ligne/i));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });
});
