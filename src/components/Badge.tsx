// Badge — composant de label avec variant optionnel (ok | warn | muted)
export function Badge({ label, variant = "muted" }: { label: string; variant?: "ok" | "warn" | "muted" }) {
  const bg = variant === "ok" ? "#dcfce7" : variant === "warn" ? "#fef9c3" : "#f1f5f9";
  const fg = variant === "ok" ? "#166534" : variant === "warn" ? "#854d0e" : "#475569";
  return <span className="badge" style={{ background: bg, color: fg, padding: "2px 8px", borderRadius: 6 }}>{label}</span>;
}
