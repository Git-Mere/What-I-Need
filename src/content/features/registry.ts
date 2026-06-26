export type WidFeatureName =
  | "Marker"
  | "Brush"
  | "Memo"
  | "Calculator"
  | "Multi-search";

export type WidFeature = {
  name: WidFeatureName;
  label: string;
};

export const FEATURES: WidFeature[] = [
  { name: "Marker", label: "M" },
  { name: "Brush", label: "B" },
  { name: "Memo", label: "N" },
  { name: "Calculator", label: "C" },
  { name: "Multi-search", label: "S" }
];
