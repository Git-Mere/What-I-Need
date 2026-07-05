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

export type WidFeature = {
  name: WidFeatureName;
  label: string;
};

export const FEATURES: WidFeature[] = [
  { name: "Multi-search", label: "S" },
  { name: "Brush", label: "B" },
  { name: "Memo", label: "N" },
  { name: "Calculator", label: "C" },
  { name: "Marker", label: "M" },
  // Eyedropper disabled: native EyeDropper API freezes the browser on some platforms after a successful pick. Component/route preserved for later re-enable.
  { name: "Help", label: "?" }
];

// `name` stays the canonical identity used for routing/state; this maps it to the
// localized display string (title, aria-label, help heading).
const FEATURE_NAME_KEYS: Record<WidFeatureName, string> = {
  Marker: "feature_marker",
  Brush: "feature_brush",
  Memo: "feature_memo",
  Calculator: "feature_calculator",
  "Multi-search": "feature_multi_search",
  Eyedropper: "feature_eyedropper",
  Help: "feature_help"
};

export function featureName(name: WidFeatureName): string {
  return t(FEATURE_NAME_KEYS[name]);
}

// Raw SVG markup per feature, inlined at build time (?raw) so it can be injected
// directly into the content-script shadow root without web_accessible_resources.
// Eyedropper is intentionally absent (disabled). Features without an entry fall
// back to their letter label.
const FEATURE_ICONS: Partial<Record<WidFeatureName, string>> = {
  Marker: markIcon,
  Brush: brushIcon,
  Memo: memoIcon,
  Calculator: calculatorIcon,
  "Multi-search": searchIcon,
  Help: helpIcon
};

export function featureIcon(name: WidFeatureName): string | null {
  return FEATURE_ICONS[name] ?? null;
}
