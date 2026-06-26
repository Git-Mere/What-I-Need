import { useEffect, useRef, useState } from "preact/hooks";

import { getStorageValue, setStorageValue } from "../../shared/storage";

const DEBOUNCE_MS = 400;

export function Memo() {
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    getStorageValue("wid:memo").then((memo) => {
      if (!active) {
        return;
      }
      setText(memo?.text ?? "");
      setReady(true);
    });

    return () => {
      active = false;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInput = (event: Event) => {
    const next = (event.currentTarget as HTMLTextAreaElement).value;
    setText(next);

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
      placeholder="Type a note. It saves automatically."
      value={text}
      disabled={!ready}
      onInput={handleInput}
    />
  );
}
