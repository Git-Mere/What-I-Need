import { getStorageValue, setStorageValue } from "../shared/storage";
import type { WidSettings } from "../shared/types";

// Brush defaults live here (rather than in brush-engine) so the settings store
// has no dependency on any feature module and both writers can import from it
// without an import cycle.
export const DEFAULT_BRUSH: WidSettings["brush"] = {
  key: "Backquote",
  color: "#e53935",
  width: 4
};

export const DEFAULT_SETTINGS: WidSettings = {
  railEnabled: true,
  disabledHosts: [],
  brush: { ...DEFAULT_BRUSH }
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Coerce a raw stored brush object into a well-formed value, falling back to the
// default for each field that is missing or the wrong type/shape.
function validateBrush(raw: unknown): WidSettings["brush"] {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_BRUSH };
  }
  const b = raw as Record<string, unknown>;
  return {
    key: typeof b.key === "string" && b.key ? b.key : DEFAULT_BRUSH.key,
    color:
      typeof b.color === "string" && HEX_COLOR.test(b.color)
        ? b.color
        : DEFAULT_BRUSH.color,
    width:
      typeof b.width === "number" && Number.isFinite(b.width) && b.width > 0
        ? b.width
        : DEFAULT_BRUSH.width
  };
}

// Validate + coerce a raw stored settings object into a well-formed WidSettings.
// Corrupt or old-version data falls back to defaults so downstream consumers
// never see a NaN railTop or a malformed brush. railTop is only type-checked
// here (NaN rejected); viewport clamping happens in rail-position where the live
// viewport is known.
export function validateSettings(raw: unknown): WidSettings {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_SETTINGS, brush: { ...DEFAULT_BRUSH } };
  }
  const s = raw as Record<string, unknown>;
  const settings: WidSettings = {
    railEnabled:
      typeof s.railEnabled === "boolean"
        ? s.railEnabled
        : DEFAULT_SETTINGS.railEnabled,
    disabledHosts: Array.isArray(s.disabledHosts)
      ? s.disabledHosts.filter((host): host is string => typeof host === "string")
      : [],
    brush: validateBrush(s.brush)
  };
  if (typeof s.railTop === "number" && Number.isFinite(s.railTop)) {
    settings.railTop = s.railTop;
  }
  return settings;
}

// Validated read of the whole settings object.
export async function getSettings(): Promise<WidSettings> {
  return validateSettings(await getStorageValue("wid:settings"));
}

// Serializes all settings writes through one promise chain so the two
// independent writers (brush engine + rail drag) can never interleave their
// read-merge-write and drop one side's field. Stays alive even if a write
// rejects.
let writeChain: Promise<void> = Promise.resolve();

// Atomic-ish read-merge-write: reads the latest stored (validated) settings,
// shallow-merges the patch, and writes the result back. Route every wid:settings
// write through this.
export function updateSettings(patch: Partial<WidSettings>): Promise<void> {
  const run = writeChain.then(async () => {
    const current = await getSettings();
    await setStorageValue("wid:settings", { ...current, ...patch });
  });
  writeChain = run.catch(() => {});
  return run;
}
