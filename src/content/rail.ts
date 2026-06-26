import { FEATURES, type WidFeatureName } from "./features/registry";

export function renderRail(shadowRoot: ShadowRoot): void {
  shadowRoot.replaceChildren();

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
    }

    .wid-rail-root {
      position: fixed;
      top: 25%;
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
      top: 10vh;
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

  let unmountPanel: (() => void) | null = null;

  function collapse(): void {
    if (unmountPanel) {
      unmountPanel();
      unmountPanel = null;
    }
    expanded.replaceChildren();
    root.dataset.mode = "collapsed";
    shell.dataset.open = "false";
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
  }
}
