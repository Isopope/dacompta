"use server";

import {
  creerPiece, listerPieces, validerPiece, annulerPiece,
  type CreerPieceInput, type FiltrePieces,
} from "@/server/pieces";

// Les valeurs Prisma.Decimal et Date ne sont pas sérialisables vers un Client Component.
// On expose ici des DTO « plats » (nombres + ISO strings) consommables côté client.
export interface LigneDTO {
  id: string;
  compteNumero: string;
  libelleLigne: string;
  debit: number;
  credit: number;
  ordre: number;
  sectionAnalytique: string | null;
}

export interface PieceDTO {
  id: string;
  numeroPiece: string;
  datePiece: string; // ISO
  fournisseur: string | null;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  statut: "BROUILLON" | "VALIDEE" | "ANNULEE";
  journalId: string;
  lignes: LigneDTO[];
}

type PiecePrisma = Awaited<ReturnType<typeof listerPieces>>[number];

function toDTO(p: PiecePrisma): PieceDTO {
  return {
    id: p.id,
    numeroPiece: p.numeroPiece,
    datePiece: p.datePiece.toISOString(),
    fournisseur: p.fournisseur,
    montantHT: Number(p.montantHT),
    montantTVA: Number(p.montantTVA),
    montantTTC: Number(p.montantTTC),
    statut: p.statut as PieceDTO["statut"],
    journalId: p.journalId,
    lignes: p.lignes.map((l) => ({
      id: l.id,
      compteNumero: l.compteNumero,
      libelleLigne: l.libelleLigne,
      debit: Number(l.debit),
      credit: Number(l.credit),
      ordre: l.ordre,
      sectionAnalytique: l.sectionAnalytique,
    })),
  };
}

export async function listerPiecesUI(dossierId: string, filtre: FiltrePieces = {}): Promise<PieceDTO[]> {
  return (await listerPieces(dossierId, filtre)).map(toDTO);
}

export async function creerPieceUI(input: CreerPieceInput): Promise<PieceDTO> {
  return toDTO(await creerPiece(input));
}

export async function validerPieceUI(id: string): Promise<void> {
  await validerPiece(id);
}

export async function annulerPieceUI(id: string): Promise<void> {
  await annulerPiece(id);
}
