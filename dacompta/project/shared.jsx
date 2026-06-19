/* global React */
// Shared wireframe primitives for DaCompta gallery.
const { useState } = React;

/* ---- tiny building blocks ---- */
function Ln({ w, dk, style }) {
  return <div className={"ln" + (dk ? " dk" : "")} style={{ width: w, ...style }} />;
}
function Lines({ rows = 3, widths }) {
  const def = ["90%", "70%", "80%", "55%", "65%"];
  return (
    <div className="col g8">
      {Array.from({ length: rows }).map((_, i) => (
        <Ln key={i} w={(widths && widths[i]) || def[i % def.length]} />
      ))}
    </div>
  );
}
function Chip({ children, kind }) { return <span className={"chip" + (kind ? " " + kind : "")}>{children}</span>; }
function Btn({ children, kind, sm, onClick }) {
  return <span className={"btn" + (kind ? " " + kind : "") + (sm ? " sm" : "")} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>{children}</span>;
}
function Mark({ children }) { return <span className="mark">{children}</span>; }
function Note({ children, style }) { return <div className="note" style={style}>{children}</div>; }

/* handwritten callout that hides when annotations are off */
function Annot({ children, style }) {
  return <div className="annotation annot" style={style}><span className="annot-pin">{children}</span></div>;
}

/* ---- mock window chrome ---- */
function Win({ title, children, sync = "Synchronisé", lang = "FR" }) {
  return (
    <div className="appframe">
      <div className="win-bar">
        <div className="dots"><i /><i /><i /></div>
        <div className="small muted" style={{ marginLeft: 4 }}>{title}</div>
        <div className="grow" style={{ flex: 1 }} />
        <span className="pill-sync"><span className="dot" /> {sync}</span>
        <span className="chip fill" style={{ fontSize: ".78em" }}>{lang} ⇄ EN</span>
      </div>
      {children}
    </div>
  );
}

/* ---- sidebar ---- */
function Sidebar({ items, footer }) {
  return (
    <aside className="side">
      <div className="brand">
        <div className="logo">Dₐ</div>
        <div className="name">DaCompta</div>
      </div>
      {items.map((it, i) =>
        it.sect ? (
          <div key={i} className="nav-sect">{it.sect}</div>
        ) : (
          <div key={i} className={"nav-item" + (it.active ? " active" : "")}>
            <span className="ico">{it.ico}</span>
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.badge && <span className="chip ai" style={{ fontSize: ".72em", padding: "0 7px" }}>{it.badge}</span>}
          </div>
        )
      )}
      <div style={{ flex: 1 }} />
      {footer}
    </aside>
  );
}

/* clients/dossier switcher for cabinet */
function DossierSwitcher({ name, sub }) {
  return (
    <div className="card fill" style={{ padding: "8px 11px", display: "flex", alignItems: "center", gap: 9 }}>
      <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>
      <div className="col" style={{ lineHeight: 1.1 }}>
        <span className="b">{name}</span>
        <span className="muted small">{sub}</span>
      </div>
      <span className="muted" style={{ marginLeft: 6 }}>▾</span>
    </div>
  );
}

function Card({ title, right, children, fill, style, className }) {
  return (
    <div className={"card" + (fill ? " fill" : "") + (className ? " " + className : "")} style={style}>
      {(title || right) && (
        <div className="card-h">
          {title && <span className="t">{title}</span>}
          <div style={{ flex: 1 }} />
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ v, k, trend }) {
  return (
    <div className="card kpi">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
      {trend && <div className="small" style={{ marginTop: 6 }}>{trend}</div>}
    </div>
  );
}

/* simple sketch bar chart */
function Bars({ data, h = 90 }) {
  const max = Math.max(...data);
  return (
    <div className="flex" style={{ alignItems: "flex-end", gap: 8, height: h }}>
      {data.map((d, i) => (
        <div key={i} style={{
          flex: 1, height: (d / max) * 100 + "%",
          background: i === data.length - 1 ? "var(--accent)" : "var(--fill-2)",
          border: "2px solid var(--line)", borderRadius: "6px 6px 0 0"
        }} />
      ))}
    </div>
  );
}

/* pièce justificative — zone d'attachement */
function PieceSlot({ name, type, ocr, empty }) {
  return (
    <div className={"piece-slot" + (empty ? " empty" : "")}>
      {empty ? (
        <React.Fragment>
          <span className="piece-ico">📎</span>
          <span className="small muted">Joindre la pièce justificative (PDF, image, scan)</span>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <span className="piece-ico">📄</span>
          <div className="col" style={{ flex: 1, lineHeight: 1.2 }}>
            <span className="small b">{name || "Pièce jointe"}</span>
            <span className="muted small">{type || "PDF · 230 Ko"}</span>
          </div>
          {ocr && <span className="chip ai" style={{ fontSize: ".66em" }}>✦ OCR</span>}
          <span className="muted small" style={{ cursor: "pointer" }}>👁</span>
        </React.Fragment>
      )}
    </div>
  );
}

Object.assign(window, {
  Ln, Lines, Chip, Btn, Mark, Note, Annot, Win, Sidebar, DossierSwitcher, Card, Kpi, Bars, PieceSlot,
});
