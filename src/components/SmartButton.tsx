// SmartButton — bouton intelligent avec icône, compteur optionnel et label
// Si href est fourni, rendu comme <a>, sinon comme <span>
export function SmartButton({ icone, compteur, label, href }: { icone: string; compteur?: number; label: string; href?: string }) {
  const inner = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
      <span>{icone}</span>{compteur != null && <strong>{compteur}</strong>}<span className="muted">{label}</span>
    </span>
  );
  return href ? <a href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</a> : inner;
}
