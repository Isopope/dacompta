// Tableau de bord cockpit — point d'entrée : KPIs + files actionnables du dossier
// courant + prochaine action, et une vue portefeuille multi-dossier.
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getCockpit } from "@/server/cockpit";
import { getPortefeuille } from "@/server/portefeuille";
import { MesDossiers } from "./MesDossiers";

// Chiffres déduits d'une base vivante : rendu dynamique, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function Page() {
  const dossierId = await getDossierIdCookie();
  const dossier = dossierId
    ? await prisma.dossier.findUnique({ where: { id: dossierId } })
    : null;

  // Cockpit du dossier courant (si présent) + portefeuille (toujours).
  const [cockpit, portefeuille] = await Promise.all([
    dossier ? getCockpit(dossier.id) : Promise.resolve(null),
    getPortefeuille(),
  ]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const devise = dossier?.devise ?? "";

  return (
    <Shell
      breadcrumb={[{ label: "Tableau de bord" }]}
      horsGarde={<MesDossiers dossiers={portefeuille} courantId={dossierId} />}
    >
      {cockpit && dossier && (
        <>
          {/* Zone 1 — actions primaires */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Link href="/ecritures" className="panel" style={{ padding: "8px 14px", textDecoration: "none", color: "inherit", fontWeight: 700 }}>
              + Saisir une pièce
            </Link>
            <Link href="/ventes/factures/nouvelle" className="panel" style={{ padding: "8px 14px", textDecoration: "none", color: "inherit" }}>
              Nouvelle facture
            </Link>
          </div>

          {/* Zone 2 — prochaine action + files à traiter */}
          {cockpit.prochaineAction ? (
            <Link
              href={cockpit.prochaineAction.href}
              className="panel"
              style={{ display: "block", padding: 16, marginBottom: 12, borderLeft: "3px solid var(--accent)", textDecoration: "none", color: "inherit" }}
            >
              <span className="muted" style={{ fontSize: 12 }}>Prochaine action</span>
              <div style={{ fontWeight: 700 }}>{cockpit.prochaineAction.libelle} →</div>
            </Link>
          ) : (
            <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
              <span className="muted">Rien d&apos;urgent.</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginBottom: 24 }}>
            <Link href={cockpit.aControler.href} className="panel" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
              <div className="muted" style={{ fontSize: 12 }}>À contrôler</div>
              <div className="mono" style={{ fontSize: 24 }}>{cockpit.aControler.count}</div>
              <div className="muted" style={{ fontSize: 12 }}>{cockpit.aControler.count === 0 ? "Rien à contrôler" : "pièces en brouillon"}</div>
            </Link>
            <Link href={cockpit.aLettrer.href} className="panel" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
              <div className="muted" style={{ fontSize: 12 }}>À lettrer</div>
              <div className="mono" style={{ fontSize: 24 }}>{cockpit.aLettrer.count}</div>
              <div className="muted" style={{ fontSize: 12 }}>{cockpit.aLettrer.count === 0 ? "Rien à lettrer" : "lignes ouvertes"}</div>
            </Link>
            <Link href={cockpit.aDeclarer.href} className="panel" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
              <div className="muted" style={{ fontSize: 12 }}>À déclarer</div>
              <div className="mono" style={{ fontSize: 24 }}>{fmt(cockpit.aDeclarer.netteDue)} {devise}</div>
              <div className="muted" style={{ fontSize: 12 }}>{cockpit.aDeclarer.netteDue <= 0 ? "Rien à déclarer" : "TVA nette due"}</div>
            </Link>
          </div>

          {/* Zone 3 — KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Résultat net", v: cockpit.kpis.resultatNet },
              { label: "Trésorerie", v: cockpit.kpis.tresorerie },
              { label: "Chiffre d'affaires", v: cockpit.kpis.chiffreAffaires },
              { label: "Charges", v: cockpit.kpis.totalCharges },
            ].map((k) => (
              <div key={k.label} className="panel" style={{ padding: 16 }}>
                <div className="muted" style={{ fontSize: 12 }}>{k.label}</div>
                <div className="mono" style={{ fontSize: 20 }}>{fmt(k.v)} {devise}</div>
              </div>
            ))}
          </div>

          {/* Zone 5 — journaux */}
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Journaux</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {cockpit.journaux.map((j) => (
              <Link key={j.code} href="/ecritures" className="panel" style={{ padding: 12, textDecoration: "none", color: "inherit" }}>
                <div style={{ fontWeight: 700 }}>{j.code} — {j.libelle}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {j.nbPieces} pièce(s){j.nbBrouillons > 0 ? ` · ${j.nbBrouillons} brouillon(s)` : ""}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
