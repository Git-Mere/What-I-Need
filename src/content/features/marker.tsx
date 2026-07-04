import { useEffect, useRef, useState } from "preact/hooks";

// Scroll-position bookmarks for the current page. Volatile / memory-only: markers
// live in component state for this tab only and vanish on navigation or unload
// (matches the project's '휘발성' convention, like Brush). No storage layer.
const MAX_MARKERS = 10;

type Marker = {
  id: number;
  // Scroll offset (window.scrollY) captured when the marker was added.
  y: number;
  // User-facing label. Defaults to "Mark N" (N assigned at creation, see
  // nextMarkerId) and can be renamed; the stored value drives the display so a
  // renamed marker keeps its name regardless of list position after deletes.
  name: string;
};

// Full scroll offset for the given saved position expressed as 0-100% of the
// page's scrollable height. Guards divide-by-zero on short/unscrollable pages.
function scrollPercent(y: number): number {
  const scrollable =
    document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) {
    return 0;
  }
  const pct = (y / scrollable) * 100;
  return Math.min(100, Math.max(0, pct));
}

// Monotonic counter. Doubles as each marker's stable id and its default label
// number, so labels never renumber when earlier markers are removed.
let nextMarkerId = 0;

function defaultName(id: number): string {
  return `Mark ${id}`;
}

export function Marker() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Set while cancelling (Esc) so the input's trailing blur commit is skipped.
  const cancelledRef = useRef(false);

  // Focus and select the field when a row enters rename mode.
  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const addMarker = () => {
    setMarkers((current) => {
      if (current.length >= MAX_MARKERS) {
        return current;
      }
      nextMarkerId += 1;
      return [
        ...current,
        { id: nextMarkerId, y: window.scrollY, name: defaultName(nextMarkerId) },
      ];
    });
  };

  const removeMarker = (id: number) => {
    setMarkers((current) => current.filter((marker) => marker.id !== id));
  };

  const goToMarker = (y: number) => {
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const startRename = (marker: Marker) => {
    cancelledRef.current = false;
    setDraft(marker.name);
    setEditingId(marker.id);
  };

  const commitRename = () => {
    if (editingId === null) {
      return;
    }
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const id = editingId;
    const trimmed = draft.trim();
    setMarkers((current) =>
      current.map((marker) =>
        marker.id === id
          ? { ...marker, name: trimmed || defaultName(marker.id) }
          : marker,
      ),
    );
    setEditingId(null);
  };

  const cancelRename = () => {
    cancelledRef.current = true;
    setEditingId(null);
  };

  const atMax = markers.length >= MAX_MARKERS;

  return (
    <div class="wid-marker">
      <button
        type="button"
        class="wid-marker-add"
        disabled={atMax}
        onClick={addMarker}
      >
        {atMax ? "Max 10" : "+ Add mark"}
      </button>

      {markers.length === 0 ? (
        <p class="wid-marker-empty">
          Save your current scroll position as a mark.
        </p>
      ) : (
        <ul class="wid-marker-list">
          {markers.map((marker) => (
            <li class="wid-marker-row" key={marker.id}>
              {editingId === marker.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  class="wid-marker-input"
                  aria-label="Mark name"
                  value={draft}
                  onInput={(event) =>
                    setDraft((event.target as HTMLInputElement).value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.isComposing) {
                      commitRename();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      cancelRename();
                    }
                  }}
                  onBlur={commitRename}
                />
              ) : (
                <button
                  type="button"
                  class="wid-marker-goto"
                  title="Go to this position"
                  onClick={() => goToMarker(marker.y)}
                >
                  <span class="wid-marker-name">{marker.name}</span>
                  <span class="wid-marker-pct">
                    {Math.round(scrollPercent(marker.y))}%
                  </span>
                </button>
              )}
              {editingId !== marker.id && (
                <button
                  type="button"
                  class="wid-marker-edit"
                  title="Rename mark"
                  aria-label="Rename mark"
                  onClick={() => startRename(marker)}
                >
                  ✎
                </button>
              )}
              <button
                type="button"
                class="wid-marker-remove"
                title="Delete mark"
                aria-label="Delete mark"
                onClick={() => removeMarker(marker.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
