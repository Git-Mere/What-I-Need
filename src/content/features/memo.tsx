import { useEffect, useRef, useState } from "preact/hooks";

import { getStorageValue, setStorageValue } from "../../shared/storage";
import { t } from "../../shared/i18n";

const DEBOUNCE_MS = 400;

// Soft cap on memo size. chrome.storage.local has a ~10MB total quota and this
// extension does not request the "unlimitedStorage" permission, so guard against
// a runaway paste rather than letting the write fail silently at the quota.
const MAX_MEMO_LENGTH = 100_000;

export function Memo() {
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest typed value, so a flush on unmount/hide writes what the user actually
  // typed instead of a value captured when the effect first ran.
  const latestRef = useRef("");
  // Mounted flag so the async save's result never sets state after teardown
  // (the unmount cleanup flushes the last edit).
  const mountedRef = useRef(true);

  // Persist the memo, surfacing failures (quota exceeded, over the size cap, or a
  // rejected write during unload) instead of losing the note silently.
  const saveMemo = (value: string): void => {
    if (value.length > MAX_MEMO_LENGTH) {
      if (mountedRef.current) {
        setSaveFailed(true);
      }
      return;
    }
    setStorageValue("wid:memo", { text: value, updatedAt: Date.now() })
      .then(() => {
        if (mountedRef.current) {
          setSaveFailed(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setSaveFailed(true);
        }
      });
  };

  useEffect(() => {
    let active = true;

    // Write the pending debounced value now and cancel its timer. A null
    // debounceRef means the last edit already saved, so this is a no-op and
    // never double-writes or races the normal debounced save.
    const flush = (): void => {
      if (debounceRef.current === null) {
        return;
      }
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      saveMemo(latestRef.current);
    };

    const handleHide = (): void => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    getStorageValue("wid:memo").then((memo) => {
      if (!active) {
        return;
      }
      // Guard against corrupt/old-version data: only trust a string.
      const stored = typeof memo?.text === "string" ? memo.text : "";
      latestRef.current = stored;
      setText(stored);
      setReady(true);
    });

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleHide);

    return () => {
      active = false;
      mountedRef.current = false;
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleHide);
      // Closing the panel unmounts within the debounce window; flushing here
      // persists the last keystroke that would otherwise be lost. The write still
      // happens; only the (now-pointless) failure-state update is skipped.
      flush();
    };
  }, []);

  const handleInput = (event: Event) => {
    const next = (event.currentTarget as HTMLTextAreaElement).value;
    setText(next);
    latestRef.current = next;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      saveMemo(next);
    }, DEBOUNCE_MS);
  };

  return (
    <div class="wid-memo">
      <textarea
        class="wid-memo-textarea"
        placeholder={t("memo_placeholder")}
        value={text}
        disabled={!ready}
        onInput={handleInput}
      />
      {saveFailed && (
        <p class="wid-memo-error" role="alert">
          {t("memo_save_failed")}
        </p>
      )}
    </div>
  );
}
