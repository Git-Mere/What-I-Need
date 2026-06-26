const HOST_ID = "wid-shadow-host";

export function getOrCreateShadowRoot(): ShadowRoot {
  const existingHost = document.getElementById(HOST_ID);

  if (existingHost?.shadowRoot) {
    return existingHost.shadowRoot;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.append(host);

  return host.attachShadow({ mode: "open" });
}
