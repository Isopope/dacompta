-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Compte" (
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
    CONSTRAINT "Compte_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Compte" ("classeNum", "collectif", "createdAt", "dossierId", "id", "intitule", "natureRacine", "numero", "reportNplus1", "statut", "type", "updatedAt") SELECT "classeNum", "collectif", "createdAt", "dossierId", "id", "intitule", "natureRacine", "numero", "reportNplus1", "statut", "type", "updatedAt" FROM "Compte";
DROP TABLE "Compte";
ALTER TABLE "new_Compte" RENAME TO "Compte";
CREATE UNIQUE INDEX "Compte_dossierId_numero_key" ON "Compte"("dossierId", "numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
