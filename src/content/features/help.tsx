import { featureIcon, featureName, type WidFeatureName } from "./registry";
import { t } from "../../shared/i18n";

type HelpEntry = {
  label: string;
  name: WidFeatureName;
  descKey: string;
};

const ENTRIES: HelpEntry[] = [
  { label: "S", name: "Multi-search", descKey: "help_multi_search_desc" },
  { label: "B", name: "Brush", descKey: "help_brush_desc" },
  { label: "N", name: "Memo", descKey: "help_memo_desc" },
  { label: "C", name: "Calculator", descKey: "help_calculator_desc" },
  { label: "M", name: "Marker", descKey: "help_marker_desc" }
];

export function Help() {
  return (
    <div class="wid-help">
      <p class="wid-help-intro">{t("help_intro")}</p>
      <ul class="wid-help-list">
        {ENTRIES.map((entry) => {
          const icon = featureIcon(entry.name);
          return (
          <li key={entry.name} class="wid-help-item">
            <span
              class="wid-help-badge"
              dangerouslySetInnerHTML={icon ? { __html: icon } : undefined}
            >
              {icon ? null : entry.label}
            </span>
            <div class="wid-help-body">
              <span class="wid-help-name">{featureName(entry.name)}</span>
              <span class="wid-help-desc">{t(entry.descKey)}</span>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
