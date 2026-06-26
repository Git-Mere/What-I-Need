import { renderRail } from "./rail";
import { getOrCreateShadowRoot } from "./shadow-root";

const shadowRoot = getOrCreateShadowRoot();

renderRail(shadowRoot);
