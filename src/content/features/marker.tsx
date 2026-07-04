import { useState } from "preact/hooks";

// Scroll-position bookmarks for the current page. Volatile / memory-only: markers
// live in component state for this tab only and vanish on navigation or unload
// (matches the project's '휘발성' convention, like Brush). No storage layer.
const MAX_MARKERS = 10;

type Marker = {
  id: number;
  // Scroll offset (window.scrollY) captured when the marker was added.
  y: number;
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

let nextMarkerId = 0;

export function Marker() {
  const [markers, setMarkers] = useState<Marker[]>([]);

  const addMarker = () => {
    setMarkers((current) => {
      if (current.length >= MAX_MARKERS) {
        return current;
      }
      nextMarkerId += 1;
      return [...current, { id: nextMarkerId, y: window.scrollY }];
    });
  };

  const removeMarker = (id: number) => {
    setMarkers((current) => current.filter((marker) => marker.id !== id));
  };

  const goToMarker = (y: number) => {
    window.scrollTo({ top: y, behavior: "smooth" });
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
        {atMax ? "최대 10개" : "+ 마커 추가"}
      </button>

      {markers.length === 0 ? (
        <p class="wid-marker-empty">현재 스크롤 위치를 마커로 저장하세요.</p>
      ) : (
        <ul class="wid-marker-list">
          {markers.map((marker, index) => (
            <li class="wid-marker-row" key={marker.id}>
              <button
                type="button"
                class="wid-marker-goto"
                title="이 위치로 이동"
                onClick={() => goToMarker(marker.y)}
              >
                <span class="wid-marker-name">마커 {index + 1}</span>
                <span class="wid-marker-pct">
                  {Math.round(scrollPercent(marker.y))}%
                </span>
              </button>
              <button
                type="button"
                class="wid-marker-remove"
                title="마커 삭제"
                aria-label="마커 삭제"
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
