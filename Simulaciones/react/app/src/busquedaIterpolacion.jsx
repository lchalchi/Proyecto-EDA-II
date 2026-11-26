import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_ARRAY = [3, 8, 14, 20, 27, 33, 41, 48, 55];

const CODE_LINES = [
  { num: 1, text: "def busqueda_interpolacion(arr, objetivo):" },
  { num: 2, text: "    izquierda = 0" },
  { num: 3, text: "    derecha = len(arr) - 1" },
  { num: 4, text: "    while izquierda <= derecha and arr[izquierda] <= objetivo <= arr[derecha]:" },
  { num: 5, text: "        if arr[izquierda] == arr[derecha]:" },
  { num: 6, text: "            pos = izquierda" },
  { num: 7, text: "        else:" },
  { num: 8, text: "            pos = izquierda + (objetivo - arr[izquierda]) * (derecha - izquierda) // (arr[derecha] - arr[izquierda])" },
  { num: 9, text: "        if arr[pos] == objetivo:" },
  { num: 10, text: "            return pos" },
  { num: 11, text: "        if arr[pos] < objetivo:" },
  { num: 12, text: "            izquierda = pos + 1" },
  { num: 13, text: "        else:" },
  { num: 14, text: "            derecha = pos - 1" },
  { num: 15, text: "    return -1" },
];

const loglog = (x) => (x <= 2 ? 0 : Math.log2(Math.log2(x)));

const expectedComparisons = (n) => Math.max(Math.ceil(loglog(n)) + 1, 2);

const compareSymbol = (value, target) => (value === target ? "==" : value < target ? "<" : ">");

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
  { id: "loglog", label: "O(log log n)", color: "#5aa9a3", growth: (x) => loglog(x) },
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

  .formula-section {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.95rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .formula-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .formula-title-note { color: var(--text-muted); }

  .formula-box {
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.85rem 0.9rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    overflow-x: auto;
  }

  .formula-box-empty {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .formula-expr {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "Latin Modern Math", "STIX Two Math", "Cambria Math", Georgia, "Times New Roman", serif;
    font-size: 1.2rem;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .formula-expr-small {
    font-size: 1rem;
    color: var(--text-secondary);
  }

  .formula-floor {
    display: inline-flex;
    align-items: stretch;
    gap: 0.35rem;
  }

  .formula-floor-body {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.1rem;
  }

  .formula-bracket {
    width: 0.4rem;
    border: 2px solid var(--text-secondary);
    border-top: 0;
  }
  .formula-bracket-left { border-right: 0; }
  .formula-bracket-right { border-left: 0; }

  .formula-frac {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }

  .formula-num {
    padding: 0 0.4rem 0.2rem;
    border-bottom: 1.5px solid var(--text-secondary);
  }

  .formula-den { padding: 0.2rem 0.4rem 0; }

  .formula-result {
    color: var(--amber-soft);
    font-weight: 700;
  }

  .formula-verdict {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .formula-pill {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    background: var(--bg-input);
    color: var(--text-secondary);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.74rem;
  }

  .formula-pill-info {
    border-color: rgba(245, 158, 11, 0.55);
    color: #fde68a;
  }

  .formula-pill-success {
    border-color: rgba(52, 211, 153, 0.6);
    color: #a7f3d0;
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

  const xMax = Math.max(n, 10);
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

  const curveLines = COMPLEXITY_CURVES.map((curve) => ({
    ...curve,
    points: samples
      .map((size) => `${sizeToX(size).toFixed(1)},${valueToY(curve.growth(size)).toFixed(1)}`)
      .join(" "),
  }));

  const markerX = sizeToX(n);
  const expected = expectedComparisons(n);
  const progress = comparisons === 0
    ? 0
    : notFound || comparisons >= n
      ? 1
      : Math.min(comparisons / expected, 1);
  const drawnX = progress * n;
  const drawnPoints = drawnX > 0
    ? Array.from({ length: 61 }, (_, i) => Math.max((i / 60) * drawnX, 0.02))
        .map((size) => `${sizeToX(size).toFixed(1)},${valueToY(loglog(size)).toFixed(1)}`)
        .join(" ")
    : "";
  const leadX = sizeToX(drawnX);
  const leadY = valueToY(loglog(Math.max(drawnX, 0.02)));

  const resultLabel = searchComplete
    ? notFound && comparisons === 0
      ? "Fuera de rango: descartado sin comparar"
      : comparisons === 1 && foundIndex !== null
        ? "Mejor caso O(1): encontrado en la primera comparación"
        : comparisons >= n
          ? `Peor caso O(n): ${notFound ? "no encontrado" : "encontrado"} tras ${comparisons} comparaciones`
          : comparisons <= expected
            ? `Caso promedio O(log log n): ${notFound ? "no encontrado" : "encontrado"} tras ${comparisons} comparaciones`
            : `Más lento que el promedio: ${comparisons} comparaciones (datos poco uniformes)`
    : comparisons > 0
      ? `${comparisons} ${comparisons === 1 ? "comparación" : "comparaciones"} realizadas`
      : "Aún no hay comparaciones";

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
                <span>Operaciones necesarias según el tamaño de entrada (n)</span>
              </div>
              <span className={`chart-result ${resultClass}`} aria-live="polite">
                {resultLabel}
              </span>
              <div className="chart-legend" role="list" aria-label="Complejidades">
                {curveLines.map((curve) => (
                  <span
                    className={`legend-item ${curve.id === "loglog" ? "complexity-legend-item-active" : ""}`}
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
                Operaciones
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
                Tamaño de entrada n
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
              {/* Trazo progresivo de O(log log n): avanza con cada comparación */}
              {comparisons > 0 ? (
                <g>
                  <polyline
                    fill="none"
                    stroke="#5eead4"
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
                    <title>{`${comparisons} ${comparisons === 1 ? "comparación" : "comparaciones"} (esperadas ≈ ${expected})`}</title>
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
              <span className="math-label">Promedio (datos uniformes)</span>
              <span className="math-expr">O(log log n)</span>
            </div>
            <div className="math-card">
              <span className="math-label">Peor (datos muy desiguales)</span>
              <span className="math-expr">O(n)</span>
            </div>
            <div className="math-card">
              <span className="math-label">Memoria</span>
              <span className="math-expr">O(1)</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Frac({ top, bottom }) {
  return (
    <span className="formula-frac">
      <span className="formula-num">{top}</span>
      <span className="formula-den">{bottom}</span>
    </span>
  );
}

function Floor({ children }) {
  return (
    <span className="formula-floor">
      <span className="formula-bracket formula-bracket-left" aria-hidden="true" />
      <span className="formula-floor-body">{children}</span>
      <span className="formula-bracket formula-bracket-right" aria-hidden="true" />
    </span>
  );
}

const wrapNegative = (value) => (value < 0 ? `(${value})` : String(value));

function FormulaSteps({ step, goal }) {
  const numerator = goal - step.lo;
  const denominator = step.hi - step.lo;
  const span = step.right - step.left;
  const ratio = Number(((numerator * span) / denominator).toFixed(2));

  return (
    <>
      <div className="formula-expr">
        <span>pos</span>
        <span>=</span>
        <span>{step.left}</span>
        <span>+</span>
        <Floor>
          <Frac
            top={`${goal} − ${wrapNegative(step.lo)}`}
            bottom={`${wrapNegative(step.hi)} − ${wrapNegative(step.lo)}`}
          />
          <span>·</span>
          <span>({step.right} − {step.left})</span>
        </Floor>
      </div>

      <div className="formula-expr formula-expr-small">
        <span>pos</span>
        <span>=</span>
        <span>{step.left}</span>
        <span>+</span>
        <Floor>
          <Frac top={numerator} bottom={denominator} />
          <span>·</span>
          <span>{span}</span>
        </Floor>
        <span>=</span>
        <span>{step.left}</span>
        <span>+</span>
        <Floor>
          <span>{ratio}</span>
        </Floor>
        <span>=</span>
        <span className="formula-result">{step.pos}</span>
      </div>
    </>
  );
}

export default function InterpolationSearch() {
  const audioContextRef = useRef(null);
  const gridRef = useRef(null);
  const [columns, setColumns] = useState(8);
  const [array, setArray] = useState(INITIAL_ARRAY);
  const [valuesInput, setValuesInput] = useState(INITIAL_ARRAY.join(", "));
  const [arrayError, setArrayError] = useState("");
  const [target, setTarget] = useState("");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(INITIAL_ARRAY.length - 1);
  const [foundIndex, setFoundIndex] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [comparisons, setComparisons] = useState(0);
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Elige un objetivo y comienza la búsqueda."
  );

  const reset = useCallback((customArray = array, nextTarget = target) => {
    setIsRunning(false);
    setCurrentIndex(-1);
    setLeftIndex(0);
    setRightIndex(customArray.length - 1);
    setFoundIndex(null);
    setNotFound(false);
    setComparisons(0);
    setHistory([]);
    setStatusMessage(
      `Listo para buscar ${nextTarget || "un número"} en ${customArray.length} elementos.`
    );
  }, [array, target]);

  const prepareAudio = useCallback(() => {
    if (!window.AudioContext) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state !== "running") {
      audioContext.resume().catch((error) => {
        console.error("No se pudo habilitar el audio de la búsqueda.", error);
      });
    }
  }, []);

  const playFoundSound = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state !== "running") return;

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.setValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.26);
  }, []);

  const step = useCallback(() => {
    if (foundIndex !== null || notFound || target === "") return;

    const goal = Number(target);
    if (leftIndex > rightIndex) {
      setNotFound(true);
      setIsRunning(false);
      setStatusMessage(
        `No se encontró ${target}: el intervalo quedó vacío tras ${comparisons} comparaciones.`
      );
      return;
    }
    if (goal < array[leftIndex] || goal > array[rightIndex]) {
      setNotFound(true);
      setIsRunning(false);
      setStatusMessage(
        `No se encontró ${target}: está fuera del rango [${array[leftIndex]}, ${array[rightIndex]}].`
      );
      return;
    }

    const low = array[leftIndex];
    const high = array[rightIndex];
    const equalEnds = low === high;
    const estimated = equalEnds
      ? leftIndex
      : leftIndex + Math.floor(((goal - low) * (rightIndex - leftIndex)) / (high - low));
    const pos = Math.min(Math.max(estimated, leftIndex), rightIndex);
    const value = array[pos];
    const nextComparisons = comparisons + 1;

    setCurrentIndex(pos);
    setComparisons(nextComparisons);
    setHistory((prev) => [
      ...prev,
      {
        step: nextComparisons,
        left: leftIndex,
        right: rightIndex,
        pos,
        lo: low,
        hi: high,
        equalEnds,
        value,
        afterLeft: value < goal ? pos + 1 : leftIndex,
        afterRight: value > goal ? pos - 1 : rightIndex,
      },
    ]);

    if (value === goal) {
      setFoundIndex(pos);
      setIsRunning(false);
      playFoundSound();
      setStatusMessage(
        `¡Objetivo encontrado! ${target} está en el índice ${pos}.`
      );
    } else if (value < goal) {
      setLeftIndex(pos + 1);
      setStatusMessage(
        `La fórmula estima el índice ${pos}: ${value} es menor que ${target}. Se busca a la derecha.`
      );
    } else {
      setRightIndex(pos - 1);
      setStatusMessage(
        `La fórmula estima el índice ${pos}: ${value} es mayor que ${target}. Se busca a la izquierda.`
      );
    }
  }, [array, comparisons, foundIndex, leftIndex, notFound, playFoundSound, rightIndex, target]);

  const handleStep = () => {
    prepareAudio();
    step();
  };

  const previousStep = useCallback(() => {
    if (isRunning || (foundIndex === null && !notFound && currentIndex < 0)) return;

    setIsRunning(false);

    if (notFound) {
      setNotFound(false);
      setStatusMessage("Se retrocedió un paso.");
      return;
    }

    setFoundIndex(null);

    const previousComparisons = Math.max(comparisons - 1, 0);
    setComparisons(previousComparisons);
    setHistory((prev) => prev.slice(0, -1));

    if (previousComparisons === 0) {
      setCurrentIndex(-1);
      setLeftIndex(0);
      setRightIndex(array.length - 1);
      setStatusMessage(
        `Listo para buscar ${target || "un número"} en ${array.length} elementos.`
      );
    } else {
      const previous = history[history.length - 2];
      setCurrentIndex(previous?.pos ?? -1);
      setLeftIndex(previous?.afterLeft ?? 0);
      setRightIndex(previous?.afterRight ?? array.length - 1);
      setStatusMessage("Se retrocedió una comparación.");
    }
  }, [array, comparisons, currentIndex, foundIndex, history, isRunning, notFound, target]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setTimeout(step, 1200);
    return () => window.clearTimeout(timer);
  }, [isRunning, step]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;
    const measure = () => {
      const tracks = window.getComputedStyle(grid).gridTemplateColumns;
      const count = tracks ? tracks.split(" ").filter(Boolean).length : 1;
      setColumns(Math.max(count, 1));
    };
    measure();
    const observer = new window.ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [array.length]);

  const changeTarget = (event) => {
    const nextTarget = event.target.value;
    setTarget(nextTarget);
    reset(array, nextTarget);
  };

  const applyCustomArray = (event) => {
    event.preventDefault();
    const values = valuesInput.split(",").map((value) => value.trim());

    if (valuesInput.trim() === "" || values.some((value) => value === "")) {
      setArrayError("Escribe uno o más valores separados por comas.");
      return;
    }

    const parsedValues = values.map(Number);
    if (parsedValues.some((value) => !Number.isFinite(value))) {
      setArrayError("Todos los valores deben ser números válidos.");
      return;
    }

    const sortedValues = [...parsedValues].sort((a, b) => a - b);
    setArray(sortedValues);
    setValuesInput(sortedValues.join(", "));
    setArrayError("");
    reset(sortedValues, target);
  };

  const toggleSearch = () => {
    if (target === "") return;
    prepareAudio();
    if (foundIndex !== null || notFound) {
      reset();
      setIsRunning(true);
      return;
    }
    setIsRunning((running) => !running);
  };

  const randomizeArray = () => {
    let current = Math.floor(Math.random() * 5) + 1;
    const freshArray = Array.from({ length: array.length }, () => {
      const value = current;
      current += Math.floor(Math.random() * 6) + 3;
      return value;
    });
    setArray(freshArray);
    setValuesInput(freshArray.join(", "));
    setArrayError("");
    reset(freshArray, target);
  };

  const goal = Number(target);
  const statusKind = foundIndex !== null ? "success" : notFound ? "error" : "idle";
  const searchComplete = foundIndex !== null || notFound;
  const currentVal = currentIndex >= 0 ? array[currentIndex] : null;
  const lastStep = history[history.length - 1];
  const expected = expectedComparisons(array.length);

  const activeLine = foundIndex !== null
    ? 10
    : notFound
      ? 15
      : lastStep
        ? (lastStep.equalEnds ? 6 : 8)
        : null;

  const stepText = lastStep
    ? lastStep.equalEnds
      ? `arr[izquierda] == arr[derecha] = ${lastStep.lo} -> pos = ${lastStep.pos}; arr[${lastStep.pos}] = ${lastStep.value} ${compareSymbol(lastStep.value, goal)} ${goal}`
      : `pos = ${lastStep.left} + (${goal} - ${lastStep.lo}) * (${lastStep.right} - ${lastStep.left}) // (${lastStep.hi} - ${lastStep.lo}) = ${lastStep.pos}; arr[${lastStep.pos}] = ${lastStep.value} ${compareSymbol(lastStep.value, goal)} ${goal}`
    : "";

  const evalExpression = foundIndex !== null
    ? `arr[${foundIndex}] == ${goal} -> True (retorna ${foundIndex})`
    : notFound
      ? leftIndex > rightIndex
        ? `izquierda (${leftIndex}) > derecha (${rightIndex}) -> termina y retorna -1`
        : `${goal} fuera de [${array[leftIndex]}, ${array[rightIndex]}] -> termina y retorna -1`
      : lastStep
        ? stepText
        : "Sin iniciar — ingresa un objetivo y presiona Iniciar o Siguiente paso.";

  const caseLabel = comparisons === 0
    ? "Fuera de rango"
    : comparisons === 1 && foundIndex !== null
      ? "Mejor caso"
      : comparisons >= array.length
        ? "Peor caso"
        : comparisons <= expected
          ? "Caso promedio"
          : "Caso lento";

  return (
    <main className="linear-search-page">
      <style>{BLUE_THEME_STYLES}</style>
      <section className="linear-search-card" aria-labelledby="linear-search-title">
        <header className="linear-search-header">
          <div>
            <span className="eyebrow">Algoritmos</span>
            <h1 id="linear-search-title">Búsqueda por interpolación</h1>
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
              value={target}
              onChange={changeTarget}
              placeholder=""
            />
          </label>

          <SearchControls
            isRunning={isRunning}
            searchComplete={searchComplete}
            hasTarget={target !== ""}
            canPrevious={currentIndex >= 0 || foundIndex !== null || notFound}
            onToggleSearch={toggleSearch}
            onPrevious={previousStep}
            onStep={handleStep}
            onReset={() => reset()}
            onRandomize={randomizeArray}
          />
        </div>

        <div className="array-editor">
          <label className="values-field">
            <span>Valores del arreglo</span>
            <input
              type="text"
              value={valuesInput}
              onChange={(event) => {
                setValuesInput(event.target.value);
                setArrayError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyCustomArray(event);
              }}
              placeholder=""
            />
          </label>
          <button type="button" className="button button-primary" onClick={applyCustomArray}>
            Aplicar arreglo
          </button>
          {arrayError && <p className="array-error" role="alert">{arrayError}</p>}
        </div>

        {searchComplete && (
          <section className="search-summary-panel" aria-label="Resumen de búsqueda">
            <div className="search-summary" aria-live="polite">
              <div className="search-summary-card">
                <span>Resultado</span>
                <strong>{foundIndex !== null ? `Índice ${foundIndex}` : "No encontrado"}</strong>
              </div>
              <div className="search-summary-card">
                <span>Caso alcanzado</span>
                <strong>{caseLabel}</strong>
              </div>
              <div className="search-summary-card">
                <span>Comparaciones</span>
                <strong>{comparisons} (esperadas ≈ {expected})</strong>
              </div>
            </div>
          </section>
        )}

        <div className={`search-status search-status-${statusKind}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>

        <div className="array-section">
          <div className="array-heading">
            <span>Arreglo</span>
          </div>
          <div
            ref={gridRef}
            className={`array-grid ${foundIndex !== null ? "array-grid-found" : ""}`}
            aria-label="Elementos del arreglo"
          >
            {array.map((value, index) => {
              const isFound = index === foundIndex;
              const isCurrent = index === currentIndex && !isFound;
              const isLeftPointer = index === leftIndex;
              const isPosPointer = index === currentIndex;
              const isRightPointer = index === rightIndex;
              const isInRange = !notFound
                && leftIndex >= 0
                && rightIndex >= 0
                && index >= leftIndex
                && index <= rightIndex;
              const isChecked = !isInRange && !isFound;

              const stateClass = isFound
                ? "array-cell-found"
                : isCurrent
                  ? "array-cell-current"
                  : isChecked
                    ? "array-cell-checked"
                    : "array-cell-pending";

              const label = isFound
                ? "Encontrado"
                : isCurrent
                  ? "Estimado"
                  : isChecked
                    ? "Descartado"
                    : null;

              const rangeClass = isInRange
                ? `array-slot-range${index === leftIndex || index % columns === 0 ? " array-slot-range-start" : ""}${index === rightIndex || (index + 1) % columns === 0 ? " array-slot-range-end" : ""}`
                : "";

              return (
                <div className={`array-slot ${rangeClass}`} key={`${value}-${index}`}>
                  <div className="pointer-markers">
                    {isLeftPointer && <span className="pointer-mark pointer-left" title="Izquierda (L)">L</span>}
                    {isPosPointer && <span className="pointer-mark pointer-middle" title="Posición estimada (P)">P</span>}
                    {isRightPointer && <span className="pointer-mark pointer-right" title="Derecha (R)">R</span>}
                  </div>
                  <div className={`array-cell ${stateClass}`}>
                    {label && <span className="cell-label">{label}</span>}
                    <strong className="cell-value">{value}</strong>
                    <span className="cell-index">{index}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pointer-legend" aria-label="Leyenda de punteros">
            <span className="pointer-legend-item"><span className="pointer-mark pointer-left">L</span> izquierda</span>
            <span className="pointer-legend-item"><span className="pointer-mark pointer-middle">P</span> posición estimada</span>
            <span className="pointer-legend-item"><span className="pointer-mark pointer-right">R</span> derecha</span>
          </div>
        </div>

        <div className="formula-section">
          <div className="formula-title">
            <span>Cálculo de pos</span>
            <span className="formula-title-note">v = valor objetivo</span>
          </div>

          {lastStep ? (
            <div className="formula-box" aria-live="polite">
              {lastStep.equalEnds ? (
                <div className="formula-expr">
                  <span>A[low] = A[high] = {lastStep.lo}</span>
                  <span>→</span>
                  <span>pos = low =</span>
                  <span className="formula-result">{lastStep.pos}</span>
                </div>
              ) : (
                <FormulaSteps step={lastStep} goal={goal} />
              )}

              <div className="formula-verdict">
                <span className="formula-pill">
                  arr[{lastStep.pos}] = {lastStep.value} {compareSymbol(lastStep.value, goal)} {goal}
                </span>
                {lastStep.value === goal ? (
                  <span className="formula-pill formula-pill-success">¡encontrado!</span>
                ) : lastStep.value < goal ? (
                  <span className="formula-pill formula-pill-info">se busca a la derecha: izquierda = {lastStep.pos + 1}</span>
                ) : (
                  <span className="formula-pill formula-pill-info">se busca a la izquierda: derecha = {lastStep.pos - 1}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="formula-box formula-box-empty">
              Da el primer paso para ver la sustitución.
            </div>
          )}
        </div>

        <div className="code-section">
          <div className="code-header">
            <span>Código Python — búsqueda por interpolación</span>
            <div className="code-vars">
              <span className="code-var-pill">
                izquierda = {leftIndex >= 0 ? leftIndex : "—"}
              </span>
              <span className="code-var-pill">
                pos = {currentIndex >= 0 ? currentIndex : "—"}
              </span>
              <span className="code-var-pill">
                derecha = {rightIndex}
              </span>
              <span className="code-var-pill">
                arr[pos] = {currentVal !== null ? currentVal : "—"}
              </span>
              <span className="code-var-pill">
                objetivo = {target !== "" ? goal : "—"}
              </span>
            </div>
          </div>

          <pre className="code-block" aria-label="Código Python de búsqueda por interpolación">
            {CODE_LINES.map((line) => {
              const isActive = line.num === activeLine;
              const lineClass = !isActive
                ? ""
                : foundIndex !== null
                  ? "code-line-found"
                  : notFound
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

          <div className="code-eval-preview">{evalExpression}</div>
        </div>
      </section>

      <ComplexityChartWindow
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        arrayLength={array.length}
        comparisons={comparisons}
        foundIndex={foundIndex}
        notFound={notFound}
        canPrevious={currentIndex >= 0 || foundIndex !== null || notFound}
        isRunning={isRunning}
        searchComplete={searchComplete}
        hasTarget={target !== ""}
        onToggleSearch={toggleSearch}
        onPrevious={previousStep}
        onStep={handleStep}
        onReset={() => reset()}
      />
    </main>
  );
}
