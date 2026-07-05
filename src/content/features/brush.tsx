import { useEffect, useRef, useState } from "preact/hooks";

import { getBrushEngine } from "./brush-engine";
import { t, tRaw } from "../../shared/i18n";

const WHEEL_SIZE = 150;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const MIN_WIDTH = 1;
const MAX_WIDTH = 40;

type Hsv = { h: number; s: number; v: number };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// h 0-360, s/v 0-1 -> #rrggbb
function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number];
  if (h < 60) {
    rgb = [c, x, 0];
  } else if (h < 120) {
    rgb = [x, c, 0];
  } else if (h < 180) {
    rgb = [0, c, x];
  } else if (h < 240) {
    rgb = [0, x, c];
  } else if (h < 300) {
    rgb = [x, 0, c];
  } else {
    rgb = [c, 0, x];
  }
  const hex = rgb
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

function hexToHsv(hex: string): Hsv {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

// Human-friendly name for a KeyboardEvent.code.
function keyLabel(code: string): string {
  if (code === "Backquote") {
    return "`";
  }
  if (code.startsWith("Key")) {
    return code.slice(3);
  }
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  return code;
}

// Paints a full hue/saturation wheel at value=1 once; brightness is applied by
// a dimming overlay so the wheel never needs a per-pixel repaint.
function paintWheel(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const cx = WHEEL_RADIUS;
  const cy = WHEEL_RADIUS;
  const step = Math.PI / 180;
  for (let deg = 0; deg < 360; deg += 1) {
    const start = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, WHEEL_RADIUS, start, start + step + 0.02);
    ctx.closePath();
    ctx.fillStyle = `hsl(${deg}, 100%, 50%)`;
    ctx.fill();
  }
  // White center -> transparent edge gives the saturation ramp.
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, WHEEL_RADIUS);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

export function Brush() {
  const engine = getBrushEngine();
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const [hsv, setHsv] = useState<Hsv>({ h: 0, s: 1, v: 1 });
  const [width, setWidth] = useState(4);
  const [keyCode, setKeyCode] = useState("Backquote");
  const [eraser, setEraser] = useState(false);
  const [rebinding, setRebinding] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    engine.ready.then(() => {
      if (!active) {
        return;
      }
      setHsv(hexToHsv(engine.settings.color));
      setWidth(engine.settings.width);
      setKeyCode(engine.settings.key);
      setEraser(engine.eraser);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [engine]);

  useEffect(() => {
    if (wheelRef.current) {
      paintWheel(wheelRef.current);
    }
  }, []);

  // Capture the next keypress as the new activation key.
  useEffect(() => {
    if (!rebinding) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setRebinding(false);
        return;
      }
      setKeyCode(event.code);
      engine.setKey(event.code);
      setRebinding(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [rebinding, engine]);

  const applyColor = (next: Hsv) => {
    setHsv(next);
    engine.setColor(hsvToHex(next));
  };

  const pickFromWheel = (event: PointerEvent) => {
    const canvas = wheelRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const dx = event.clientX - rect.left - WHEEL_RADIUS;
    const dy = event.clientY - rect.top - WHEEL_RADIUS;
    const dist = Math.hypot(dx, dy);
    const s = clamp01(dist / WHEEL_RADIUS);
    let h = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (h < 0) {
      h += 360;
    }
    applyColor({ h, s, v: hsv.v });
  };

  const onWheelDown = (event: PointerEvent) => {
    draggingRef.current = true;
    (event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId);
    pickFromWheel(event);
  };

  const onWheelMove = (event: PointerEvent) => {
    if (draggingRef.current) {
      pickFromWheel(event);
    }
  };

  const onWheelUp = () => {
    draggingRef.current = false;
  };

  const changeWidth = (value: number) => {
    setWidth(value);
    engine.setWidth(value);
  };

  const changeValue = (value: number) => {
    applyColor({ ...hsv, v: value });
  };

  const toggleEraser = () => {
    const next = !eraser;
    setEraser(next);
    engine.setEraser(next);
  };

  const markerRad = (hsv.h * Math.PI) / 180;
  const markerX = WHEEL_RADIUS + Math.cos(markerRad) * hsv.s * WHEEL_RADIUS;
  const markerY = WHEEL_RADIUS + Math.sin(markerRad) * hsv.s * WHEEL_RADIUS;
  const color = hsvToHex(hsv);
  // The hint wraps the key in <strong> between two localized fragments. Some
  // locales leave the leading fragment empty (Korean has no text before the
  // key), so read them raw: t()'s "|| key" fallback would turn a legitimately
  // empty message into the visible key name.
  const hintBefore = tRaw("brush_hint_before_key");
  const hintAfter = tRaw("brush_hint_after_key");

  return (
    <div class="wid-brush" aria-disabled={!ready}>
      <div class="wid-brush-wheel-wrap" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        <canvas
          ref={wheelRef}
          class="wid-brush-wheel"
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          onPointerDown={onWheelDown}
          onPointerMove={onWheelMove}
          onPointerUp={onWheelUp}
          onPointerCancel={onWheelUp}
        />
        <div class="wid-brush-wheel-dim" style={{ opacity: 1 - hsv.v }} aria-hidden="true" />
        <div
          class="wid-brush-wheel-marker"
          style={{ left: markerX, top: markerY }}
          aria-hidden="true"
        />
      </div>

      <label class="wid-brush-field">
        <span>{t("brush_brightness")}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          onInput={(event) =>
            changeValue(Number((event.currentTarget as HTMLInputElement).value) / 100)
          }
        />
      </label>

      <label class="wid-brush-field">
        <span>{t("brush_width")}</span>
        <input
          type="range"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          value={width}
          onInput={(event) =>
            changeWidth(Number((event.currentTarget as HTMLInputElement).value))
          }
        />
        <span class="wid-brush-width-value">{width}</span>
      </label>

      <div class="wid-brush-preview">
        <span class="wid-brush-swatch" style={{ background: color }} aria-hidden="true" />
        <span class="wid-brush-color-text">{color}</span>
      </div>

      <div class="wid-brush-actions">
        <button
          type="button"
          class="wid-brush-btn"
          data-active={eraser}
          aria-pressed={eraser}
          onClick={toggleEraser}
        >
          {t("brush_eraser")}
        </button>
        <button type="button" class="wid-brush-btn" onClick={() => engine.clearAll()}>
          {t("brush_clear_all")}
        </button>
      </div>

      <div class="wid-brush-field">
        <span>{t("brush_shortcut")}</span>
        <button
          type="button"
          class="wid-brush-key"
          data-capturing={rebinding}
          onClick={() => setRebinding((current) => !current)}
        >
          {rebinding ? t("brush_press_key") : t("brush_hold_key", [keyLabel(keyCode)])}
        </button>
      </div>

      <p class="wid-brush-hint">{hintBefore}<strong>{keyLabel(keyCode)}</strong>{hintAfter}</p>
    </div>
  );
}
