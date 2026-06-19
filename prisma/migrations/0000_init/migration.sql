-- CreateTable
CREATE TABLE "Referentiel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Classe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "referentielId" TEXT NOT NULL,
    CONSTRAINT "Classe_referentielId_fkey" FOREIGN KEY ("referentielId") REFERENCES "Referentiel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "racine" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "reportNplus1" BOOLEAN NOT NULL,
    "referentielId" TEXT NOT NULL,
    CONSTRAINT "Nature_referentielId_fkey" FOREIGN KEY ("referentielId") REFERENCES "Referentiel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "devise" TEXT NOT NULL,
    "exercice" INTEGER NOT NULL,
    "referentielId" TEXT NOT NULL,
    CONSTRAINT "Dossier_referentielId_fkey" FOREIGN KEY ("referentielId") REFERENCES "Referentiel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Compte" (
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
    CONSTRAINT "Compte_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "fichierNom" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "snapshotAvant" TEXT NOT NULL,
    "compteIds" TEXT NOT NULL,
    "annule" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportLog_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    CONSTRAINT "Journal_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Piece" (
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
    CONSTRAINT "Piece_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Piece_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetPoste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "prevision" DECIMAL NOT NULL DEFAULT 0,
    "compteLie" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetPoste_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SoldeAnterieur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compteNumero" TEXT NOT NULL,
    "montant" DECIMAL NOT NULL DEFAULT 0,
    "dossierId" TEXT NOT NULL,
    CONSTRAINT "SoldeAnterieur_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LigneEcriture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pieceId" TEXT NOT NULL,
    "compteNumero" TEXT NOT NULL,
    "libelleLigne" TEXT NOT NULL,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL,
    "sectionAnalytique" TEXT,
    "amountResidual" DECIMAL NOT NULL DEFAULT 0,
    "isLettres" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LigneEcriture_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lettrage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "ligneDebitId" TEXT NOT NULL,
    "ligneCreditId" TEXT NOT NULL,
    "montant" DECIMAL NOT NULL DEFAULT 0,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lettrage_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lettrage_ligneDebitId_fkey" FOREIGN KEY ("ligneDebitId") REFERENCES "LigneEcriture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lettrage_ligneCreditId_fkey" FOREIGN KEY ("ligneCreditId") REFERENCES "LigneEcriture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegleLettrage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dossierId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prefixeCompte" TEXT NOT NULL,
    "tolerancePct" REAL NOT NULL DEFAULT 0,
    "toleranceJours" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegleLettrage_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Referentiel_code_key" ON "Referentiel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Classe_referentielId_numero_key" ON "Classe"("referentielId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Nature_referentielId_racine_key" ON "Nature"("referentielId", "racine");

-- CreateIndex
CREATE UNIQUE INDEX "Compte_dossierId_numero_key" ON "Compte"("dossierId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_dossierId_code_key" ON "Journal"("dossierId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Piece_dossierId_numeroPiece_key" ON "Piece"("dossierId", "numeroPiece");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPoste_dossierId_code_key" ON "BudgetPoste"("dossierId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "SoldeAnterieur_dossierId_compteNumero_key" ON "SoldeAnterieur"("dossierId", "compteNumero");

-- CreateIndex
CREATE INDEX "LigneEcriture_pieceId_idx" ON "LigneEcriture"("pieceId");

-- CreateIndex
CREATE INDEX "Lettrage_dossierId_idx" ON "Lettrage"("dossierId");

-- CreateIndex
CREATE INDEX "Lettrage_ligneDebitId_idx" ON "Lettrage"("ligneDebitId");

-- CreateIndex
CREATE INDEX "Lettrage_ligneCreditId_idx" ON "Lettrage"("ligneCreditId");

-- CreateIndex
CREATE INDEX "RegleLettrage_dossierId_idx" ON "RegleLettrage"("dossierId");
