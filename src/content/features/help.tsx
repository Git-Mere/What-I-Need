import { HELP_ENTRIES, featureName } from "./registry";
import { FeatureBadge } from "./feature-button";
import { t } from "../../shared/i18n";

export function Help() {
  return (
    <div class="wid-help">
      <p class="wid-help-intro">{t("help_intro")}</p>
      <ul class="wid-help-list">
        {HELP_ENTRIES.map((entry) => (
          <li key={entry.name} class="wid-help-item">
            <FeatureBadge feature={entry} />
            <div class="wid-help-body">
              <span class="wid-help-name">{featureName(entry.name)}</span>
              <span class="wid-help-desc">{t(entry.descKey)}</span>
            </div>
          </li>
        ))}
      </ul>
      <footer class="wid-help-footer">
        <a
          class="wid-help-support"
          href="https://buymeacoffee.com/mere.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("help_support")}
        </a>
      </footer>
    </div>
  );
}
