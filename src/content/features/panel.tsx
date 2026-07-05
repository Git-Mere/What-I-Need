import { render, type ComponentType } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import {
  applyTop,
  clampTop,
  currentRailTop,
  occupiedPanelHeight,
  startVerticalDrag
} from "../rail-position";
import { FEATURES, featureName, type WidFeatureName } from "./registry";
import { FeatureButton } from "./feature-button";
import { t } from "../../shared/i18n";
import { Brush } from "./brush";
import { Calculator } from "./calc";
import { Eyedropper } from "./eyedropper";
import { Help } from "./help";
import { Marker } from "./marker";
import { Memo } from "./memo";
import { Search } from "./search";

type PanelProps = {
  initialFeature: WidFeatureName;
  onClose: () => void;
};

// Content routing derived from the feature catalog's name union: one component
// per feature name. Kept in the panel (lazy) chunk rather than the registry so
// these components are not eagerly bundled into the content-script entry.
const FEATURE_COMPONENTS: Partial<Record<WidFeatureName, ComponentType>> = {
  Marker,
  Brush,
  Memo,
  Calculator,
  "Multi-search": Search,
  Eyedropper,
  Help
};

function FeatureContent({ feature }: { feature: WidFeatureName }) {
  const Component = FEATURE_COMPONENTS[feature];
  if (Component) {
    return <Component />;
  }

  return (
    <div class="wid-coming-soon">
      <strong>{featureName(feature)}</strong>
      <span>{t("coming_soon")}</span>
    </div>
  );
}

function Panel({ initialFeature, onClose }: PanelProps) {
  const [active, setActive] = useState<WidFeatureName>(initialFeature);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-clamp whenever the panel's height changes (feature switch, calc history)
  // so a downward-growing panel anchored low never runs off the bottom.
  useEffect(() => {
    const panelEl = panelRef.current;
    const root = panelEl?.closest<HTMLElement>(".wid-rail-root");
    if (!panelEl || !root) {
      return;
    }
    const reclamp = (): void => {
      applyTop(root, clampTop(currentRailTop(), occupiedPanelHeight(panelEl)));
    };
    reclamp();
    const observer = new ResizeObserver(reclamp);
    observer.observe(panelEl);
    return () => observer.disconnect();
  }, []);

  // On open, move focus into the panel (the active feature button, or the panel
  // container as a fallback) so keyboard users land inside it instead of being
  // stranded on the page.
  useEffect(() => {
    const panelEl = panelRef.current;
    if (!panelEl) {
      return;
    }
    const target =
      panelEl.querySelector<HTMLElement>('.wid-action[data-active="true"]') ?? panelEl;
    target.focus({ preventScroll: true });
  }, []);

  // Escape closes the panel. Guard on defaultPrevented so a feature that handles
  // its own Escape (e.g. the marker rename input calls preventDefault) is not
  // overridden into closing the whole panel. Attaching to the panel container
  // scopes this to when focus is inside it and is removed automatically on
  // unmount.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !event.defaultPrevented) {
      onClose();
    }
  };

  // Handle 3: dragging the top icon bar repositions the whole rail/panel. Drag
  // only from the bar's own area; a press on a feature icon or the close button
  // must run that button's click, not start a reposition. Clamp against the live
  // panel height so it stays on screen.
  const onBarPointerDown = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    const bar = event.currentTarget as HTMLElement;
    const root = bar.closest<HTMLElement>(".wid-rail-root");
    const panelEl = bar.closest<HTMLElement>(".wid-expanded");
    if (!root || !panelEl) {
      return;
    }
    startVerticalDrag(event, bar, {
      occupiedHeight: () => occupiedPanelHeight(panelEl),
      apply: (px) => applyTop(root, px)
    });
  };

  return (
    <div class="wid-expanded" ref={panelRef} tabIndex={-1} onKeyDown={onKeyDown}>
      <div class="wid-expanded-bar" onPointerDown={onBarPointerDown}>
        <div class="wid-expanded-tools" role="toolbar" aria-label={t("panel_toolbar_aria")}>
          {FEATURES.map((feature) => (
            <FeatureButton
              key={feature.name}
              feature={feature}
              active={feature.name === active}
              onClick={() => setActive(feature.name)}
            />
          ))}
        </div>
        <button
          type="button"
          class="wid-expanded-close"
          title={t("panel_collapse_title")}
          aria-label={t("panel_collapse_aria")}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div class="wid-expanded-content">
        <FeatureContent feature={active} />
      </div>
    </div>
  );
}

export function mountPanel(
  host: HTMLElement,
  opts: PanelProps
): () => void {
  render(<Panel initialFeature={opts.initialFeature} onClose={opts.onClose} />, host);
  return () => render(null, host);
}
