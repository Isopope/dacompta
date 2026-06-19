-- CreateTable
CREATE TABLE "SequencePiece" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "exercice" INTEGER NOT NULL,
    "dernierNumero" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LigneEcriture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pieceId" TEXT NOT NULL,
    "compteNumero" TEXT NOT NULL,
    "libelleLigne" TEXT NOT NULL,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL,
    "sectionAnalytique" TEXT,
    "compteId" TEXT,
    "amountResidual" DECIMAL NOT NULL DEFAULT 0,
    "isLettres" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LigneEcriture_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LigneEcriture_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LigneEcriture" ("amountResidual", "compteNumero", "credit", "debit", "id", "isLettres", "libelleLigne", "ordre", "pieceId", "sectionAnalytique") SELECT "amountResidual", "compteNumero", "credit", "debit", "id", "isLettres", "libelleLigne", "ordre", "pieceId", "sectionAnalytique" FROM "LigneEcriture";
DROP TABLE "LigneEcriture";
ALTER TABLE "new_LigneEcriture" RENAME TO "LigneEcriture";
CREATE INDEX "LigneEcriture_pieceId_idx" ON "LigneEcriture"("pieceId");
CREATE TABLE "new_Piece" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroPiece" TEXT NOT NULL,
    "datePiece" DATETIME NOT NULL,
    "fournisseur" TEXT,
    "montantHT" DECIMAL NOT NULL DEFAULT 0,
    "montantTVA" DECIMAL NOT NULL DEFAULT 0,
    "montantTTC" DECIMAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "journalId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "exercice" INTEGER,
    "dateValidation" DATETIME,
    "hash" TEXT,
    "hashPrecedent" TEXT,
    "extourneDeId" TEXT,
    CONSTRAINT "Piece_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Piece_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Piece_extourneDeId_fkey" FOREIGN KEY ("extourneDeId") REFERENCES "Piece" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Piece" ("createdAt", "datePiece", "dossierId", "fournisseur", "id", "journalId", "montantHT", "montantTTC", "montantTVA", "numeroPiece", "statut", "updatedAt") SELECT "createdAt", "datePiece", "dossierId", "fournisseur", "id", "journalId", "montantHT", "montantTTC", "montantTVA", "numeroPiece", "statut", "updatedAt" FROM "Piece";
DROP TABLE "Piece";
ALTER TABLE "new_Piece" RENAME TO "Piece";
CREATE UNIQUE INDEX "Piece_dossierId_numeroPiece_key" ON "Piece"("dossierId", "numeroPiece");
CREATE TABLE "new_SoldeAnterieur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compteNumero" TEXT NOT NULL,
    "montant" DECIMAL NOT NULL DEFAULT 0,
    "dossierId" TEXT NOT NULL,
    "compteId" TEXT,
    CONSTRAINT "SoldeAnterieur_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SoldeAnterieur_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SoldeAnterieur" ("compteNumero", "dossierId", "id", "montant") SELECT "compteNumero", "dossierId", "id", "montant" FROM "SoldeAnterieur";
DROP TABLE "SoldeAnterieur";
ALTER TABLE "new_SoldeAnterieur" RENAME TO "SoldeAnterieur";
CREATE UNIQUE INDEX "SoldeAnterieur_dossierId_compteNumero_key" ON "SoldeAnterieur"("dossierId", "compteNumero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SequencePiece_dossierId_journalId_exercice_key" ON "SequencePiece"("dossierId", "journalId", "exercice");
