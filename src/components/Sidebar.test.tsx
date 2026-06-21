// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("./DossierSwitcher", () => ({ DossierSwitcher: () => <div data-testid="switcher" /> }));

import { Sidebar, NAV_GROUPS } from "./Sidebar";
import { usePathname } from "next/navigation";

const mockPath = (p: string) => vi.mocked(usePathname).mockReturnValue(p);

beforeEach(() => {
  vi.mocked(usePathname).mockReset();
});

describe("Sidebar", () => {
  it("rend les 4 groupes et les 10 liens attendus avec leurs href", () => {
    mockPath("/");
    render(<Sidebar dossiers={[]} courantId={null} />);
    for (const g of NAV_GROUPS) expect(screen.getByText(g.titre)).toBeTruthy();
    const entrees = NAV_GROUPS.flatMap((g) => g.entrees);
    expect(entrees).toHaveLength(10);
    for (const e of entrees) {
      const lien = screen.getByText(e.label).closest("a");
      expect(lien?.getAttribute("href")).toBe(e.href);
    }
  });

  it("marque l'entrée active via aria-current=page", () => {
    mockPath("/lettrage");
    render(<Sidebar dossiers={[]} courantId={null} />);
    expect(screen.getByText("Lettrage").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Tiers").closest("a")?.getAttribute("aria-current")).toBeNull();
  });

  it("choisit l'entrée la plus spécifique entre préfixes (/etats/tva, pas /etats)", () => {
    mockPath("/etats/tva");
    render(<Sidebar dossiers={[]} courantId={null} />);
    expect(screen.getByText("Déclaration TVA").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("États & documents").closest("a")?.getAttribute("aria-current")).toBeNull();
  });

  it("active l'entrée parente sur un sous-chemin", () => {
    mockPath("/ventes/factures/nouvelle");
    render(<Sidebar dossiers={[]} courantId={null} />);
    expect(screen.getByText("Factures clients").closest("a")?.getAttribute("aria-current")).toBe("page");
  });

  it("ne contient aucun lien mort href=#", () => {
    mockPath("/");
    const { container } = render(<Sidebar dossiers={[]} courantId={null} />);
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it("ne marque aucune entrée active sur un pathname inconnu", () => {
    mockPath("/inconnu");
    const { container } = render(<Sidebar dossiers={[]} courantId={null} />);
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
  });
});
