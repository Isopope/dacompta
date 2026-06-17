import { describe, it, expect } from "vitest";
import { detecterRolesColonnes, construireLignesImport } from "./import-mapping";
import { NATURES, CLASSES } from "./referentiel";

const lignes = [
  ["Note interne", "401100", "Fournisseurs", "D"],
  ["x", "411100", "Clients", "D"],
  ["y", "120000", "Report à nouveau", "T"],
];

describe("detecterRolesColonnes", () => {
  it("reconnaît n°, intitulé et type quel que soit l'ordre des colonnes", () => {
    const roles = detecterRolesColonnes(lignes);
    expect(roles[1]).toBe("NUMERO");
    expect(roles[2]).toBe("INTITULE");
    expect(roles[3]).toBe("TYPE");
    expect(roles[0]).toBe("IGNORER");
  });

  it("choisit la bonne colonne intitulé quand deux colonnes sont du texte (départage déterministe)", () => {
    // Col 0 is a long free-text comment column; col 2 is the real intitulé (short labels).
    // Both score ~1.0 for INTITULE. The tie-break must prefer shorter average length (terse labels).
    const f = [
      ["Commentaire interne très long sur la saisie", "401100", "Fournisseurs", "D"],
      ["Autre remarque de saisie assez longue ici", "411100", "Clients", "D"],
    ];
    const roles = detecterRolesColonnes(f);
    expect(roles[1]).toBe("NUMERO");
    expect(roles[2]).toBe("INTITULE");
    expect(roles[3]).toBe("TYPE");
    expect(roles[0]).toBe("IGNORER");
  });
});

describe("construireLignesImport", () => {
  it("construit des lignes complètes avec nature/report déduits", () => {
    const roles = detecterRolesColonnes(lignes);
    const out = construireLignesImport(lignes, roles, NATURES, CLASSES, new Set());
    const fourn = out.find((l) => l.numero === "401100")!;
    expect(fourn.intitule).toBe("Fournisseurs");
    expect(fourn.natureRacine).toBe("40");
    expect(fourn.reportNplus1).toBe(false);
    expect(fourn.controle).toBe("ok");
  });
  it("signale un doublon par rapport aux comptes existants", () => {
    const roles = detecterRolesColonnes(lignes);
    const out = construireLignesImport(lignes, roles, NATURES, CLASSES, new Set(["401100"]));
    expect(out.find((l) => l.numero === "401100")!.controle).toBe("doublon");
  });
  it("signale un compte hors SYSCOHADA (classe inconnue)", () => {
    const horsCadre = [["x", "001000", "Compte interne", "D"]];
    const roles = detecterRolesColonnes(lignes); // mêmes positions de colonnes
    const out = construireLignesImport(horsCadre, roles, NATURES, CLASSES, new Set());
    expect(out[0].controle).toBe("hors-syscohada");
  });
});
