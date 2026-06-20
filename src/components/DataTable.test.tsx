// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable } from "./DataTable";

describe("DataTable", () => {
  it("affiche les lignes et l'état vide", () => {
    render(<DataTable colonnes={[{ cle: "n", titre: "Nom", rendu: (r: { nom: string }) => r.nom }]}
                      lignes={[{ nom: "Alpha" }]} cleLigne={(r) => r.nom} />);
    expect(screen.getByText("Alpha")).toBeTruthy();
  });
  it("affiche le libellé vide quand aucune ligne", () => {
    render(<DataTable colonnes={[{ cle: "n", titre: "Nom", rendu: (r: { nom: string }) => r.nom }]}
                      lignes={[]} cleLigne={(r) => r.nom} videLabel="Rien" />);
    expect(screen.getByText("Rien")).toBeTruthy();
  });
});
