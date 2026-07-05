import { DEFAULT_BRUSH, getSettings, updateSettings } from "../settings-store";

export type BrushSettings = {
  key: string;
  color: string;
  width: number;
};

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number };

const CANVAS_ID = "wid-brush-canvas";
const CURSOR_ID = "wid-brush-cursor";
const SHADOW_HOST_ID = "wid-shadow-host";
// One below the rail's z-index (2147483647) so drawings never cover the WID UI.
const CANVAS_Z_INDEX = "2147483646";
// Fixed eraser reach (px, from the pointer). The eraser cursor circle uses the
// matching diameter so what the ring covers is exactly what gets erased.
const ERASER_RADIUS = 12;

// The activation key must not fire while the user is typing. Focus inside the
// WID Shadow DOM UI resolves to the host element from the top document, so we
// treat any focus within it (memo/search inputs, the rebind button) as typing.
function isTypingContext(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) {
    return false;
  }
  if (active.id === SHADOW_HOST_ID) {
    return true;
  }
  const tag = active.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return active.isContentEditable;
}

// Full scrollable document size (not just the viewport).
function documentSize(): { width: number; height: number } {
  const doc = document.documentElement;
  const body = document.body;
  const width = Math.max(
    doc.scrollWidth,
    doc.clientWidth,
    body ? body.scrollWidth : 0,
    body ? body.offsetWidth : 0
  );
  const height = Math.max(
    doc.scrollHeight,
    doc.clientHeight,
    body ? body.scrollHeight : 0,
    body ? body.offsetHeight : 0
  );
  return { width, height };
}

// Shortest distance from point p to segment a->b (for object-level erasing).
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

// True if the eraser at `point` (radius `reach`) touches any part of the stroke.
function strokeHit(stroke: Stroke, point: Point, eraserRadius: number): boolean {
  const reach = eraserRadius + stroke.width / 2;
  const pts = stroke.points;
  if (pts.length === 1) {
    return Math.hypot(point.x - pts[0].x, point.y - pts[0].y) <= reach;
  }
  for (let i = 0; i < pts.length - 1; i += 1) {
    if (distanceToSegment(point, pts[i], pts[i + 1]) <= reach) {
      return true;
    }
  }
  return false;
}

class BrushEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  // Circular cursor that follows the pointer while drawing mode is active.
  private cursorEl: HTMLDivElement | null = null;
  private cursorPage: Point | null = null;
  // Vector stroke objects. Volatile: memory only, never persisted.
  private strokes: Stroke[] = [];
  private current: Stroke | null = null;
  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;
  private held = false;
  private drawing = false;
  private syncRaf: number | null = null;

  settings: BrushSettings = { ...DEFAULT_BRUSH };
  eraser = false;
  ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    // getSettings validates + coerces stored data, so this.settings.brush is
    // always well-formed (defaults substituted for missing/corrupt fields).
    const settings = await getSettings();
    this.settings = { ...settings.brush };
    this.mountCanvas();
    this.attachListeners();
  }

  private mountCanvas(): void {
    const canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    const s = canvas.style;
    s.position = "absolute";
    s.top = "0";
    s.left = "0";
    s.zIndex = CANVAS_Z_INDEX;
    s.pointerEvents = "none";
    s.touchAction = "none";
    // Sibling of the Shadow DOM host under <html>; scrolls with the page.
    document.documentElement.append(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mountCursor();
    this.syncSize();
    this.applyHeldStyle();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("pointerenter", this.onPointerEnter);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
  }

  // A ring that follows the pointer, standing in for the (hidden) OS cursor while
  // drawing. Absolutely positioned in page coords like the canvas, one z below
  // the WID UI, and never intercepts pointer events.
  private mountCursor(): void {
    const cursor = document.createElement("div");
    cursor.id = CURSOR_ID;
    const s = cursor.style;
    s.position = "absolute";
    s.zIndex = CANVAS_Z_INDEX;
    s.pointerEvents = "none";
    s.boxSizing = "border-box";
    s.borderRadius = "50%";
    // White ring plus a black outline so it reads on any background.
    s.border = "1.5px solid #ffffff";
    s.boxShadow = "0 0 0 1.5px rgba(0, 0, 0, 0.85)";
    s.display = "none";
    document.documentElement.append(cursor);
    this.cursorEl = cursor;
  }

  private attachListeners(): void {
    // Capture phase so a page that stops keydown propagation cannot hide it.
    window.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("resize", this.requestSync);
    const observer = new ResizeObserver(this.requestSync);
    observer.observe(document.documentElement);
    if (document.body) {
      observer.observe(document.body);
    }
  }

  private requestSync = (): void => {
    if (this.syncRaf !== null) {
      return;
    }
    this.syncRaf = requestAnimationFrame(() => {
      this.syncRaf = null;
      this.syncSize();
    });
  };

  // Resize the canvas to the document without losing existing strokes.
  private syncSize(): void {
    if (!this.canvas || !this.ctx) {
      return;
    }
    const { width, height } = documentSize();
    const dpr = window.devicePixelRatio || 1;
    if (width === this.cssWidth && height === this.cssHeight && dpr === this.dpr) {
      return;
    }
    this.cssWidth = width;
    this.cssHeight = height;
    this.dpr = dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    // Backing store scaled for crisp lines; changing width/height clears it.
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redrawAll();
  }

  // Map a pointer event to the canvas's internal coordinate space. The canvas
  // sits at the document origin at document size, so this is normally just
  // client + scroll. Going through the canvas's own rect additionally corrects
  // for any CSS transform / zoom on <html>/<body>: dividing by the rendered
  // rect size undoes a root scale so strokes still track the cursor. In the
  // untransformed case rect.width === cssWidth (so the scale factor is exactly
  // 1.0) and rect.left === -scrollX, making the result pixel-identical to
  // client + scroll.
  private toPagePoint(event: PointerEvent): Point {
    if (this.canvas && this.cssWidth > 0 && this.cssHeight > 0) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const scaleX = this.cssWidth / rect.width;
        const scaleY = this.cssHeight / rect.height;
        return {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY
        };
      }
    }
    return { x: event.clientX + window.scrollX, y: event.clientY + window.scrollY };
  }

  // Brush: diameter tracks the live stroke width. Eraser: fixed erase diameter.
  private cursorDiameter(): number {
    return this.eraser ? ERASER_RADIUS * 2 : this.settings.width;
  }

  // Resize + re-center the ring on the last known point (no-op if never moved).
  private positionCursor(): void {
    if (!this.cursorEl || !this.cursorPage) {
      return;
    }
    const d = this.cursorDiameter();
    const s = this.cursorEl.style;
    s.width = `${d}px`;
    s.height = `${d}px`;
    s.left = `${this.cursorPage.x - d / 2}px`;
    s.top = `${this.cursorPage.y - d / 2}px`;
  }

  private showCursor(page: Point): void {
    if (!this.cursorEl) {
      return;
    }
    this.cursorPage = page;
    this.positionCursor();
    this.cursorEl.style.display = "block";
  }

  private hideCursor(): void {
    if (this.cursorEl) {
      this.cursorEl.style.display = "none";
    }
  }

  private onPointerEnter = (event: PointerEvent): void => {
    if (this.held) {
      this.showCursor(this.toPagePoint(event));
    }
  };

  private onPointerLeave = (): void => {
    this.hideCursor();
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.held || !this.canvas) {
      return;
    }
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.drawing = true;
    const point = this.toPagePoint(event);
    this.showCursor(point);
    if (this.eraser) {
      this.eraseAt(point);
      return;
    }
    this.current = {
      points: [point],
      color: this.settings.color,
      width: this.settings.width
    };
    this.drawStroke(this.current);
  };

  private onPointerMove = (event: PointerEvent): void => {
    // Canvas events only fire while held, so the ring follows the pointer here.
    if (this.held) {
      this.showCursor(this.toPagePoint(event));
    }
    if (!this.drawing || !this.ctx) {
      return;
    }
    const point = this.toPagePoint(event);
    if (this.eraser) {
      this.eraseAt(point);
      return;
    }
    if (!this.current) {
      return;
    }
    const prev = this.current.points[this.current.points.length - 1];
    this.current.points.push(point);
    // Draw only the new segment to stay cheap on long pages.
    this.drawSegment(prev, point, this.current.color, this.current.width);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.drawing) {
      return;
    }
    this.finishStroke();
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private finishStroke(): void {
    this.drawing = false;
    if (this.current) {
      if (this.current.points.length > 0) {
        this.strokes.push(this.current);
      }
      this.current = null;
    }
  }

  // Object-level eraser: any stroke the eraser touches is removed whole.
  private eraseAt(point: Point): void {
    const radius = ERASER_RADIUS;
    const before = this.strokes.length;
    this.strokes = this.strokes.filter((stroke) => !strokeHit(stroke, point, radius));
    if (this.strokes.length !== before) {
      this.redrawAll();
    }
  }

  private stylize(color: string, width: number): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  private drawSegment(a: Point, b: Point, color: string, width: number): void {
    if (!this.ctx) {
      return;
    }
    this.stylize(color, width);
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }

  private drawStroke(stroke: Stroke): void {
    if (!this.ctx) {
      return;
    }
    const pts = stroke.points;
    if (pts.length === 1) {
      // A tap renders as a filled dot.
      this.ctx.fillStyle = stroke.color;
      this.ctx.beginPath();
      this.ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
      this.ctx.fill();
      return;
    }
    this.stylize(stroke.color, stroke.width);
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) {
      this.ctx.lineTo(pts[i].x, pts[i].y);
    }
    this.ctx.stroke();
  }

  private redrawAll(): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }
    if (this.current) {
      this.drawStroke(this.current);
    }
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== this.settings.key || event.repeat) {
      return;
    }
    if (isTypingContext()) {
      return;
    }
    this.setHeld(true);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== this.settings.key) {
      return;
    }
    this.setHeld(false);
  };

  // A tab switch / window blur can swallow the keyup, leaving the key "stuck".
  private onBlur = (): void => {
    this.setHeld(false);
  };

  private setHeld(next: boolean): void {
    if (next === this.held) {
      return;
    }
    this.held = next;
    this.applyHeldStyle();
    // Releasing the key mid-drag finishes the current stroke.
    if (!next && this.drawing) {
      this.finishStroke();
    }
    // The ring only exists while the key is held.
    if (!next) {
      this.hideCursor();
    }
  }

  private applyHeldStyle(): void {
    if (!this.canvas) {
      return;
    }
    this.canvas.style.pointerEvents = this.held ? "auto" : "none";
    // Hide the OS cursor while held; the ring stands in for it.
    this.canvas.style.cursor = this.held ? "none" : "";
  }

  private async persist(): Promise<void> {
    await updateSettings({ brush: { ...this.settings } });
  }

  setColor(color: string): void {
    this.settings.color = color;
    void this.persist();
  }

  setWidth(width: number): void {
    this.settings.width = width;
    // Live-update the brush ring diameter as the slider moves.
    this.positionCursor();
    void this.persist();
  }

  setKey(key: string): void {
    this.settings.key = key;
    void this.persist();
  }

  setEraser(on: boolean): void {
    this.eraser = on;
    // Switch the ring between brush width and the fixed eraser diameter.
    this.positionCursor();
  }

  clearAll(): void {
    this.strokes = [];
    this.current = null;
    this.redrawAll();
  }
}

let engine: BrushEngine | null = null;

// Lazily created on first use (Brush tab open). Persists for the page lifetime
// so drawing stays available after the panel closes; strokes vanish on unload.
export function getBrushEngine(): BrushEngine {
  if (!engine) {
    engine = new BrushEngine();
  }
  return engine;
}
