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
      top: 40%;
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
    .wid-expanded-close:focus-visible {
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
      height: 440px;
      max-height: 80vh;
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
    }

    .wid-expanded-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.12);
    }

    .wid-expanded-title {
      font: 600 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .wid-expanded-close {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
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
      gap: 6px;
      justify-content: center;
      padding: 8px;
      border-top: 1px solid rgba(15, 23, 42, 0.12);
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
