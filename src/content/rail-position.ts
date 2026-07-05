import { getSettings, updateSettings } from "./settings-store";

// Height of the collapsed rail shell; keep in sync with .wid-rail-shell in rail.ts.
export const RAIL_SHELL_HEIGHT = 232;
// Movement (px) before a press is treated as a drag rather than a click.
const DRAG_THRESHOLD = 4;
// Vertical position before the user has ever dragged, as a fraction of the
// viewport so it scales across window sizes.
const DEFAULT_TOP_FRACTION = 0.15;
// Min-height of the expanded panel (matches .wid-expanded), used before it mounts.
const PANEL_FALLBACK_HEIGHT = 440;

let railTop: number | null = null; // persisted intent, px from viewport top; null = default
let applied = 0; // currently applied top, px (may be auto-clamped below railTop)

function defaultTop(): number {
  return Math.round(window.innerHeight * DEFAULT_TOP_FRACTION);
}

// The user's chosen top (persisted intent), independent of the current mode.
export function currentRailTop(): number {
  return railTop ?? defaultTop();
}

// The top currently painted on screen (a drag continues from here so it never jumps).
function appliedTop(): number {
  return applied;
}

// Clamp so an element `occupiedHeight` tall starting at `top` stays fully on screen.
export function clampTop(top: number, occupiedHeight: number): number {
  const max = Math.max(0, window.innerHeight - occupiedHeight);
  return Math.min(Math.max(0, Math.round(top)), max);
}

// Live height of the (downward-growing) expanded panel, for clamping. Falls back
// to the panel's min-height before it has laid out.
export function occupiedPanelHeight(panelEl: HTMLElement): number {
  const height = panelEl.getBoundingClientRect().height;
  return height > 0 ? height : Math.min(PANEL_FALLBACK_HEIGHT, window.innerHeight);
}

// Paint a position by setting the shared CSS variable (inherited by the rail and
// the mounted .wid-expanded panel, so they stay in lockstep).
export function applyTop(root: HTMLElement, px: number): void {
  applied = px;
  root.style.setProperty("--wid-rail-top", `${px}px`);
}

export async function loadRailTop(): Promise<void> {
  const settings = await getSettings();
  // getSettings guarantees railTop is a finite number when present (never NaN).
  // Clamp the stored intent into the current viewport so a value saved on a
  // taller window can't paint the rail off-screen.
  if (typeof settings.railTop === "number") {
    railTop = clampTop(settings.railTop, RAIL_SHELL_HEIGHT);
  }
}

async function persistRailTop(value: number): Promise<void> {
  await updateSettings({ railTop: value });
}

// Swallow the click a browser fires after a drag so toggle / feature-select /
// close do not trigger. Bound (capture phase) on the shadow root, a common
// ancestor of every handle, so it fires before any handle's own click listener
// (which sits on the target element and would otherwise run first).
function suppressNextClick(handle: HTMLElement): void {
  const target = handle.getRootNode() as ShadowRoot | Document;
  const handler = (event: Event): void => {
    event.stopPropagation();
    event.preventDefault();
  };
  target.addEventListener("click", handler, { capture: true, once: true });
  // Remove if no click follows (e.g. pointer released off-target).
  setTimeout(() => target.removeEventListener("click", handler, true), 0);
}

type DragOptions = {
  // Height that must stay on screen while dragging (rail shell vs. panel).
  occupiedHeight: () => number;
  // Paint the given top; should route through applyTop so appliedTop() stays current.
  apply: (px: number) => void;
};

// Vertical-only drag with pointer capture. Start it from a pointerdown handler.
export function startVerticalDrag(
  event: PointerEvent,
  handle: HTMLElement,
  opts: DragOptions
): void {
  const pointerId = event.pointerId;
  const startY = event.clientY;
  const startTop = appliedTop();
  let dragging = false;
  let latest = startTop;
  let raf: number | null = null;

  const flush = (): void => {
    raf = null;
    opts.apply(latest);
  };

  const onMove = (moveEvent: PointerEvent): void => {
    if (moveEvent.pointerId !== pointerId) {
      return;
    }
    const dy = moveEvent.clientY - startY;
    if (!dragging) {
      if (Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      dragging = true;
      // Capture only once it is a drag, so a plain click on a child button still
      // targets that button (capture would retarget the click to the handle).
      try {
        handle.setPointerCapture(pointerId);
      } catch {
        // Pointer already released; ignore.
      }
    }
    latest = clampTop(startTop + dy, opts.occupiedHeight());
    if (raf === null) {
      raf = requestAnimationFrame(flush);
    }
  };

  const onUp = (upEvent: PointerEvent): void => {
    if (upEvent.pointerId !== pointerId) {
      return;
    }
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    if (handle.hasPointerCapture(pointerId)) {
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    if (dragging) {
      opts.apply(latest);
      railTop = latest;
      void persistRailTop(latest);
      // A click follows only from a genuine tap; suppress the one after a drag.
      suppressNextClick(handle);
    }
    // A plain tap (no drag) falls through to the handle's own click listener.
  };

  // Bind on window, not the handle: a fast first move can leave the handle's
  // hit box (the rail bar is only 8px wide) before capture is set, and window
  // still receives every move/up so the drag never silently dies or leaks.
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
