import { Fragment, useEffect, useMemo, useState } from "react";

const MIN_SIZE = 3;
const MAX_SIZE = 13;
const DEFAULT_SIZE = 7;
const DEFAULT_KEYS_TEXT = "11, 6, 4, 98, 96, 15, 25";

const MODES = [
  { id: "chaining", label: "Encadenamiento" },
  { id: "linear", label: "Sondeo lineal" },
  { id: "quadratic", label: "Sondeo cuadrático" },
];

const OUTCOME_TEXT = {
  ok: "Insertado",
  dup: "Ya existía",
  full: "Sin lugar libre",
};

function parseKeys(text) {
  const tokens = text.split(/[,\s]+/).filter(Boolean);
  if (tokens.length === 0) return { error: "Escribe al menos una clave." };
  if (tokens.length > 30) return { error: "Usa máximo 30 claves." };

  const keys = [];
  for (const token of tokens) {
    if (!/^\d+$/.test(token) || Number(token) > 999999) {
      return { error: `"${token}" no es válido. Usa números enteros desde 0.` };
    }
    keys.push(Number(token));
  }
  return { keys };
}

function buildFrames(keys, size, mode) {
  const frames = [];
  const isChaining = mode === "chaining";
  const unit = isChaining ? "cubeta" : "casilla";
  const slots = Array.from({ length: size }, () => null);
  const buckets = Array.from({ length: size }, () => []);
  let totalCollisions = 0;

  const push = (frame) => {
    frames.push({
      ...frame,
      slots: [...slots],
      buckets: buckets.map((bucket) => [...bucket]),
      n: isChaining
        ? buckets.reduce((total, bucket) => total + bucket.length, 0)
        : slots.filter((slot) => slot !== null).length,
      totalCollisions,
    });
  };

  push({
    keyIndex: -1, key: null, hash: null, formula: "", active: null,
    entry: null, entryState: null, visited: [], probes: 0, collisions: 0, tag: null,
    collision: null,
    message: `Tabla vacía de ${size} ${unit}s. Presiona Iniciar o Siguiente paso.`,
    outcome: null, done: false, kind: "info",
  });

  keys.forEach((key, keyIndex) => {
    const hash = key % size;
    const base = { keyIndex, key, hash };
    const emit = (extra) => push({
      active: null, entry: null, entryState: null, visited: [], formula: "",
      outcome: null, done: false, kind: "info", probes: 0, collisions: 0,
      tag: null, message: "", collision: null,
      ...base, ...extra,
    });
    const hashFormula = `${key} → ${key} % ${size} → [${hash}]`;
    const indexAt = (k) => (mode === "linear" ? (hash + k) % size : (hash + k * k) % size);
    const probeText = (k) => (
      mode === "linear"
        ? `(${hash} + ${k}) % ${size} = ${indexAt(k)}`
        : `(${hash} + ${k}²) % ${size} = ${indexAt(k)}`
    );

    emit({
      formula: hashFormula, active: hash, tag: "hash",
      message: `Insertar ${key}: ${key} % ${size} = ${hash}, ${unit} ${hash}.`,
    });

    // Encadenamiento: cada cubeta guarda una lista; si ya hay claves, se agrega al final
    if (isChaining) {
      const bucket = buckets[hash];
      const common = { formula: hashFormula, active: hash };

      if (bucket.includes(key)) {
        emit({ ...common, probes: bucket.length,
          entry: { bucket: hash, pos: bucket.indexOf(key) }, entryState: "fail", tag: "hit",
          message: `La clave ${key} ya está en la cubeta ${hash}; no se inserta de nuevo.`,
          outcome: "dup", done: true, kind: "error" });
        return;
      }

      const hadCollision = bucket.length > 0;
      if (hadCollision) {
        totalCollisions += 1;
        emit({
          ...common, probes: bucket.length, collisions: 1, entryState: "collision", tag: "compare",
          collision: {
            occupant: bucket.join(", "),
            count: bucket.length,
            idx: hash,
            nextIdx: null,
            nextText: null,
            resolution: `La clave ${key} se agrega al final de la lista de la cubeta ${hash}.`,
          },
          message: `Colisión: la cubeta ${hash} ya tiene ${bucket.join(", ")}. La clave ${key} se agrega a la lista.`,
        });
      }

      bucket.push(key);
      emit({
        ...common, probes: Math.max(bucket.length - 1, 1), collisions: hadCollision ? 1 : 0,
        entry: { bucket: hash, pos: bucket.length - 1 }, entryState: "success", tag: "place",
        message: hadCollision
          ? `Colisión resuelta: ${key} se agrega al final de la lista de la cubeta ${hash}.`
          : `La cubeta ${hash} está vacía: se inserta ${key}, sin colisión.`,
        outcome: "ok", done: true, kind: "success",
      });
      return;
    }

    const visited = [];
    let finished = false;

    for (let k = 0; k < size; k += 1) {
      const idx = indexAt(k);
      const slot = slots[idx];
      const formula = k === 0
        ? hashFormula
        : mode === "linear"
          ? `(${hash} + ${k}) % ${size} → [${idx}]`
          : `(${hash} + ${k}²) % ${size} → [${idx}]`;
      const common = { formula, active: idx, visited: [...visited], probes: k + 1 };

      if (slot === key) {
        emit({ ...common, collisions: k, entryState: "fail", tag: "hit",
          message: `La casilla ${idx} ya contiene ${key}; no se inserta de nuevo.`,
          outcome: "dup", done: true, kind: "error" });
        finished = true;
        break;
      }

      if (slot === null) {
        slots[idx] = key;
        emit({ ...common, collisions: k, entryState: "success", tag: "place",
          message: k === 0
            ? `La casilla ${idx} está libre: se inserta ${key}, sin colisión.`
            : `La casilla ${idx} está libre tras ${k} ${k === 1 ? "colisión" : "colisiones"}: se inserta ${key}.`,
          outcome: "ok", done: true, kind: "success" });
        finished = true;
        break;
      }

      const hasNext = k + 1 < size;
      const nextIdx = hasNext ? indexAt(k + 1) : null;
      totalCollisions += 1;
      emit({
        ...common, collisions: k + 1, entryState: "collision", tag: "compare",
        collision: {
          occupant: slot,
          idx,
          nextIdx,
          nextText: hasNext ? probeText(k + 1) : null,
        },
        message: hasNext
          ? `Colisión: la casilla ${idx} ya tiene ${slot}. Siguiente intento: ${probeText(k + 1)}`
          : `Colisión: la casilla ${idx} ya tiene ${slot}. Ya no quedan más intentos.`,
      });
      visited.push(idx);
    }

    if (!finished) {
      emit({
        visited: [...visited], probes: size, collisions: size, tag: "end",
        message: mode === "quadratic" && slots.includes(null)
          ? `El sondeo cuadrático no llegó a una casilla libre en ${size} intentos, aunque la tabla aún tiene espacio.`
          : `No se encontró una casilla libre para ${key} después de ${size} sondeos.`,
        outcome: "full", done: true, kind: "error",
      });
    }
  });

  return frames;
}

function getCodeLines(mode) {
  let lines;
  if (mode === "chaining") {
    lines = [
      [0, "def insertar(tabla, clave):", null],
      [1, "i = clave % len(tabla)", "hash"],
      [1, "for x in tabla[i]:", null],
      [2, "if x == clave:", "compare"],
      [3, "return False", "hit"],
      [1, "tabla[i].append(clave)", "place"],
      [1, "return True", null],
    ];
  } else {
    const step = mode === "linear" ? "(h + k) % m" : "(h + k * k) % m";
    lines = [
      [0, "def insertar(tabla, clave):", null],
      [1, "m = len(tabla)", null],
      [1, "h = clave % m", "hash"],
      [1, "for k in range(m):", null],
      [2, `i = ${step}`, null],
      [2, "if tabla[i] == clave:", "compare"],
      [3, "return False", "hit"],
      [2, "if tabla[i] is None:", null],
      [3, "tabla[i] = clave", "place"],
      [3, "return True", null],
      [1, "return False", "end"],
    ];
  }

  return lines.map(([level, text, tag], index) => ({
    num: index + 1,
    text: " ".repeat(level * 4) + text,
    tag,
  }));
}

function renderFormula(text) {
  return text.split(/(\[\d+\])/).map((part, index) => (
    /^\[\d+\]$/.test(part)
      ? <span className="hash-index-ref" key={index}>{part}</span>
      : <span key={index}>{part}</span>
  ));
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="5" x2="5" y2="19" />
      <polygon points="19,5 9,12 19,19" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function StepIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5,5 15,12 5,19" fill="currentColor" stroke="none" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

const BLUE_THEME_STYLES = `
  .linear-search-page {
    --bg-deep: #070c17;
    --bg-card: #0b1324;
    --bg-panel: #111c30;
    --bg-input: #080f1e;
    --border: #26364f;
    --border-strong: #35507a;

    --blue: #2563eb;
    --blue-hover: #3b82f6;
    --sky: #38bdf8;
    --amber: #f59e0b;
    --amber-soft: #fcd34d;
    --green: #34d399;
    --red: #f87171;
    --violet: #a78bfa;
    --orange: #fb923c;
    --range: #818cf8;

    --text-primary: #f0f9ff;
    --text-secondary: #a9c4ee;
    --text-muted: #7391bd;

    min-height: 100vh;
    padding: 2rem 1rem;
    background: radial-gradient(circle at top, #14213a 0%, var(--bg-deep) 62%);
    color: var(--text-primary);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    box-sizing: border-box;
  }

  .linear-search-page *,
  .linear-search-page *::before,
  .linear-search-page *::after { box-sizing: border-box; }

  .linear-search-card {
    width: 100%;
    max-width: 840px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgba(4, 9, 20, 0.7);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .linear-search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .eyebrow {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--sky);
    margin-bottom: 0.2rem;
  }

  .linear-search-header h1 {
    margin: 0;
    font-size: 1.75rem;
    color: var(--text-primary);
  }

  .search-toolbar,
  .array-editor {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: flex-end;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.95rem 1rem;
  }

  .search-toolbar {
    position: sticky;
    top: 0.75rem;
    z-index: 20;
    background: rgba(17, 28, 48, 0.95);
    backdrop-filter: blur(8px);
    border-color: var(--border-strong);
    box-shadow: 0 12px 28px rgba(4, 9, 20, 0.55);
  }

  .target-field,
  .values-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .values-field { flex: 1 1 240px; }

  .target-field input,
  .values-field input {
    height: 40px;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0 0.75rem;
    font-size: 0.95rem;
    outline: none;
  }

  .target-field input { width: 120px; }

  .target-field input:focus,
  .values-field input:focus {
    border-color: var(--sky);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
  }

  .search-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .search-toolbar .search-actions { margin-left: auto; }

  .button {
    height: 40px;
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 0 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
  }

  .button-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    padding: 0;
    border-radius: 50%;
  }

  .button-primary {
    background: var(--blue);
    border-color: var(--blue-hover);
    color: #ffffff;
  }
  .button-primary:hover:not(:disabled) { background: var(--blue-hover); }

  .button-secondary {
    background: #1a2a45;
    border-color: var(--border-strong);
    color: #dbeafe;
  }
  .button-secondary:hover:not(:disabled) {
    background: #243a5e;
    border-color: var(--sky);
  }

  .button-ghost {
    background: transparent;
    border-color: var(--border-strong);
    color: var(--text-secondary);
  }
  .button-ghost:hover:not(:disabled) {
    background: rgba(56, 189, 248, 0.1);
    border-color: var(--sky);
    color: var(--text-primary);
  }

  .button-accent {
    background: rgba(56, 189, 248, 0.1);
    border-color: rgba(56, 189, 248, 0.5);
    color: #bae6fd;
  }
  .button-accent:hover:not(:disabled) {
    background: rgba(56, 189, 248, 0.2);
    border-color: var(--sky);
    color: #ffffff;
  }

  .button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .button:focus-visible,
  .close-chart-btn:focus-visible {
    outline: 2px solid var(--sky);
    outline-offset: 2px;
  }

  .array-error {
    width: 100%;
    margin: 0.15rem 0 0;
    font-size: 0.85rem;
    color: var(--red);
  }

  .search-summary-panel {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.75rem;
  }

  .search-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .search-summary-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-input);
    padding: 0.55rem 0.65rem;
  }

  .search-summary-card span {
    display: block;
    color: var(--text-muted);
    font-size: 0.72rem;
  }

  .search-summary-card strong {
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  @media (max-width: 620px) {
    .search-summary { grid-template-columns: 1fr; }
    .chart-math-box { grid-template-columns: 1fr; }
  }

  .search-status {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg-panel);
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--text-muted);
    flex-shrink: 0;
  }

  .search-status-success {
    background: rgba(52, 211, 153, 0.1);
    border-color: rgba(52, 211, 153, 0.6);
    color: #d1fae5;
  }
  .search-status-success .status-dot { background: var(--green); }

  .search-status-error {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.55);
    color: #fee2e2;
  }
  .search-status-error .status-dot { background: var(--red); }

  .array-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .array-heading {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .array-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 0.4rem 0;
    padding: 0.6rem 0.5rem;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  .array-slot {
    flex: 1 0 74px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.4rem 0.3rem;
    border: 1px solid transparent;
    border-left-width: 0;
    border-right-width: 0;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .array-slot-range {
    background: rgba(129, 140, 248, 0.1);
    border-top-color: var(--range);
    border-bottom-color: var(--range);
  }

  .array-slot-range-start {
    border-left-width: 1px;
    border-left-color: var(--range);
    border-top-left-radius: 14px;
    border-bottom-left-radius: 14px;
  }

  .array-slot-range-end {
    border-right-width: 1px;
    border-right-color: var(--range);
    border-top-right-radius: 14px;
    border-bottom-right-radius: 14px;
  }

  .array-grid-found .array-slot-range {
    background: rgba(52, 211, 153, 0.08);
    border-top-color: var(--green);
    border-bottom-color: var(--green);
  }
  .array-grid-found .array-slot-range-start { border-left-color: var(--green); }
  .array-grid-found .array-slot-range-end { border-right-color: var(--green); }

  .pointer-markers {
    min-height: 1.25rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.15rem;
  }

  .pointer-mark {
    min-width: 1.2rem;
    padding: 0.12rem 0.25rem;
    border: 1px solid;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 800;
    line-height: 1;
    text-align: center;
  }

  .pointer-left {
    border-color: rgba(56, 189, 248, 0.6);
    background: rgba(56, 189, 248, 0.16);
    color: #bae6fd;
  }

  .pointer-middle {
    border-color: rgba(245, 158, 11, 0.65);
    background: rgba(245, 158, 11, 0.16);
    color: #fde68a;
  }

  .pointer-right {
    border-color: rgba(167, 139, 250, 0.65);
    background: rgba(167, 139, 250, 0.16);
    color: #ddd6fe;
  }

  .pointer-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.78rem;
  }

  .pointer-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .array-cell {
    position: relative;
    min-height: 82px;
    border-radius: 10px;
    border: 1px solid var(--border-strong);
    background: #14233c;
    padding: 0.55rem 0.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
  }

  .cell-value {
    font-size: 1.15rem;
    color: var(--text-primary);
  }

  .cell-index {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .cell-label {
    font-size: 0.68rem;
    font-weight: 700;
  }

  .array-cell-current {
    background: rgba(245, 158, 11, 0.16);
    border-color: var(--amber);
    box-shadow: 0 0 14px rgba(245, 158, 11, 0.3);
    transform: translateY(-2px);
  }
  .array-cell-current .cell-label,
  .array-cell-current .cell-value { color: #fde68a; }

  .array-cell-checked {
    background: var(--bg-deep);
    border-color: var(--border);
    opacity: 0.5;
  }
  .array-cell-checked .cell-value { color: var(--text-muted); }
  .array-cell-checked .cell-label { color: var(--text-muted); }

  .array-cell-found {
    background: rgba(52, 211, 153, 0.18);
    border-color: var(--green);
    box-shadow: 0 0 16px rgba(52, 211, 153, 0.35);
    transform: translateY(-2px);
  }
  .array-cell-found .cell-label { color: #a7f3d0; }
  .array-cell-found .cell-value { color: #ffffff; }

  .code-section {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.95rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .code-vars {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.78rem;
  }

  .code-var-pill {
    background: var(--bg-input);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 0.22rem 0.55rem;
    border-radius: 6px;
  }

  .code-block {
    margin: 0;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.55rem 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    overflow-x: auto;
  }

  .code-line {
    display: flex;
    align-items: center;
    padding: 0.12rem 0.9rem;
    border-left: 3px solid transparent;
    color: var(--text-secondary);
  }

  .code-line-num {
    width: 24px;
    flex-shrink: 0;
    color: var(--text-muted);
    user-select: none;
    font-size: 0.76rem;
  }

  .code-line-text { white-space: pre; }

  .code-line-active {
    background: rgba(245, 158, 11, 0.14);
    border-left-color: var(--amber);
    color: #fde68a;
    font-weight: 600;
  }

  .code-line-found {
    background: rgba(52, 211, 153, 0.16);
    border-left-color: var(--green);
    color: #d1fae5;
    font-weight: 600;
  }

  .code-line-notfound {
    background: rgba(248, 113, 113, 0.14);
    border-left-color: var(--red);
    color: #fecaca;
    font-weight: 600;
  }

  .code-eval-preview {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.82rem;
    color: var(--text-secondary);
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.55rem 0.75rem;
  }

  .chart-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 9, 20, 0.82);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    z-index: 60;
  }

  .chart-window {
    width: 100%;
    max-width: 760px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 25px 70px rgba(4, 9, 20, 0.9);
    display: flex;
    flex-direction: column;
  }

  .chart-titlebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.25rem;
    background: var(--bg-deep);
    border-bottom: 1px solid var(--border);
  }

  .chart-titlebar-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .chart-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--sky);
  }

  .close-chart-btn {
    background: #1a2a45;
    color: #dbeafe;
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .close-chart-btn:hover {
    background: #243a5e;
    border-color: var(--sky);
  }

  .chart-content {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .chart-panel {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .chart-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .chart-heading {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .chart-heading strong {
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .chart-heading span {
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .chart-result {
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    background: var(--bg-input);
    color: var(--text-secondary);
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
  }

  .chart-result-found {
    border-color: var(--green);
    color: #a7f3d0;
  }

  .chart-result-notfound {
    border-color: var(--red);
    color: #fecaca;
  }

  .chart-legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
    width: 100%;
    gap: 0.45rem 0.7rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }

  .complexity-legend-item-active {
    color: #ffffff;
    font-weight: 700;
  }

  .legend-swatch {
    width: 14px;
    height: 3px;
    border-radius: 2px;
  }

  .chart-svg {
    width: 100%;
    height: auto;
    display: block;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .chart-controls-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.7rem 0.9rem;
  }

  .chart-math-box {
    display: grid;
    grid-template-columns: repeat(2, minmax(180px, 1fr));
    gap: 0.65rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.8rem;
  }

  .math-card {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .math-label {
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .math-expr {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.95rem;
    color: #bae6fd;
    font-weight: 700;
  }

  .complexity-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  .complexity-table {
    width: 100%;
    min-width: 380px;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .complexity-table th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    background: var(--bg-input);
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .complexity-table td {
    padding: 0.7rem 0.75rem;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
  }

  .complexity-table tr:last-child td { border-bottom: 0; }

  .complexity-table .complexity-math {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 700;
    color: #bae6fd;
  }

  .complexity-row-active { background: rgba(129, 140, 248, 0.14); }

  .complexity-tag {
    margin-left: 0.45rem;
    padding: 0.05rem 0.45rem;
    border: 1px solid var(--range);
    border-radius: 999px;
    font-size: 0.65rem;
    color: #c7d2fe;
  }

  .complexity-note {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.55;
    color: var(--text-secondary);
  }

  .mode-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .mode-switch {
    display: flex;
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg-input);
  }

  .mode-option {
    border: 0;
    border-left: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    padding: 0 0.85rem;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .mode-option:first-child { border-left: 0; }

  .mode-option:hover {
    background: rgba(56, 189, 248, 0.1);
    color: var(--text-primary);
  }

  .mode-option-active,
  .mode-option-active:hover {
    background: var(--blue);
    color: #ffffff;
  }

  .mode-option:focus-visible {
    outline: 2px solid var(--sky);
    outline-offset: -2px;
  }

  .hash-hint {
    width: 100%;
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .hash-keys {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .hash-keys-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-right: 0.2rem;
  }

  .key-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3rem 0.65rem;
    border-radius: 8px;
    border: 1px solid var(--border-strong);
    background: #14233c;
    color: var(--text-primary);
    font-weight: 700;
    font-size: 0.95rem;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }

  .key-chip-insert .key-chip-sign { color: var(--green); }
  .key-chip-search .key-chip-sign { color: var(--amber); }
  .key-chip-delete .key-chip-sign { color: var(--red); }
  .key-chip-done { opacity: 0.5; }

  .key-chip-current {
    background: var(--blue);
    border-color: var(--blue-hover);
    color: #ffffff;
  }
  .key-chip-current .key-chip-sign { color: #ffffff; }

  .hash-board {
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .hash-board-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .hash-formula {
    text-align: center;
    font-size: 1.15rem;
    color: var(--text-secondary);
    min-height: 1.7em;
  }

  .hash-index-ref {
    color: var(--amber-soft);
    font-weight: 700;
  }

  .hash-rows {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }

  .hash-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.55rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid transparent;
    border-radius: 12px;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .hash-row-active {
    background: rgba(129, 140, 248, 0.14);
    border-color: rgba(129, 140, 248, 0.5);
  }

  .hash-index {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 10px;
    border: 1px solid var(--border-strong);
    background: #14233c;
    font-weight: 700;
    color: var(--text-primary);
  }

  .hash-row-active .hash-index {
    border-color: var(--range);
    box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.25);
  }

  .hash-arrow,
  .hash-empty { color: var(--text-muted); }

  .hash-entry {
    min-width: 42px;
    height: 38px;
    padding: 0 0.65rem;
    display: grid;
    place-items: center;
    border-radius: 10px;
    border: 1px solid var(--border-strong);
    background: #14233c;
    font-weight: 700;
    color: var(--text-primary);
    transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .hash-entry-empty {
    background: transparent;
    border-style: dashed;
    color: var(--text-muted);
    font-weight: 400;
  }

  .hash-entry-deleted {
    border-style: dashed;
    color: var(--red);
    background: rgba(248, 113, 113, 0.08);
  }

  .hash-entry-checked {
    border-color: rgba(245, 158, 11, 0.55);
    color: #fde68a;
  }

  .hash-entry-probe {
    background: rgba(245, 158, 11, 0.18);
    border-color: var(--amber);
    color: #fde68a;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
  }

  .hash-entry-success {
    background: rgba(52, 211, 153, 0.18);
    border-color: var(--green);
    color: #ffffff;
    box-shadow: 0 0 12px rgba(52, 211, 153, 0.3);
  }

  .hash-entry-fail,
  .hash-entry-remove {
    background: rgba(248, 113, 113, 0.14);
    border-color: var(--red);
    color: #fecaca;
    box-shadow: 0 0 12px rgba(248, 113, 113, 0.25);
  }

  .hash-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .hash-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .hash-legend-box {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid;
  }
  .hash-legend-active { background: rgba(129, 140, 248, 0.4); border-color: var(--range); }
  .hash-legend-probe { background: rgba(245, 158, 11, 0.4); border-color: var(--amber); }
  .hash-legend-success { background: rgba(52, 211, 153, 0.4); border-color: var(--green); }
  .hash-legend-fail { background: rgba(248, 113, 113, 0.4); border-color: var(--red); }

  .hash-entry-checked {
    border-color: rgba(251, 146, 60, 0.55);
    color: #fed7aa;
  }

  .hash-entry-collision {
    background: rgba(251, 146, 60, 0.2);
    border-color: var(--orange);
    color: #ffedd5;
    box-shadow: 0 0 14px rgba(251, 146, 60, 0.4);
    animation: hash-shake 0.4s ease;
  }

  .hash-row-collision {
    background: rgba(251, 146, 60, 0.14);
    border-color: rgba(251, 146, 60, 0.6);
  }

  .hash-row-next {
    border-style: dashed;
    border-color: rgba(251, 146, 60, 0.55);
  }

  .hash-row-note {
    margin-left: auto;
    font-size: 0.78rem;
    font-weight: 700;
    color: #fdba74;
  }

  .hash-legend-collision {
    background: rgba(251, 146, 60, 0.4);
    border-color: var(--orange);
  }

  @keyframes hash-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(3px); }
  }

  @keyframes hash-pop {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hash-entry-collision { animation: none; }
  }

`;

function SearchControls({
  isRunning,
  searchComplete,
  hasTarget,
  canPrevious,
  onToggleSearch,
  onPrevious,
  onStep,
  onReset,
  onRandomize,
}) {
  const playLabel = isRunning
    ? "Pausar"
    : searchComplete
      ? "Volver a iniciar"
      : "Iniciar";

  return (
    <div className="search-actions">
      <button
        type="button"
        className="button button-primary button-icon"
        onClick={onToggleSearch}
        disabled={!hasTarget}
        title={playLabel}
        aria-label={playLabel}
      >
        {isRunning ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className="button button-secondary button-icon"
        onClick={onPrevious}
        disabled={isRunning || !canPrevious || !hasTarget}
        title="Paso anterior"
        aria-label="Paso anterior"
      >
        <PreviousIcon />
      </button>
      <button
        type="button"
        className="button button-secondary button-icon"
        onClick={onStep}
        disabled={isRunning || searchComplete || !hasTarget}
        title="Siguiente paso"
        aria-label="Siguiente paso"
      >
        <StepIcon />
      </button>
      <button
        type="button"
        className="button button-ghost button-icon"
        onClick={onReset}
        title="Reiniciar"
        aria-label="Reiniciar"
      >
        <ResetIcon />
      </button>
      {onRandomize && (
        <button
          type="button"
          className="button button-ghost button-icon"
          onClick={onRandomize}
          title="Generar nuevo arreglo"
          aria-label="Generar nuevo arreglo"
        >
          <DiceIcon />
        </button>
      )}
    </div>
  );
}

const COMPLEXITY = [
  { id: "chaining", label: "Encadenamiento", insert: "O(1)", worst: "O(n)" },
  { id: "linear", label: "Sondeo lineal", insert: "O(1/(1 − α))", worst: "O(n)" },
  { id: "quadratic", label: "Sondeo cuadrático", insert: "O(1/(1 − α))", worst: "O(n)" },
];

function ComplexityWindow({ isOpen, onClose, mode, n, size }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="chart-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complexity-window-title"
      onClick={onClose}
    >
      <section className="chart-window" onClick={(event) => event.stopPropagation()}>
        <div className="chart-titlebar">
          <div className="chart-titlebar-left">
            <span className="chart-dot" aria-hidden="true" />
            <span id="complexity-window-title">Complejidad</span>
          </div>
          <button
            type="button"
            className="close-chart-btn"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            ×
          </button>
        </div>

        <div className="chart-content">
          <div className="complexity-table-wrap">
            <table className="complexity-table">
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Inserción (prom.)</th>
                  <th>Peor caso</th>
                </tr>
              </thead>
              <tbody>
                {COMPLEXITY.map((item) => (
                  <tr key={item.id} className={item.id === mode ? "complexity-row-active" : ""}>
                    <td>{item.label}</td>
                    <td className="complexity-math">{item.insert}</td>
                    <td className="complexity-math">{item.worst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="complexity-note">
            α = n/m = {n}/{size} = {(n / size).toFixed(2)}
          </p>
        </div>
      </section>
    </div>
  );
}

export default function HashCollisions() {
  const [sizeText, setSizeText] = useState(String(DEFAULT_SIZE));
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [mode, setMode] = useState("chaining");
  const [keysText, setKeysText] = useState(DEFAULT_KEYS_TEXT);
  const [keys, setKeys] = useState(() => parseKeys(DEFAULT_KEYS_TEXT).keys);
  const [keysError, setKeysError] = useState("");
  const [frameIndex, setFrameIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplexityOpen, setIsComplexityOpen] = useState(false);

  const frames = useMemo(() => buildFrames(keys, size, mode), [keys, size, mode]);
  const lastFrame = frames.length - 1;
  const frame = frames[Math.min(frameIndex, lastFrame)];
  const finished = frameIndex >= lastFrame;

  useEffect(() => {
    if (!isRunning) return undefined;
    if (frameIndex >= lastFrame) {
      setIsRunning(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setFrameIndex((index) => Math.min(index + 1, lastFrame));
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [isRunning, frameIndex, lastFrame]);

  const restart = () => {
    setIsRunning(false);
    setFrameIndex(0);
  };

  const changeSize = (event) => {
    const text = event.target.value;
    setSizeText(text);
    const value = Number(text);
    if (Number.isInteger(value) && value >= MIN_SIZE && value <= MAX_SIZE) {
      setSize(value);
      restart();
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    restart();
  };

  const applyKeys = () => {
    const result = parseKeys(keysText);
    if (result.error) {
      setKeysError(result.error);
      return;
    }
    setKeys(result.keys);
    setKeysError("");
    restart();
  };

  const randomizeKeys = () => {
    const count = Math.max(size - 1, 3);
    const fresh = new Set();
    while (fresh.size < count) fresh.add(Math.floor(Math.random() * 98) + 1);
    const text = [...fresh].join(", ");
    setKeysText(text);
    setKeys([...fresh]);
    setKeysError("");
    restart();
  };

  const toggleRun = () => {
    if (finished) {
      setFrameIndex(0);
      setIsRunning(true);
      return;
    }
    setIsRunning((running) => !running);
  };

  const nextStep = () => setFrameIndex((index) => Math.min(index + 1, lastFrame));
  const previousStep = () => {
    if (isRunning) return;
    setFrameIndex((index) => Math.max(index - 1, 0));
  };

  const statusKind = frame.kind === "success" ? "success" : frame.kind === "error" ? "error" : "idle";
  const codeLines = getCodeLines(mode);
  const activeLine = frame.tag ? (codeLines.find((line) => line.tag === frame.tag)?.num ?? null) : null;
  const modeLabel = MODES.find((item) => item.id === mode).label;
  const loadFactor = (frame.n / size).toFixed(2);
  const collision = frame.collision;
  const unit = mode === "chaining" ? "cubeta" : "casilla";
  const boardTitle = frame.key !== null
    ? `Insertar ${frame.key} → ${unit} ${frame.active ?? frame.hash}`
    : `Tabla hash de ${size} ${unit}s`;

  return (
    <main className="linear-search-page">
      <style>{BLUE_THEME_STYLES}</style>
      <section className="linear-search-card" aria-labelledby="linear-search-title">
        <header className="linear-search-header">
          <div>
            <span className="eyebrow">Estructuras de datos</span>
            <h1 id="linear-search-title">Tabla hash</h1>
          </div>

          <button
            type="button"
            className="button button-accent"
            onClick={() => setIsComplexityOpen(true)}
          >
            Complejidad
          </button>
        </header>

        <div className="search-toolbar">
          <label className="target-field">
            <span>Tamaño de la tabla</span>
            <input
              type="number"
              min={MIN_SIZE}
              max={MAX_SIZE}
              value={sizeText}
              onChange={changeSize}
              onBlur={() => setSizeText(String(size))}
            />
          </label>

          <div className="mode-field">
            <span>Colisiones</span>
            <div className="mode-switch" role="group" aria-label="Resolución de colisiones">
              {MODES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`mode-option ${mode === item.id ? "mode-option-active" : ""}`}
                  aria-pressed={mode === item.id}
                  onClick={() => changeMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <SearchControls
            isRunning={isRunning}
            searchComplete={finished}
            hasTarget={keys.length > 0}
            canPrevious={frameIndex > 0}
            onToggleSearch={toggleRun}
            onPrevious={previousStep}
            onStep={nextStep}
            onReset={restart}
            onRandomize={randomizeKeys}
          />
        </div>

        <div className="array-editor">
          <label className="values-field">
            <span>Claves a insertar</span>
            <input
              type="text"
              value={keysText}
              onChange={(event) => {
                setKeysText(event.target.value);
                setKeysError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyKeys();
              }}
              placeholder=""
            />
          </label>
          <button type="button" className="button button-primary" onClick={applyKeys}>
            Aplicar claves
          </button>
          <p className="hash-hint">
            Escribe las claves separadas por comas. Se insertan en ese orden.
          </p>
          {keysError && <p className="array-error" role="alert">{keysError}</p>}
        </div>

        {frame.key !== null && (
          <section className="search-summary-panel" aria-label="Resumen de la inserción">
            <div className="search-summary" aria-live="polite">
              <div className="search-summary-card">
                <span>Resultado</span>
                <strong>{frame.outcome ? OUTCOME_TEXT[frame.outcome] : "En proceso"}</strong>
              </div>
              <div className="search-summary-card">
                <span>Colisiones</span>
                <strong>{frame.collisions} (total {frame.totalCollisions})</strong>
              </div>
              <div className="search-summary-card">
                <span>Factor de carga</span>
                <strong>{frame.n}/{size} = {loadFactor}</strong>
              </div>
            </div>
          </section>
        )}

        <div className="hash-keys" aria-label="Claves">
          <span className="hash-keys-label">Claves:</span>
          {keys.map((key, index) => (
            <span
              key={`${key}-${index}`}
              className={`key-chip key-chip-insert ${
                index === frame.keyIndex ? "key-chip-current" : index < frame.keyIndex ? "key-chip-done" : ""
              }`}
            >
              {key}
            </span>
          ))}
        </div>

        <div className={`search-status search-status-${statusKind}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{frame.message}</span>
        </div>

        <div className="hash-board">
          <div className="hash-board-title">{boardTitle}</div>
          <div className="hash-formula">
            {frame.formula ? renderFormula(frame.formula) : "—"}
          </div>

          <div className="hash-rows" aria-label={`${unit}s de la tabla`}>
            {Array.from({ length: size }, (_, index) => {
              const isActive = frame.active === index;
              const isCollisionRow = collision && collision.idx === index;
              const isNextRow = collision && !isCollisionRow && collision.nextIdx === index;
              const rowClass = isCollisionRow
                ? "hash-row-collision"
                : isNextRow
                  ? "hash-row-next"
                  : isActive
                    ? "hash-row-active"
                    : "";

              let cells;
              if (mode === "chaining") {
                const bucket = frame.buckets[index];
                cells = bucket.length === 0
                  ? <span className="hash-empty">—</span>
                  : bucket.map((value, pos) => {
                    const isNew = frame.entry && frame.entry.bucket === index && frame.entry.pos === pos;
                    const stateClass = isNew
                      ? `hash-entry-${frame.entryState}`
                      : isCollisionRow
                        ? "hash-entry-collision"
                        : "";
                    return (
                      <Fragment key={`${value}-${pos}`}>
                        <span className="hash-arrow">→</span>
                        <span className={`hash-entry ${stateClass}`}>{value}</span>
                      </Fragment>
                    );
                  });
              } else {
                const value = frame.slots[index];
                const isCurrent = isActive && frame.entryState;
                const isVisited = frame.visited.includes(index);
                const stateClass = isCurrent
                  ? `hash-entry-${frame.entryState}`
                  : isVisited
                    ? "hash-entry-checked"
                    : "";
                cells = (
                  <>
                    <span className="hash-arrow">→</span>
                    <span className={`hash-entry ${value === null ? "hash-entry-empty" : ""} ${stateClass}`}>
                      {value === null ? "—" : value}
                    </span>
                  </>
                );
              }

              return (
                <div className={`hash-row ${rowClass}`} key={index}>
                  <span className="hash-index">{index}</span>
                  {cells}
                  {isCollisionRow && (
                    <span className="hash-row-note">
                      {mode === "chaining"
                        ? `aquí se agrega la clave ${frame.key}`
                        : `ocupada: choca con la clave ${frame.key}`}
                    </span>
                  )}
                  {isNextRow && <span className="hash-row-note">siguiente intento</span>}
                </div>
              );
            })}
          </div>

          <div className="hash-legend" aria-label="Leyenda">
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-active" />
              {unit === "cubeta" ? "Cubeta activa" : "Casilla activa"}
            </span>
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-collision" />
              Colisión
            </span>
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-success" />
              Insertado
            </span>
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-fail" />
              No se pudo insertar
            </span>
          </div>
        </div>

        <div className="code-section">
          <div className="code-header">
            <span>Código Python — inserción con {modeLabel.toLowerCase()}</span>
            <div className="code-vars">
              <span className="code-var-pill">clave = {frame.key !== null ? frame.key : "—"}</span>
              <span className="code-var-pill">m = {size}</span>
              <span className="code-var-pill">h = {frame.hash !== null ? frame.hash : "—"}</span>
              <span className="code-var-pill">{mode === "chaining" ? "comparaciones" : "sondeos"} = {frame.key !== null ? frame.probes : "—"}</span>
            </div>
          </div>

          <pre className="code-block" aria-label="Código Python de la inserción en la tabla hash">
            {codeLines.map((line) => {
              const isActive = line.num === activeLine;
              const lineClass = !isActive
                ? ""
                : frame.kind === "success"
                  ? "code-line-found"
                  : frame.kind === "error"
                    ? "code-line-notfound"
                    : "code-line-active";

              return (
                <div key={line.num} className={`code-line ${lineClass}`}>
                  <span className="code-line-num">{line.num}</span>
                  <span className="code-line-text">{line.text}</span>
                </div>
              );
            })}
          </pre>

          <div className="code-eval-preview">
            {frame.formula || "Sin iniciar — presiona Iniciar o Siguiente paso."}
          </div>
        </div>
      </section>

      <ComplexityWindow
        isOpen={isComplexityOpen}
        onClose={() => setIsComplexityOpen(false)}
        mode={mode}
        n={frame.n}
        size={size}
      />
    </main>
  );
}
