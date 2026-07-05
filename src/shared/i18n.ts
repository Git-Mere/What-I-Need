// Thin wrapper over chrome.i18n. The locale is chosen automatically by the
// browser UI language against the _locales/ bundle (default_locale = en); there
// is no user-facing toggle. Falls back to the key itself if a message is missing
// so a typo surfaces visibly instead of rendering an empty string.
export function t(key: string, subs?: string | string[]): string {
  return chrome.i18n.getMessage(key, subs) || key;
}

// Like t() but WITHOUT the key-name fallback: returns the raw message, which is
// '' when the message is intentionally empty or missing. Use it where an empty
// string is a legitimate value and the key name must never leak into the UI.
export function tRaw(key: string, subs?: string | string[]): string {
  return chrome.i18n.getMessage(key, subs);
}
