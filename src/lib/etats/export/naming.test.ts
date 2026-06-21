import { describe, it, expect } from "vitest";
import { slug, contentTypeFor, exportFilename } from "./naming";

const dossier = { nom: "Société Transport Bénin", exercice: 2020, devise: "XOF" };

describe("naming", () => {
  it("slug normalise accents, espaces et casse", () => {
    expect(slug("Société Transport Bénin")).toBe("societe-transport-benin");
    expect(slug("Compte de Résultat")).toBe("compte-de-resultat");
  });

  it("contentTypeFor mappe les formats", () => {
    expect(contentTypeFor("pdf")).toBe("application/pdf");
    expect(contentTypeFor("xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("exportFilename combine dossier, document, exercice et extension", () => {
    expect(exportFilename("bilan", "pdf", dossier)).toBe(
      "societe-transport-benin_bilan_2020.pdf"
    );
    expect(exportFilename("grand-livre", "xlsx", dossier)).toBe(
      "societe-transport-benin_grand-livre_2020.xlsx"
    );
  });
});
