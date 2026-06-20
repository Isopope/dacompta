-- Migration manuelle : rétablit les contraintes CHECK perdues lors des
-- reconstructions de table SQLite (ajout de accountType/reconciliable sur Compte,
-- ajout de tiersId sur LigneEcriture). Prisma ignore les CHECK ajoutés à la main,
-- donc on les recrée ici sur la forme courante des tables.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ===========================
-- LigneEcriture (avec tiersId + CHECK)
-- ===========================
CREATE TABLE "LigneEcriture_ck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pieceId" TEXT NOT NULL,
    "compteNumero" TEXT NOT NULL,
    "libelleLigne" TEXT NOT NULL,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL,
    "sectionAnalytique" TEXT,
    "compteId" TEXT NOT NULL,
    "amountResidual" DECIMAL NOT NULL DEFAULT 0,
    "isLettres" BOOLEAN NOT NULL DEFAULT false,
    "tiersId" TEXT,
    "taxeId" TEXT,
    CONSTRAINT "LigneEcriture_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LigneEcriture_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LigneEcriture_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "Tiers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LigneEcriture_taxeId_fkey" FOREIGN KEY ("taxeId") REFERENCES "Taxe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ck_ligne_debit_pos"   CHECK ("debit" >= 0),
    CONSTRAINT "ck_ligne_credit_pos"  CHECK ("credit" >= 0),
    CONSTRAINT "ck_ligne_sens"        CHECK (NOT ("debit" > 0 AND "credit" > 0)),
    CONSTRAINT "ck_ligne_residuel"    CHECK ("amountResidual" >= 0)
);
INSERT INTO "LigneEcriture_ck" ("id", "pieceId", "compteNumero", "libelleLigne", "debit", "credit", "balance", "ordre", "sectionAnalytique", "compteId", "amountResidual", "isLettres", "tiersId", "taxeId")
    SELECT "id", "pieceId", "compteNumero", "libelleLigne", "debit", "credit", "balance", "ordre", "sectionAnalytique", "compteId", "amountResidual", "isLettres", "tiersId", "taxeId"
    FROM "LigneEcriture";
DROP TABLE "LigneEcriture";
ALTER TABLE "LigneEcriture_ck" RENAME TO "LigneEcriture";
CREATE INDEX "LigneEcriture_pieceId_idx" ON "LigneEcriture"("pieceId");

-- ===========================
-- Compte (avec accountType/reconciliable + CHECK)
-- ===========================
CREATE TABLE "Compte_ck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "classeNum" INTEGER NOT NULL,
    "natureRacine" TEXT,
    "reportNplus1" BOOLEAN NOT NULL,
    "collectif" BOOLEAN NOT NULL DEFAULT false,
    "accountType" TEXT NOT NULL DEFAULT 'off_balance',
    "reconciliable" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "dossierId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Compte_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ck_compte_statut" CHECK ("statut" IN ('ACTIF','ARCHIVE')),
    CONSTRAINT "ck_compte_type"   CHECK ("type" IN ('DETAIL','TOTAL'))
);
INSERT INTO "Compte_ck" ("id", "numero", "intitule", "type", "classeNum", "natureRacine", "reportNplus1", "collectif", "accountType", "reconciliable", "statut", "dossierId", "createdAt", "updatedAt")
    SELECT "id", "numero", "intitule", "type", "classeNum", "natureRacine", "reportNplus1", "collectif", "accountType", "reconciliable", "statut", "dossierId", "createdAt", "updatedAt"
    FROM "Compte";
DROP TABLE "Compte";
ALTER TABLE "Compte_ck" RENAME TO "Compte";
CREATE UNIQUE INDEX "Compte_dossierId_numero_key" ON "Compte"("dossierId", "numero");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
