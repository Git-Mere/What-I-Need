import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import {
  applyTop,
  clampTop,
  currentRailTop,
  occupiedPanelHeight,
  startVerticalDrag
} from "../rail-position";
import { FEATURES, type WidFeatureName } from "./registry";
import { Brush } from "./brush";
import { Calculator } from "./calc";
import { Memo } from "./memo";
import { Search } from "./search";

type PanelProps = {
  initialFeature: WidFeatureName;
  onClose: () => void;
};

function FeatureContent({ feature }: { feature: WidFeatureName }) {
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

  return (
    <div class="wid-coming-soon">
      <strong>{feature}</strong>
      <span>Coming soon.</span>
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

  // Handle 3: dragging the top icon bar repositions the whole rail/panel. The
  // feature icons and close button keep their clicks (a drag suppresses the
  // trailing click). Clamp against the live panel height so it stays on screen.
  const onBarPointerDown = (event: PointerEvent) => {
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
        {FEATURES.map((feature) => (
          <button
            key={feature.name}
            type="button"
            class="wid-action"
            data-active={feature.name === active}
            aria-selected={feature.name === active}
            title={feature.name}
            aria-label={feature.name}
            onClick={() => setActive(feature.name)}
          >
            {feature.label}
          </button>
        ))}
        <button
          type="button"
          class="wid-expanded-close"
          title="Collapse"
          aria-label="Collapse panel"
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
