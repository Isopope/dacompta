import { describe, it, expect } from "vitest";
import { DOC_IDS, EXPORT_FORMATS, isDocId, isExportFormat } from "./types";

describe("types export", () => {
  it("expose les 5 documents exportables", () => {
    expect([...DOC_IDS].sort()).toEqual(
      ["balance-generale", "bilan", "compte-resultat", "flux-tresorerie", "grand-livre"]
    );
  });

  it("expose les 2 formats", () => {
    expect([...EXPORT_FORMATS].sort()).toEqual(["pdf", "xlsx"]);
  });

  it("isDocId valide uniquement les DocId connus", () => {
    expect(isDocId("bilan")).toBe(true);
    expect(isDocId("notes")).toBe(false);
    expect(isDocId(null)).toBe(false);
  });

  it("isExportFormat valide uniquement pdf et xlsx", () => {
    expect(isExportFormat("pdf")).toBe(true);
    expect(isExportFormat("csv")).toBe(false);
    expect(isExportFormat(undefined)).toBe(false);
  });
});
