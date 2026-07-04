import { FEATURES, type WidFeatureName } from "./features/registry";
import {
  RAIL_SHELL_HEIGHT,
  applyTop,
  clampTop,
  currentRailTop,
  loadRailTop,
  occupiedPanelHeight,
  startVerticalDrag
} from "./rail-position";

export function renderRail(shadowRoot: ShadowRoot): void {
  shadowRoot.replaceChildren();

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
    }

    .wid-rail-root {
      position: fixed;
      top: var(--wid-rail-top, 25%);
      right: 0;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #17202a;
    }

    .wid-rail-shell {
      position: relative;
      width: 48px;
      height: 232px;
      transform: translateX(40px);
      transition: transform 160ms ease;
    }

    .wid-rail-shell[data-open="true"] {
      transform: translateX(0);
    }

    .wid-rail-root[data-mode="expanded"] .wid-rail-shell {
      display: none;
    }

    .wid-tab {
      position: absolute;
      top: 0;
      left: 0;
      width: 8px;
      height: 100%;
      padding: 0;
      border: 0;
      border-radius: 6px 0 0 6px;
      background: #1f2937;
      cursor: pointer;
      touch-action: none;
    }

    .wid-tab:focus-visible,
    .wid-action:focus-visible,
    .wid-expanded-close:focus-visible,
    .wid-calc-button:focus-visible,
    .wid-calc-history-toggle:focus-visible,
    .wid-calc-history-clear:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .wid-panel {
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      min-height: 100%;
      display: grid;
      gap: 6px;
      align-content: center;
      padding: 8px 6px;
      box-sizing: border-box;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-right: 0;
      border-radius: 8px 0 0 8px;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      cursor: grab;
      touch-action: none;
      user-select: none;
    }

    .wid-action {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 6px;
      background: #f8fafc;
      color: #17202a;
      font: 600 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-action:hover {
      background: #e8eef7;
    }

    .wid-action[data-active="true"] {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
    }

    .wid-expanded {
      display: none;
      flex-direction: column;
      width: 340px;
      height: auto;
      min-height: min(440px, 85vh);
      max-height: 85vh;
      box-sizing: border-box;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-right: 0;
      border-radius: 10px 0 0 10px;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      overflow: hidden;
    }

    .wid-rail-root[data-mode="expanded"] .wid-expanded {
      display: flex;
      position: fixed;
      top: var(--wid-rail-top, 10vh);
      right: 0;
    }

    .wid-expanded-close {
      width: 28px;
      height: 28px;
      margin-left: auto;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 6px;
      background: #f8fafc;
      color: #475569;
      font: 400 18px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-expanded-close:hover {
      background: #e8eef7;
    }

    .wid-expanded-content {
      flex: 1;
      min-height: 0;
      display: flex;
      padding: 10px;
    }

    .wid-expanded-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.12);
      background: #f8fafc;
      cursor: grab;
      touch-action: none;
      user-select: none;
    }

    .wid-memo-textarea {
      flex: 1;
      width: 100%;
      resize: none;
      box-sizing: border-box;
      padding: 8px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 6px;
      background: #ffffff;
      color: #17202a;
      font: 400 13px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-memo-textarea:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 0;
    }

    .wid-calc {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #17202a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-calc-indicator {
      min-height: 16px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 10px;
      color: #94a3b8;
      font: 500 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow-wrap: anywhere;
      text-align: right;
    }

    .wid-calc-display {
      min-height: 48px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 6px;
      background: #f8fafc;
      color: #0f172a;
      font: 600 24px/1.15 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow-wrap: anywhere;
      text-align: right;
    }

    .wid-calc-keypad {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }

    .wid-calc-button {
      height: 32px;
      min-width: 0;
      box-sizing: border-box;
      padding: 0;
      border: 1px solid rgba(15, 23, 42, 0.14);
      border-radius: 6px;
      background: #ffffff;
      color: #17202a;
      font: 600 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-calc-button:hover {
      background: #e8eef7;
    }

    .wid-calc-button-muted {
      background: #f1f5f9;
      color: #334155;
      font-weight: 500;
    }

    .wid-calc-button-op {
      background: #eef2ff;
      color: #1e3a8a;
    }

    .wid-calc-button-equals {
      border-color: #2563eb;
      background: #2563eb;
      color: #ffffff;
    }

    .wid-calc-button-equals:hover {
      background: #1d4ed8;
    }

    .wid-calc-history {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .wid-calc-history[data-open="true"] {
      flex: 1 1 auto;
    }

    .wid-calc-history-bar {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .wid-calc-history-toggle {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 6px 8px;
      border: 1px solid rgba(15, 23, 42, 0.16);
      border-radius: 6px;
      background: #f8fafc;
      color: #334155;
      font: 600 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-calc-history-toggle:hover {
      background: #e8eef7;
    }

    .wid-calc-history-caret {
      color: #64748b;
      font-size: 10px;
    }

    .wid-calc-history-clear {
      padding: 4px 8px;
      border: 1px solid rgba(15, 23, 42, 0.16);
      border-radius: 6px;
      background: #ffffff;
      color: #334155;
      font: 500 11px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-calc-history-clear:hover:not(:disabled) {
      background: #e8eef7;
    }

    .wid-calc-history-clear:disabled {
      cursor: default;
      opacity: 0.55;
    }

    .wid-calc-history-list {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      margin-top: 6px;
      padding: 8px;
      border: 1px solid rgba(15, 23, 42, 0.14);
      border-radius: 6px;
    }

    .wid-calc-history-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      color: #475569;
      font: 400 12px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-calc-history-calc {
      flex: 1 1 auto;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .wid-calc-history-time {
      flex: 0 0 auto;
      margin-left: auto;
      color: #94a3b8;
      font-size: 11px;
      text-align: right;
      white-space: nowrap;
    }

    .wid-calc-history-empty {
      color: #475569;
      font: 400 12px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow-wrap: anywhere;
    }

    .wid-calc-history-item + .wid-calc-history-item {
      margin-top: 8px;
    }

    .wid-calc-history-empty {
      color: #94a3b8;
    }

    .wid-search {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #17202a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-search-rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 0;
      overflow: auto;
    }

    .wid-search-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .wid-search-dot {
      flex: 0 0 auto;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(15, 23, 42, 0.2);
    }

    .wid-search-input {
      flex: 1 1 auto;
      min-width: 0;
      box-sizing: border-box;
      height: 30px;
      padding: 0 8px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 6px;
      background: #ffffff;
      color: #17202a;
      font: 400 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-search-input:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 0;
    }

    .wid-search-count {
      flex: 0 0 auto;
      min-width: 20px;
      text-align: right;
      color: #64748b;
      font: 500 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
    }

    .wid-search-nav {
      flex: 0 0 auto;
      width: 22px;
      height: 24px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(15, 23, 42, 0.16);
      border-radius: 6px;
      background: #f8fafc;
      color: #475569;
      font: 400 10px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-search-nav:hover:not(:disabled) {
      background: #e8eef7;
    }

    .wid-search-nav:disabled {
      cursor: default;
      opacity: 0.35;
    }

    .wid-search-remove {
      flex: 0 0 auto;
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(15, 23, 42, 0.16);
      border-radius: 6px;
      background: #f8fafc;
      color: #475569;
      font: 400 16px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-search-remove:hover:not(:disabled) {
      background: #e8eef7;
    }

    .wid-search-remove:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .wid-search-add {
      align-self: flex-start;
      padding: 6px 10px;
      border: 1px dashed rgba(15, 23, 42, 0.28);
      border-radius: 6px;
      background: #ffffff;
      color: #334155;
      font: 500 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-search-add:hover:not(:disabled) {
      background: #f1f5f9;
    }

    .wid-search-add:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .wid-search-add:focus-visible,
    .wid-search-nav:focus-visible,
    .wid-search-remove:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .wid-coming-soon {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font: 400 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-brush {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: #17202a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-brush-wheel-wrap {
      position: relative;
      flex: 0 0 auto;
      border-radius: 50%;
    }

    .wid-brush-wheel {
      display: block;
      border-radius: 50%;
      cursor: crosshair;
      touch-action: none;
    }

    .wid-brush-wheel-dim {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: #000000;
      pointer-events: none;
    }

    .wid-brush-wheel-marker {
      position: absolute;
      width: 12px;
      height: 12px;
      transform: translate(-50%, -50%);
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.6);
      pointer-events: none;
    }

    .wid-brush-field {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      color: #475569;
      font: 500 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-brush-field > span:first-child {
      flex: 0 0 68px;
    }

    .wid-brush-field input[type="range"] {
      flex: 1 1 auto;
      min-width: 0;
    }

    .wid-brush-width-value {
      flex: 0 0 auto;
      min-width: 20px;
      text-align: right;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }

    .wid-brush-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .wid-brush-swatch {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 1px solid rgba(15, 23, 42, 0.2);
    }

    .wid-brush-color-text {
      color: #64748b;
      font: 500 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      text-transform: uppercase;
    }

    .wid-brush-actions {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    .wid-brush-btn {
      flex: 1 1 auto;
      height: 30px;
      padding: 0 10px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 6px;
      background: #f8fafc;
      color: #334155;
      font: 600 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-brush-btn:hover {
      background: #e8eef7;
    }

    .wid-brush-btn[data-active="true"] {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
    }

    .wid-brush-key {
      flex: 1 1 auto;
      height: 30px;
      padding: 0 10px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      border-radius: 6px;
      background: #ffffff;
      color: #17202a;
      font: 600 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .wid-brush-key:hover {
      background: #e8eef7;
    }

    .wid-brush-key[data-capturing="true"] {
      border-color: #2563eb;
      color: #2563eb;
    }

    .wid-brush-hint {
      margin: 0;
      width: 100%;
      color: #94a3b8;
      font: 400 11px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-brush-btn:focus-visible,
    .wid-brush-key:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
  `;

  const root = document.createElement("div");
  root.className = "wid-rail-root";
  root.dataset.mode = "collapsed";

  const shell = document.createElement("div");
  shell.className = "wid-rail-shell";
  shell.dataset.open = "false";

  const tab = document.createElement("button");
  tab.className = "wid-tab";
  tab.type = "button";
  tab.ariaLabel = "Toggle What I Need tools";
  // Click (mouse or keyboard Enter/Space) toggles the rail open. A drag suppresses
  // the trailing click via startVerticalDrag, so this only fires on a real tap.
  tab.addEventListener("click", () => {
    shell.dataset.open = shell.dataset.open === "true" ? "false" : "true";
  });

  const panel = document.createElement("div");
  panel.className = "wid-panel";

  for (const feature of FEATURES) {
    const button = document.createElement("button");
    button.className = "wid-action";
    button.type = "button";
    button.textContent = feature.label;
    button.title = feature.name;
    button.ariaLabel = feature.name;
    button.addEventListener("click", () => {
      void openPanel(feature.name);
    });
    panel.append(button);
  }

  const expanded = document.createElement("div");
  expanded.className = "wid-expanded";

  shell.append(tab, panel);
  root.append(shell, expanded);
  shadowRoot.append(style, root);

  // Paint the saved position, clamped so whatever is visible in the current mode
  // stays fully on screen (rail shell when collapsed, panel when expanded). The
  // inner Preact .wid-expanded holds the real panel content.
  function applyPosition(): void {
    const inner = expanded.querySelector<HTMLElement>(".wid-expanded");
    const occupied =
      root.dataset.mode === "expanded"
        ? occupiedPanelHeight(inner ?? expanded)
        : RAIL_SHELL_HEIGHT;
    applyTop(root, clampTop(currentRailTop(), occupied));
  }

  // Handle 1: the collapsed rail bar. Drag = reposition; a plain tap toggles via
  // the click listener above.
  tab.addEventListener("pointerdown", (event) => {
    startVerticalDrag(event, tab, {
      occupiedHeight: () => RAIL_SHELL_HEIGHT,
      apply: (px) => applyTop(root, px)
    });
  });

  // Handle 2: the opened icon strip (no feature selected). Drag = reposition; the
  // icon buttons keep their own click (drag suppresses the trailing click).
  panel.addEventListener("pointerdown", (event) => {
    startVerticalDrag(event, panel, {
      occupiedHeight: () => RAIL_SHELL_HEIGHT,
      apply: (px) => applyTop(root, px)
    });
  });

  // Seed with the default until the saved value loads; re-clamp on viewport resize.
  applyTop(root, clampTop(currentRailTop(), RAIL_SHELL_HEIGHT));
  void loadRailTop().then(applyPosition);
  window.addEventListener("resize", applyPosition);

  let unmountPanel: (() => void) | null = null;

  function collapse(): void {
    if (unmountPanel) {
      unmountPanel();
      unmountPanel = null;
    }
    expanded.replaceChildren();
    root.dataset.mode = "collapsed";
    shell.dataset.open = "false";
    applyPosition();
  }

  async function openPanel(initialFeature: WidFeatureName): Promise<void> {
    root.dataset.mode = "expanded";
    const { mountPanel } = await import("./features/panel");
    if (root.dataset.mode !== "expanded") {
      return;
    }
    if (unmountPanel) {
      unmountPanel();
    }
    unmountPanel = mountPanel(expanded, { initialFeature, onClose: collapse });
    // Nudge the panel up if the saved position would run it off the bottom.
    applyPosition();
  }
}
