import { t } from "../../shared/i18n";
import markIcon from "../../assets/icons/mark.svg?raw";
import brushIcon from "../../assets/icons/brush.svg?raw";
import memoIcon from "../../assets/icons/memo.svg?raw";
import calculatorIcon from "../../assets/icons/calculator.svg?raw";
import searchIcon from "../../assets/icons/search.svg?raw";
import helpIcon from "../../assets/icons/help.svg?raw";

export type WidFeatureName =
  | "Marker"
  | "Brush"
  | "Memo"
  | "Calculator"
  | "Multi-search"
  | "Eyedropper"
  | "Help";

// Single source of truth for every feature's metadata. FEATURES (rail + panel
// toolbar), the Help list, and the panel's content routing are all derived from
// this one catalog instead of hand-synced parallel lists.
//   name    - canonical identity used for routing/state.
//   label   - single-letter fallback shown when there is no icon.
//   nameKey - chrome.i18n key for the localized display name (title/aria/heading).
//   icon    - raw SVG markup (?raw, inlined at build time so it can be injected
//             into the shadow root without web_accessible_resources), or null to
//             fall back to `label`.
//   descKey - chrome.i18n key for the Help-list description, or null when the
//             feature is not listed in Help (Help itself, Eyedropper).
//   inRail  - whether the feature appears in the rail strip + panel toolbar.
export type FeatureDescriptor = {
  name: WidFeatureName;
  label: string;
  nameKey: string;
  icon: string | null;
  descKey: string | null;
  inRail: boolean;
};

export const FEATURE_CATALOG: FeatureDescriptor[] = [
  { name: "Multi-search", label: "S", nameKey: "feature_multi_search", icon: searchIcon, descKey: "help_multi_search_desc", inRail: true },
  { name: "Brush", label: "B", nameKey: "feature_brush", icon: brushIcon, descKey: "help_brush_desc", inRail: true },
  { name: "Memo", label: "N", nameKey: "feature_memo", icon: memoIcon, descKey: "help_memo_desc", inRail: true },
  { name: "Calculator", label: "C", nameKey: "feature_calculator", icon: calculatorIcon, descKey: "help_calculator_desc", inRail: true },
  { name: "Marker", label: "M", nameKey: "feature_marker", icon: markIcon, descKey: "help_marker_desc", inRail: true },
  // Eyedropper disabled: native EyeDropper API freezes the browser on some platforms after a successful pick. Descriptor/route preserved for later re-enable.
  { name: "Eyedropper", label: "E", nameKey: "feature_eyedropper", icon: null, descKey: null, inRail: false },
  { name: "Help", label: "?", nameKey: "feature_help", icon: helpIcon, descKey: null, inRail: true }
];

const BY_NAME = Object.fromEntries(
  FEATURE_CATALOG.map((feature) => [feature.name, feature])
) as Record<WidFeatureName, FeatureDescriptor>;

// Features shown in the rail strip and the panel toolbar, in catalog order.
export const FEATURES: FeatureDescriptor[] = FEATURE_CATALOG.filter((feature) => feature.inRail);

// Features listed in the Help panel, in catalog order (those with a description).
export const HELP_ENTRIES: (FeatureDescriptor & { descKey: string })[] = FEATURE_CATALOG.filter(
  (feature): feature is FeatureDescriptor & { descKey: string } => feature.descKey !== null
);

export function featureName(name: WidFeatureName): string {
  return t(BY_NAME[name].nameKey);
}

export function featureIcon(name: WidFeatureName): string | null {
  return BY_NAME[name].icon;
}

// Shared icon-or-letter glyph for the imperative (non-Preact) rail button. The
// two JSX sites use <FeatureButton>/<FeatureBadge>; this is the DOM-side
// counterpart of the same rule so all three render the glyph identically.
export function applyFeatureGlyph(el: HTMLElement, feature: FeatureDescriptor): void {
  if (feature.icon) {
    el.innerHTML = feature.icon;
  } else {
    el.textContent = feature.label;
  }
}
