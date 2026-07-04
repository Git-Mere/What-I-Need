import { useEffect, useRef, useState } from "preact/hooks";

import { getStorageValue, setStorageValue } from "../../shared/storage";

// The native Chromium EyeDropper API is not in the default TS DOM lib, so declare
// the minimal surface we use rather than casting to `any`.
declare global {
  interface EyeDropperResult {
    sRGBHex: string;
  }
  interface EyeDropper {
    open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
  }
  interface Window {
    EyeDropper?: { new (): EyeDropper };
  }
}

const COPY_FEEDBACK_MS = 1000;

const supported =
  typeof window !== "undefined" && typeof window.EyeDropper !== "undefined";

// sRGBHex from the API is `#rrggbb`; render it as `rgb(r, g, b)`.
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export function Eyedropper() {
  const [hex, setHex] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    getStorageValue("wid:eyedropper").then((stored) => {
      if (!active) {
        return;
      }
      if (stored?.hex) {
        setHex(stored.hex);
      }
    });

    return () => {
      active = false;
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const pick = async () => {
    if (!window.EyeDropper) {
      return;
    }
    try {
      const ed = new window.EyeDropper();
      const { sRGBHex } = await ed.open();
      const picked = sRGBHex.toUpperCase();
      setHex(picked);
      void setStorageValue("wid:eyedropper", { hex: picked });
    } catch {
      // AbortError: user pressed Esc / cancelled. Keep the previous color.
    }
  };

  const copy = async () => {
    if (!hex) {
      return;
    }
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, COPY_FEEDBACK_MS);
    } catch {
      // Clipboard write denied: no feedback, leave the label unchanged.
    }
  };

  return (
    <div class="wid-eyedropper">
      <button
        type="button"
        class="wid-eyedropper-pick"
        disabled={!supported}
        onClick={pick}
      >
        Pick color / 색 채집
      </button>

      {!supported && (
        <p class="wid-eyedropper-note">
          This browser doesn't support the eyedropper.
        </p>
      )}

      {hex && (
        <div class="wid-eyedropper-result">
          <div
            class="wid-eyedropper-swatch"
            style={{ background: hex }}
            aria-hidden="true"
          />
          <div class="wid-eyedropper-codes">
            <div class="wid-eyedropper-hex-row">
              <span class="wid-eyedropper-hex">{hex}</span>
              <button
                type="button"
                class="wid-eyedropper-copy"
                onClick={copy}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <span class="wid-eyedropper-rgb">{hexToRgb(hex)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
