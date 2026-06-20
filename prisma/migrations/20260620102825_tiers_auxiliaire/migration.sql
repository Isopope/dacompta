-- CreateTable
CREATE TABLE "Tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tiers_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "compteId" TEXT NOT NULL,
    "tiersId" TEXT,
    "amountResidual" DECIMAL NOT NULL DEFAULT 0,
    "isLettres" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LigneEcriture_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LigneEcriture_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LigneEcriture_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "Tiers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LigneEcriture" ("amountResidual", "compteId", "compteNumero", "credit", "debit", "id", "isLettres", "libelleLigne", "ordre", "pieceId", "sectionAnalytique") SELECT "amountResidual", "compteId", "compteNumero", "credit", "debit", "id", "isLettres", "libelleLigne", "ordre", "pieceId", "sectionAnalytique" FROM "LigneEcriture";
DROP TABLE "LigneEcriture";
ALTER TABLE "new_LigneEcriture" RENAME TO "LigneEcriture";
CREATE INDEX "LigneEcriture_pieceId_idx" ON "LigneEcriture"("pieceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Tiers_dossierId_idx" ON "Tiers"("dossierId");

-- CreateIndex
CREATE UNIQUE INDEX "Tiers_dossierId_code_key" ON "Tiers"("dossierId", "code");
