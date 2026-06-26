type RailAction = {
  name: string;
  label: string;
};

const ACTIONS: RailAction[] = [
  { name: "Marker", label: "M" },
  { name: "Brush", label: "B" },
  { name: "Memo", label: "N" },
  { name: "Calculator", label: "C" },
  { name: "Multi-search", label: "S" }
];

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
    .wid-action:focus-visible {
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
  `;

  const root = document.createElement("div");
  root.className = "wid-rail-root";

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

  for (const action of ACTIONS) {
    const button = document.createElement("button");
    button.className = "wid-action";
    button.type = "button";
    button.textContent = action.label;
    button.title = action.name;
    button.ariaLabel = action.name;
    button.addEventListener("click", () => {
      console.log(`[WID] ${action.name}`);
    });
    panel.append(button);
  }

  shell.append(tab, panel);
  root.append(shell);
  shadowRoot.append(style, root);
}
