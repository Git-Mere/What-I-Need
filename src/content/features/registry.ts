import { t } from "../../shared/i18n";

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
  { name: "Marker", label: "M" },
  { name: "Brush", label: "B" },
  { name: "Memo", label: "N" },
  { name: "Calculator", label: "C" },
  { name: "Multi-search", label: "S" },
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
