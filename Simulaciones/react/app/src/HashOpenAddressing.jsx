import { useEffect, useMemo, useState } from "react";

const VARIANT = "open";
const MIN_SIZE = 3;
const MAX_SIZE = 13;
const DEFAULT_SIZE = 7;
const UNIT = "casilla";
const DEFAULT_KEYS_TEXT = "11, 6, 4, 98, 96, 15";

const MODES = [
  { id: "linear", label: "Sondeo lineal" },
  { id: "quadratic", label: "Sondeo cuadrático" },
];

const BOOK = {
  chaining: { search: "O(1 + α)", insert: "O(1)", space: "O(n)" },
  open: { search: "O(1/(1 − α))", insert: "O(1/(1 − α))", space: "O(m)" },
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

function buildTable(keys, size, mode) {
  const skipped = [];
  const slots = Array.from({ length: size }, () => null);
  keys.forEach((key) => {
    const hash = key % size;
    for (let k = 0; k < size; k += 1) {
      const idx = mode === "linear" ? (hash + k) % size : (hash + k * k) % size;
      if (slots[idx] === key) {
        skipped.push({ key, reason: "repetida" });
        return;
      }
      if (slots[idx] === null) {
        slots[idx] = key;
        return;
      }
    }
    skipped.push({ key, reason: "sin lugar libre" });
  });
  return { slots, skipped, n: slots.filter((slot) => slot !== null).length };
}

function buildSearchFrames(built, target, size, mode) {
  const frames = [];
  const push = (frame) => frames.push({
    active: null, entry: null, entryState: null, checkedCount: 0, visited: [],
    formula: "", probes: 0, tag: null, message: "", outcome: null, done: false, kind: "info",
    ...frame,
  });

  push({ message: `Listo para buscar ${target} en una tabla de ${size} ${UNIT}s.` });

  const hash = target % size;
  const hashFormula = `${target} → ${target} % ${size} → [${hash}]`;
  push({
    formula: hashFormula, active: hash, tag: "hash",
    message: `Buscar ${target}: ${target} % ${size} = ${hash}, ${UNIT} ${hash}.`,
  });

  const indexAt = (k) => (mode === "linear" ? (hash + k) % size : (hash + k * k) % size);
  const probeText = (k) => (
    mode === "linear"
      ? `(${hash} + ${k}) % ${size} = ${indexAt(k)}`
      : `(${hash} + ${k}²) % ${size} = ${indexAt(k)}`
  );
  const visited = [];

  for (let k = 0; k < size; k += 1) {
    const idx = indexAt(k);
    const slot = built.slots[idx];
    const formula = k === 0
      ? hashFormula
      : mode === "linear"
        ? `(${hash} + ${k}) % ${size} → [${idx}]`
        : `(${hash} + ${k}²) % ${size} → [${idx}]`;
    const common = { formula, active: idx, visited: [...visited], probes: k + 1 };

    if (slot === target) {
      push({ ...common, entryState: "success", tag: "hit",
        message: `¡Encontrado! ${target} está en la casilla ${idx} tras ${k + 1} ${k === 0 ? "sondeo" : "sondeos"}.`,
        outcome: "found", done: true, kind: "success" });
      return frames;
    }

    if (slot === null) {
      push({ ...common, entryState: "fail", tag: "miss",
        message: `La casilla ${idx} está vacía: ${target} no está en la tabla.`,
        outcome: "notfound", done: true, kind: "error" });
      return frames;
    }

    push({ ...common, entryState: "probe", tag: "compare",
      message: k + 1 < size
        ? `La casilla ${idx} tiene ${slot} (≠ ${target}). Siguiente intento: ${probeText(k + 1)}`
        : `La casilla ${idx} tiene ${slot} (≠ ${target}). Ya no quedan más intentos.` });
    visited.push(idx);
  }

  push({ visited: [...visited], probes: size, tag: "end",
    message: `${target} no está en la tabla (se recorrieron ${size} sondeos).`,
    outcome: "notfound", done: true, kind: "error" });
  return frames;
}

function getCodeLines(mode) {
  let lines;
  const step = mode === "linear" ? "(h + k) % m" : "(h + k * k) % m";
  lines = [
    [0, "def buscar(tabla, clave):", null],
    [1, "m = len(tabla)", null],
    [1, "h = clave % m", "hash"],
    [1, "for k in range(m):", null],
    [2, `i = ${step}`, null],
    [2, "if tabla[i] == clave:", "compare"],
    [3, "return True", "hit"],
    [2, "if tabla[i] is None:", null],
    [3, "return False", "miss"],
    [1, "return False", "end"],
  ];

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

const gamma = (z) => {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  const zz = z - 1;
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = coefficients[0];
  for (let i = 1; i < coefficients.length; i++) x += coefficients[i] / (zz + i);
  const t = zz + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, zz + 0.5) * Math.exp(-t) * x;
};

const COMPLEXITY_CURVES = [
  { id: "constant", label: "O(1)", color: "#7c8ba1", growth: () => 1 },
  { id: "logarithmic", label: "O(log n)", color: "#4cb3e6", growth: (x) => Math.log2(x) },
  { id: "linear", label: "O(n)", color: "#78a98c", growth: (x) => x },
  { id: "linearithmic", label: "O(n log n)", color: "#b3a272", growth: (x) => x * Math.log2(x) },
  { id: "quadratic", label: "O(n²)", color: "#b38666", growth: (x) => x ** 2 },
  { id: "cubic", label: "O(n³)", color: "#ad7480", growth: (x) => x ** 3 },
  { id: "exponential", label: "O(2ⁿ)", color: "#9680b3", growth: (x) => 2 ** x },
  { id: "factorial", label: "O(n!)", color: "#a6809a", growth: (x) => gamma(x + 1) },
];

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

  /* Descartado: apagado */
  .array-cell-checked {
    background: var(--bg-deep);
    border-color: var(--border);
    opacity: 0.5;
  }
  .array-cell-checked .cell-value { color: var(--text-muted); }
  .array-cell-checked .cell-label { color: var(--text-muted); }

  /* Encontrado: verde */
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

function ComplexityChartWindow({
  isOpen,
  onClose,
  arrayLength,
  size,
  comparisons,
  foundIndex,
  notFound,
  canPrevious,
  isRunning,
  searchComplete,
  hasTarget,
  onToggleSearch,
  onPrevious,
  onStep,
  onReset,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const n = Math.max(arrayLength, 1);

  const xMax = Math.max(n, size, 10);
  const yMax = Math.max(xMax * 2, 20);
  const yCap = yMax * 1.5;

  const width = 660;
  const height = 360;
  const padLeft = 58;
  const padRight = 20;
  const padTop = 28;
  const padBottom = 52;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const sizeToX = (size) => padLeft + (size / xMax) * plotW;
  const valueToY = (value) => {
    const v = Number.isFinite(value) ? Math.min(Math.max(value, 0), yCap) : yCap;
    return padTop + plotH - (v / yMax) * plotH;
  };

  const xStep = Math.max(1, Math.ceil(xMax / 5));
  const xTicks = [
    0,
    ...Array.from({ length: Math.floor(xMax / xStep) }, (_, i) => (i + 1) * xStep),
  ].filter((tick, i, list) => list.indexOf(tick) === i);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(r * yMax));
  const samples = Array.from({ length: 161 }, (_, i) => Math.max((i / 160) * xMax, 0.02));

  // Curva del libro con m fijo: α = n/m
  const bookCurve = VARIANT === "chaining"
    ? { id: "book", label: "O(1 + α)", color: "#2dd4bf", growth: (x) => 1 + x / size }
    : { id: "book", label: "O(1/(1 − α))", color: "#e879f9", growth: (x) => (x < size ? 1 / (1 - x / size) : Infinity) };

  const curveLines = [...COMPLEXITY_CURVES, bookCurve].map((curve) => ({
    ...curve,
    points: samples
      .map((size) => `${sizeToX(size).toFixed(1)},${valueToY(curve.growth(size)).toFixed(1)}`)
      .join(" "),
  }));

  const markerX = sizeToX(n);
  const expectedValue = bookCurve.growth(arrayLength);
  const expectedComparisons = Number.isFinite(expectedValue)
    ? Math.max(Math.ceil(expectedValue), 1)
    : size;
  const progress = comparisons === 0
    ? 0
    : notFound || comparisons >= expectedComparisons
      ? 1
      : Math.min(comparisons / expectedComparisons, 1);
  const drawnX = progress * n;
  const drawnPoints = drawnX > 0
    ? Array.from({ length: 61 }, (_, i) => Math.max((i / 60) * drawnX, 0.02))
        .map((x) => `${sizeToX(x).toFixed(1)},${valueToY(bookCurve.growth(x)).toFixed(1)}`)
        .join(" ")
    : "";
  const leadX = sizeToX(drawnX);
  const leadY = valueToY(bookCurve.growth(Math.max(drawnX, 0.02)));
  const unitWord = VARIANT === "chaining" ? "comparaciones" : "sondeos";
  const unitSingular = VARIANT === "chaining" ? "comparación" : "sondeo";

  const outcomeWord = notFound ? "no encontrado" : "encontrado";
  const resultLabel = searchComplete
    ? comparisons <= 1
      ? `Mejor caso O(1): ${outcomeWord} en el primer ${unitSingular}`
      : n > 1 && comparisons >= n
        ? `Peor caso O(n): ${outcomeWord} tras ${comparisons} ${unitWord}`
        : `Caso promedio ${bookCurve.label}: ${outcomeWord} tras ${comparisons} ${unitWord}`
    : comparisons > 0
      ? `${comparisons} ${comparisons === 1 ? unitSingular : unitWord} realizados`
      : `Aún no hay ${unitWord}`;

  const resultClass = foundIndex !== null
    ? "chart-result-found"
    : notFound
      ? "chart-result-notfound"
      : "";

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
            <span id="complexity-window-title">Gráfica</span>
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
          <div className="chart-panel">
            <div className="chart-panel-header">
              <div className="chart-heading">
                <strong>Complejidades de tiempo</strong>
                <span>Comparaciones necesarias según las claves guardadas (n)</span>
              </div>
              <span className={`chart-result ${resultClass}`} aria-live="polite">
                {resultLabel}
              </span>
              <div className="chart-legend" role="list" aria-label="Complejidades">
                {curveLines.map((curve) => (
                  <span
                    className={`legend-item ${curve.id === "book" ? "complexity-legend-item-active" : ""}`}
                    key={curve.id}
                    role="listitem"
                  >
                    <span className="legend-swatch" style={{ background: curve.color }} />
                    {curve.label}
                  </span>
                ))}
              </div>
            </div>

            <svg
              className="chart-svg"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`Curvas de complejidad temporal: ${COMPLEXITY_CURVES.map((curve) => curve.label).join(", ")}`}
            >
              <defs>
                <clipPath id="plot-clip">
                  <rect x={padLeft} y={padTop} width={plotW} height={plotH} />
                </clipPath>
              </defs>

              {/* Cuadrícula y eje Y */}
              {yTicks.map((tick) => {
                const yPos = valueToY(tick);
                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={padLeft}
                      y1={yPos}
                      x2={width - padRight}
                      y2={yPos}
                      stroke="#26364f"
                      strokeDasharray="4 4"
                    />
                    <text x={padLeft - 8} y={yPos + 4} textAnchor="end" fill="#94a9c9" fontSize="11">
                      {tick}
                    </text>
                  </g>
                );
              })}

              <text
                x={16}
                y={padTop + plotH / 2}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="11"
                transform={`rotate(-90 16 ${padTop + plotH / 2})`}
              >
                {unitWord.charAt(0).toUpperCase() + unitWord.slice(1)}
              </text>

              {/* Ejes */}
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#35507a" />
              <line
                x1={padLeft}
                y1={padTop + plotH}
                x2={width - padRight}
                y2={padTop + plotH}
                stroke="#35507a"
              />

              {xTicks.map((xVal) => {
                const xPos = sizeToX(xVal);
                return (
                  <g key={`x-${xVal}`}>
                    <line
                      x1={xPos}
                      y1={padTop + plotH}
                      x2={xPos}
                      y2={padTop + plotH + 5}
                      stroke="#35507a"
                    />
                    <text
                      x={xPos}
                      y={padTop + plotH + 19}
                      textAnchor="middle"
                      fill="#94a9c9"
                      fontSize="11"
                    >
                      {xVal}
                    </text>
                  </g>
                );
              })}

              <text
                x={padLeft + plotW / 2}
                y={height - 8}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="11"
              >
                Claves guardadas n
              </text>

              {/* Curvas (recortadas al área de la gráfica) */}
              <g clipPath="url(#plot-clip)">
                {curveLines.map((curve) => {
                  return (
                    <polyline
                      key={curve.id}
                      fill="none"
                      stroke={curve.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.65"
                      points={curve.points}
                    >
                      <title>{curve.label}</title>
                    </polyline>
                  );
                })}
              </g>

              {/* Tamaño actual del arreglo */}
              <line
                x1={markerX}
                y1={padTop}
                x2={markerX}
                y2={padTop + plotH}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="5 4"
                opacity="0.6"
              />
              <text
                x={Math.min(markerX, width - padRight - 30)}
                y={padTop - 10}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="11"
                fontWeight="600"
              >
                n = {n}
              </text>
              {/* Trazo progresivo de la curva del libro: avanza con cada comparación */}
              {comparisons > 0 ? (
                <g>
                  <polyline
                    fill="none"
                    stroke={bookCurve.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={drawnPoints}
                  />
                  <circle
                    cx={leadX}
                    cy={leadY}
                    r="5.5"
                    fill={
                      foundIndex !== null
                        ? "#34d399"
                        : notFound
                          ? "#f87171"
                          : "#f59e0b"
                    }
                    stroke="#0b1324"
                    strokeWidth="2"
                  >
                    <title>{`${comparisons} ${comparisons === 1 ? unitSingular : unitWord} (esperados ≈ ${expectedComparisons})`}</title>
                  </circle>
                </g>
              ) : null}
            </svg>
          </div>

          <div className="chart-controls-bar">
            <SearchControls
              isRunning={isRunning}
              searchComplete={searchComplete}
              hasTarget={hasTarget}
              canPrevious={canPrevious}
              onToggleSearch={onToggleSearch}
              onPrevious={onPrevious}
              onStep={onStep}
              onReset={onReset}
            />
          </div>

          <div className="chart-math-box">
            <div className="math-card">
              <span className="math-label">Mejor (a la primera)</span>
              <span className="math-expr">O(1)</span>
            </div>
            <div className="math-card">
              <span className="math-label">Promedio (prom.)</span>
              <span className="math-expr">{BOOK[VARIANT].search}</span>
            </div>
            <div className="math-card">
              <span className="math-label">Peor (todas colisionan)</span>
              <span className="math-expr">O(n)</span>
            </div>
            <div className="math-card">
              <span className="math-label">Espacio extra</span>
              <span className="math-expr">{BOOK[VARIANT].space}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HashOpenAddressing() {
  const [sizeText, setSizeText] = useState(String(DEFAULT_SIZE));
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [mode, setMode] = useState("linear");
  const [keysText, setKeysText] = useState(DEFAULT_KEYS_TEXT);
  const [keys, setKeys] = useState(() => parseKeys(DEFAULT_KEYS_TEXT).keys);
  const [keysError, setKeysError] = useState("");
  const [target, setTarget] = useState("");
  const [frameIndex, setFrameIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);

  const built = useMemo(() => buildTable(keys, size, mode), [keys, size, mode]);
  const targetValue = /^\d+$/.test(target) ? Number(target) : null;
  const hasTarget = targetValue !== null;

  const frames = useMemo(() => {
    if (targetValue === null) {
      return [{
        active: null, entry: null, entryState: null, checkedCount: 0, visited: [],
        formula: "", probes: 0, tag: null, outcome: null, done: false, kind: "info",
        message: "Escribe un valor objetivo para iniciar la búsqueda.",
      }];
    }
    return buildSearchFrames(built, targetValue, size, mode);
  }, [built, targetValue, size, mode]);

  const lastFrame = frames.length - 1;
  const frame = frames[Math.min(frameIndex, lastFrame)];
  const finished = frameIndex >= lastFrame;
  const alpha = built.n / size;

  useEffect(() => {
    if (!isRunning) return undefined;
    if (frameIndex >= lastFrame) {
      setIsRunning(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setFrameIndex((index) => Math.min(index + 1, lastFrame));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [isRunning, frameIndex, lastFrame]);

  const restart = () => {
    setIsRunning(false);
    setFrameIndex(0);
  };

  const changeTarget = (event) => {
    setTarget(event.target.value);
    restart();
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
    const count = Math.max(3, Math.min(size - 1, Math.round(size * (0.5 + Math.random() * 0.35))));
    const fresh = new Set();
    while (fresh.size < count) fresh.add(Math.floor(Math.random() * 98) + 1);
    setKeysText([...fresh].join(", "));
    setKeys([...fresh]);
    setKeysError("");
    restart();
  };

  const toggleRun = () => {
    if (!hasTarget) return;
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
  const probeWord = VARIANT === "chaining" ? "comparaciones" : "sondeos";
  const boardTitle = hasTarget
    ? `Buscar ${targetValue} → ${UNIT} ${frame.active ?? targetValue % size}`
    : `Tabla hash de ${size} ${UNIT}s`;

  return (
    <main className="linear-search-page">
      <style>{BLUE_THEME_STYLES}</style>
      <section className="linear-search-card" aria-labelledby="linear-search-title">
        <header className="linear-search-header">
          <div>
            <span className="eyebrow">Algoritmos</span>
            <h1 id="linear-search-title">Hash con direccionamiento abierto</h1>
          </div>

          <button
            type="button"
            className="button button-accent"
            onClick={() => setIsChartOpen(true)}
          >
            Gráfica
          </button>
        </header>

        <div className="search-toolbar">
          <label className="target-field">
            <span>Valor objetivo</span>
            <input
              type="number"
              min="0"
              value={target}
              onChange={changeTarget}
              placeholder=""
            />
          </label>

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
            hasTarget={hasTarget}
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
            <span>Claves de la tabla</span>
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
            Las claves se insertan en la tabla en ese orden, y luego se busca el valor objetivo.
          </p>
          {built.skipped.length > 0 && (
            <p className="hash-hint">
              No se insertaron: {built.skipped.map((item) => `${item.key} (${item.reason})`).join(", ")}.
            </p>
          )}
          {keysError && <p className="array-error" role="alert">{keysError}</p>}
        </div>

        {frame.done && (
          <section className="search-summary-panel" aria-label="Resumen de la búsqueda">
            <div className="search-summary" aria-live="polite">
              <div className="search-summary-card">
                <span>Resultado</span>
                <strong>
                  {frame.outcome === "found" ? `Encontrado en la ${UNIT} ${frame.active}` : "No encontrado"}
                </strong>
              </div>
              <div className="search-summary-card">
                <span>{probeWord.charAt(0).toUpperCase() + probeWord.slice(1)}</span>
                <strong>{frame.probes}</strong>
              </div>
              <div className="search-summary-card">
                <span>Factor de carga</span>
                <strong>{built.n}/{size} = {alpha.toFixed(2)}</strong>
              </div>
            </div>
          </section>
        )}

        <div className={`search-status search-status-${statusKind}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{frame.message}</span>
        </div>

        <div className="hash-board">
          <div className="hash-board-title">{boardTitle}</div>
          <div className="hash-formula">
            {frame.formula ? renderFormula(frame.formula) : "—"}
          </div>

          <div className="hash-rows" aria-label={`${UNIT}s de la tabla`}>
            {Array.from({ length: size }, (_, index) => {
              const isActive = frame.active === index;
              const value = built.slots[index];
              const isCurrent = isActive && frame.entryState;
              const isVisited = frame.visited.includes(index);
              const stateClass = isCurrent
                ? `hash-entry-${frame.entryState}`
                : isVisited
                  ? "hash-entry-checked"
                  : "";
              const cells = (
                <>
                  <span className="hash-arrow">→</span>
                  <span className={`hash-entry ${value === null ? "hash-entry-empty" : ""} ${stateClass}`}>
                    {value === null ? "—" : value}
                  </span>
                </>
              );
              return (
                <div className={`hash-row ${isActive ? "hash-row-active" : ""}`} key={index}>
                  <span className="hash-index">{index}</span>
                  {cells}
                </div>
              );
            })}
          </div>

          <div className="hash-legend" aria-label="Leyenda">
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-active" />
              {UNIT === "cubeta" ? "Cubeta activa" : "Casilla activa"}
            </span>
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-probe" />
              Comparando
            </span>
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-success" />
              Encontrado
            </span>
            <span className="hash-legend-item">
              <span className="hash-legend-box hash-legend-fail" />
              No encontrado
            </span>
          </div>
        </div>

        <div className="code-section">
          <div className="code-header">
            <span>Código Python — búsqueda con direccionamiento abierto</span>
            <div className="code-vars">
              <span className="code-var-pill">clave = {hasTarget ? targetValue : "—"}</span>
              <span className="code-var-pill">m = {size}</span>
              <span className="code-var-pill">h = {hasTarget ? targetValue % size : "—"}</span>
              <span className="code-var-pill">{probeWord} = {hasTarget ? frame.probes : "—"}</span>
            </div>
          </div>

          <pre className="code-block" aria-label="Código Python de la búsqueda hash">
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
            {frame.formula || "Sin iniciar — escribe un valor objetivo y presiona Iniciar o Siguiente paso."}
          </div>
        </div>
      </section>

      <ComplexityChartWindow
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        arrayLength={built.n}
        size={size}
        comparisons={frame.probes}
        foundIndex={frame.done && frame.kind === "success" ? 0 : null}
        notFound={frame.done && frame.kind === "error"}
        canPrevious={frameIndex > 0}
        isRunning={isRunning}
        searchComplete={frame.done}
        hasTarget={hasTarget}
        onToggleSearch={toggleRun}
        onPrevious={previousStep}
        onStep={nextStep}
        onReset={restart}
      />
    </main>
  );
}
