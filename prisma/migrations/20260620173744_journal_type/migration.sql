-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Journal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'misc',
    "dossierId" TEXT NOT NULL,
    CONSTRAINT "Journal_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Journal" ("code", "dossierId", "id", "libelle") SELECT "code", "dossierId", "id", "libelle" FROM "Journal";
DROP TABLE "Journal";
ALTER TABLE "new_Journal" RENAME TO "Journal";
CREATE UNIQUE INDEX "Journal_dossierId_code_key" ON "Journal"("dossierId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
