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
