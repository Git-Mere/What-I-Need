import { render } from "preact";
import { useState } from "preact/hooks";

import { FEATURES, type WidFeatureName } from "./registry";
import { Memo } from "./memo";

type PanelProps = {
  initialFeature: WidFeatureName;
  onClose: () => void;
};

function FeatureContent({ feature }: { feature: WidFeatureName }) {
  if (feature === "Memo") {
    return <Memo />;
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

  return (
    <div class="wid-expanded">
      <div class="wid-expanded-header">
        <span class="wid-expanded-title">{active}</span>
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

      <div class="wid-expanded-bar" role="tablist">
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
