"use client";
import { useState } from "react";
import type { ClasseDef, NatureDef } from "@/lib/syscohada/referentiel";
import TabPlan from "./TabPlan";
import TabNatures from "./TabNatures";
import TabImport from "./TabImport";

type Compte = Awaited<ReturnType<typeof import("@/server/comptes").listerComptes>>[number];

export default function PlanComptableClient(props: {
  dossierId: string;
  comptesInitiaux: Compte[];
  classes: ClasseDef[];
  natures: NatureDef[];
}) {
  const [onglet, setOnglet] = useState<"plan" | "natures" | "import">("plan");
  return (
    <>
      <div className="tabs">
        <button className={"tab" + (onglet === "plan" ? " active" : "")} onClick={() => setOnglet("plan")}>Plan comptable</button>
        <button className={"tab" + (onglet === "natures" ? " active" : "")} onClick={() => setOnglet("natures")}>Natures</button>
        <button className={"tab" + (onglet === "import" ? " active" : "")} onClick={() => setOnglet("import")}>Importer</button>
      </div>
      {onglet === "plan" && <TabPlan dossierId={props.dossierId} comptesInitiaux={props.comptesInitiaux} classes={props.classes} natures={props.natures} />}
      {onglet === "natures" && <TabNatures natures={props.natures} />}
      {onglet === "import" && <TabImport dossierId={props.dossierId} />}
    </>
  );
}
