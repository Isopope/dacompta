// src/app/dossiers/nouveau/page.tsx
// Page autonome de création de dossier (ne requiert pas de dossier courant).
import { PAYS } from "@/lib/syscohada/referentiel";
import { NouveauDossierWizard } from "./NouveauDossierWizard";

export const dynamic = "force-dynamic";

export default function Page() {
  // On ne passe au client que les champs utiles (donnée statique).
  const pays = PAYS.map((p) => ({ pays: p.pays, devise: p.devise, tva: p.tva }));
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>Nouveau dossier</h1>
      <NouveauDossierWizard pays={pays} />
    </div>
  );
}
