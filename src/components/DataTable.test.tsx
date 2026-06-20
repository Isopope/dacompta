// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable } from "./DataTable";

describe("DataTable", () => {
  it("affiche les lignes quand des données existent", () => {
    render(<DataTable colonnes={[{ cle: "n", titre: "Nom", rendu: (r: { nom: string }) => r.nom }]}
                      lignes={[{ nom: "Alpha" }]} cleLigne={(r) => r.nom} />);
    expect(screen.queryByText("Alpha")).not.toBeNull();
  });

  it("affiche le libellé vide quand aucune ligne", () => {
    render(<DataTable colonnes={[{ cle: "n", titre: "Nom", rendu: (r: { nom: string }) => r.nom }]}
                      lignes={[]} cleLigne={(r) => r.nom} videLabel="Rien" />);
    expect(screen.queryByText("Rien")).not.toBeNull();
  });

  it("appelle onLigneClick avec la ligne lors d'un clic sur une ligne", () => {
    const handler = vi.fn();
    const ligne = { nom: "Delta" };
    render(
      <DataTable
        colonnes={[{ cle: "n", titre: "Nom", rendu: (r: { nom: string }) => r.nom }]}
        lignes={[ligne]}
        cleLigne={(r) => r.nom}
        onLigneClick={handler}
      />
    );
    fireEvent.click(screen.getByText("Delta"));
    expect(handler).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(ligne);
  });

  it("filtre les lignes selon la recherche texte (colonnes scalaires)", () => {
    render(
      <DataTable
        colonnes={[{ cle: "n", titre: "Nom", rendu: (r: { nom: string }) => r.nom }]}
        lignes={[{ nom: "Alpha" }, { nom: "Beta" }]}
        cleLigne={(r) => r.nom}
        rechercheTexte
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Rechercher…"), { target: { value: "alpha" } });
    expect(screen.queryByText("Alpha")).not.toBeNull();
    expect(screen.queryByText("Beta")).toBeNull();
  });

  it("filtre via valeurRecherche pour les colonnes à rendu JSX (C1)", () => {
    type Item = { nom: string; montant: number };
    render(
      <DataTable
        colonnes={[
          {
            cle: "montant",
            titre: "Montant",
            rendu: (r: Item) => <span>{r.montant} €</span>,
            valeurRecherche: (r: Item) => String(r.montant),
          },
        ]}
        lignes={[
          { nom: "facture1", montant: 100 },
          { nom: "facture2", montant: 200 },
        ]}
        cleLigne={(r) => r.nom}
        rechercheTexte
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Rechercher…"), { target: { value: "100" } });
    expect(screen.queryByText("100 €")).not.toBeNull();
    expect(screen.queryByText("200 €")).toBeNull();
  });
});
