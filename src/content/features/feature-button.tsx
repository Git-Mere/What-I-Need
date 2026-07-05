import { featureName, type FeatureDescriptor } from "./registry";

// The one rule shared by every feature button/badge: inject the icon SVG when
// present, otherwise show the letter label. Returned as props to spread onto the
// host element so the panel toolbar button and the Help badge resolve the glyph
// the exact same way.
function glyph(feature: FeatureDescriptor) {
  return feature.icon
    ? { dangerouslySetInnerHTML: { __html: feature.icon } }
    : { children: feature.label };
}

// Panel toolbar button (imperative rail equivalent: applyFeatureGlyph in registry).
export function FeatureButton({
  feature,
  active,
  onClick
}: {
  feature: FeatureDescriptor;
  active: boolean;
  onClick: () => void;
}) {
  const label = featureName(feature.name);
  return (
    <button
      type="button"
      class="wid-action"
      data-active={active}
      aria-pressed={active}
      title={label}
      aria-label={label}
      onClick={onClick}
      {...glyph(feature)}
    />
  );
}

// Help-list badge (decorative; the localized name is rendered alongside it).
export function FeatureBadge({ feature }: { feature: FeatureDescriptor }) {
  return <span class="wid-help-badge" {...glyph(feature)} />;
}
