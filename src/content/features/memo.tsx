import { useEffect, useRef, useState } from "preact/hooks";

import { getStorageValue, setStorageValue } from "../../shared/storage";
import { t } from "../../shared/i18n";

const DEBOUNCE_MS = 400;

export function Memo() {
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest typed value, so a flush on unmount/hide writes what the user actually
  // typed instead of a value captured when the effect first ran.
  const latestRef = useRef("");

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
      void setStorageValue("wid:memo", { text: latestRef.current, updatedAt: Date.now() });
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
      const stored = memo?.text ?? "";
      latestRef.current = stored;
      setText(stored);
      setReady(true);
    });

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleHide);

    return () => {
      active = false;
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleHide);
      // Closing the panel unmounts within the debounce window; flushing here
      // persists the last keystroke that would otherwise be lost.
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
      void setStorageValue("wid:memo", { text: next, updatedAt: Date.now() });
    }, DEBOUNCE_MS);
  };

  return (
    <textarea
      class="wid-memo-textarea"
      placeholder={t("memo_placeholder")}
      value={text}
      disabled={!ready}
      onInput={handleInput}
    />
  );
}
