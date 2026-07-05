import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import {
  applyTop,
  clampTop,
  currentRailTop,
  occupiedPanelHeight,
  startVerticalDrag
} from "../rail-position";
import { FEATURES, featureIcon, featureName, type WidFeatureName } from "./registry";
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

function FeatureContent({ feature }: { feature: WidFeatureName }) {
  if (feature === "Marker") {
    return <Marker />;
  }

  if (feature === "Brush") {
    return <Brush />;
  }

  if (feature === "Memo") {
    return <Memo />;
  }

  if (feature === "Calculator") {
    return <Calculator />;
  }

  if (feature === "Multi-search") {
    return <Search />;
  }

  if (feature === "Eyedropper") {
    return <Eyedropper />;
  }

  if (feature === "Help") {
    return <Help />;
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
    <div class="wid-expanded" ref={panelRef}>
      <div class="wid-expanded-bar" role="tablist" onPointerDown={onBarPointerDown}>
        {FEATURES.map((feature) => {
          const icon = featureIcon(feature.name);
          return (
            <button
              key={feature.name}
              type="button"
              class="wid-action"
              data-active={feature.name === active}
              aria-selected={feature.name === active}
              title={featureName(feature.name)}
              aria-label={featureName(feature.name)}
              onClick={() => setActive(feature.name)}
              dangerouslySetInnerHTML={icon ? { __html: icon } : undefined}
            >
              {icon ? null : feature.label}
            </button>
          );
        })}
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
