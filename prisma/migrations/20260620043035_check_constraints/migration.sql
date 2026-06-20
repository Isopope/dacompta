-- Migration manuelle : ajout des contraintes CHECK SQLite
-- SQLite ne supporte pas ALTER TABLE ADD CONSTRAINT.
-- Chaque table est reconstruite via le pattern create/insert/drop/rename.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ===========================
-- LigneEcriture
-- CHECK: debit >= 0, credit >= 0, NOT (debit > 0 AND credit > 0), amountResidual >= 0
-- ===========================
CREATE TABLE "LigneEcriture_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pieceId" TEXT NOT NULL,
    "compteNumero" TEXT NOT NULL,
    "libelleLigne" TEXT NOT NULL,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL,
    "sectionAnalytique" TEXT,
    "compteId" TEXT NOT NULL,
    "amountResidual" DECIMAL NOT NULL DEFAULT 0,
    "isLettres" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LigneEcriture_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LigneEcriture_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ck_ligne_debit_pos"   CHECK ("debit" >= 0),
    CONSTRAINT "ck_ligne_credit_pos"  CHECK ("credit" >= 0),
    CONSTRAINT "ck_ligne_sens"        CHECK (NOT ("debit" > 0 AND "credit" > 0)),
    CONSTRAINT "ck_ligne_residuel"    CHECK ("amountResidual" >= 0)
);
INSERT INTO "LigneEcriture_new" ("id", "pieceId", "compteNumero", "libelleLigne", "debit", "credit", "ordre", "sectionAnalytique", "compteId", "amountResidual", "isLettres")
    SELECT "id", "pieceId", "compteNumero", "libelleLigne", "debit", "credit", "ordre", "sectionAnalytique", "compteId", "amountResidual", "isLettres"
    FROM "LigneEcriture";
DROP TABLE "LigneEcriture";
ALTER TABLE "LigneEcriture_new" RENAME TO "LigneEcriture";
CREATE INDEX "LigneEcriture_pieceId_idx" ON "LigneEcriture"("pieceId");

-- ===========================
-- Lettrage
-- CHECK: montant > 0
-- ===========================
CREATE TABLE "Lettrage_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "ligneDebitId" TEXT NOT NULL,
    "ligneCreditId" TEXT NOT NULL,
    "montant" DECIMAL NOT NULL DEFAULT 0,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lettrage_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lettrage_ligneDebitId_fkey" FOREIGN KEY ("ligneDebitId") REFERENCES "LigneEcriture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lettrage_ligneCreditId_fkey" FOREIGN KEY ("ligneCreditId") REFERENCES "LigneEcriture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ck_lettrage_montant_pos" CHECK ("montant" > 0)
);
INSERT INTO "Lettrage_new" ("id", "dossierId", "ligneDebitId", "ligneCreditId", "montant", "auto", "createdAt")
    SELECT "id", "dossierId", "ligneDebitId", "ligneCreditId", "montant", "auto", "createdAt"
    FROM "Lettrage";
DROP TABLE "Lettrage";
ALTER TABLE "Lettrage_new" RENAME TO "Lettrage";
CREATE INDEX "Lettrage_dossierId_idx" ON "Lettrage"("dossierId");
CREATE INDEX "Lettrage_ligneDebitId_idx" ON "Lettrage"("ligneDebitId");
CREATE INDEX "Lettrage_ligneCreditId_idx" ON "Lettrage"("ligneCreditId");

-- ===========================
-- Piece
-- CHECK: statut IN ('BROUILLON','VALIDEE','ANNULEE')
-- ===========================
CREATE TABLE "Piece_new" (
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
    CONSTRAINT "Piece_extourneDeId_fkey" FOREIGN KEY ("extourneDeId") REFERENCES "Piece" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ck_piece_statut" CHECK ("statut" IN ('BROUILLON','VALIDEE','ANNULEE'))
);
INSERT INTO "Piece_new" ("id", "numeroPiece", "datePiece", "fournisseur", "montantHT", "montantTVA", "montantTTC", "statut", "journalId", "dossierId", "createdAt", "updatedAt", "exercice", "dateValidation", "hash", "hashPrecedent", "extourneDeId")
    SELECT "id", "numeroPiece", "datePiece", "fournisseur", "montantHT", "montantTVA", "montantTTC", "statut", "journalId", "dossierId", "createdAt", "updatedAt", "exercice", "dateValidation", "hash", "hashPrecedent", "extourneDeId"
    FROM "Piece";
DROP TABLE "Piece";
ALTER TABLE "Piece_new" RENAME TO "Piece";
CREATE UNIQUE INDEX "Piece_dossierId_numeroPiece_key" ON "Piece"("dossierId", "numeroPiece");

-- ===========================
-- Compte
-- CHECK: statut IN ('ACTIF','ARCHIVE'), type IN ('DETAIL','TOTAL')
-- ===========================
CREATE TABLE "Compte_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "classeNum" INTEGER NOT NULL,
    "natureRacine" TEXT,
    "reportNplus1" BOOLEAN NOT NULL,
    "collectif" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "dossierId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Compte_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ck_compte_statut" CHECK ("statut" IN ('ACTIF','ARCHIVE')),
    CONSTRAINT "ck_compte_type"   CHECK ("type" IN ('DETAIL','TOTAL'))
);
INSERT INTO "Compte_new" ("id", "numero", "intitule", "type", "classeNum", "natureRacine", "reportNplus1", "collectif", "statut", "dossierId", "createdAt", "updatedAt")
    SELECT "id", "numero", "intitule", "type", "classeNum", "natureRacine", "reportNplus1", "collectif", "statut", "dossierId", "createdAt", "updatedAt"
    FROM "Compte";
DROP TABLE "Compte";
ALTER TABLE "Compte_new" RENAME TO "Compte";
CREATE UNIQUE INDEX "Compte_dossierId_numero_key" ON "Compte"("dossierId", "numero");

-- ===========================
-- BudgetPoste
-- CHECK: sens IN ('P','C')
-- ===========================
CREATE TABLE "BudgetPoste_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "prevision" DECIMAL NOT NULL DEFAULT 0,
    "compteLie" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetPoste_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ck_budgetposte_sens" CHECK ("sens" IN ('P','C'))
);
INSERT INTO "BudgetPoste_new" ("id", "code", "libelle", "sens", "prevision", "compteLie", "dossierId", "createdAt", "updatedAt")
    SELECT "id", "code", "libelle", "sens", "prevision", "compteLie", "dossierId", "createdAt", "updatedAt"
    FROM "BudgetPoste";
DROP TABLE "BudgetPoste";
ALTER TABLE "BudgetPoste_new" RENAME TO "BudgetPoste";
CREATE UNIQUE INDEX "BudgetPoste_dossierId_code_key" ON "BudgetPoste"("dossierId", "code");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
