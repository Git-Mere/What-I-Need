import { useEffect, useRef, useState } from "preact/hooks";

import { t } from "../../shared/i18n";

// One distinct color per row. Rows are capped at PALETTE.length, so each row
// keeps a unique color assigned 1:1 by index (no cycling / sharing). Hues walk
// the whole wheel (~36deg apart) with alternating lightness so neighbors stay
// tellable apart, and every color clears WCAG AA (>=4.5:1) against the #17202a
// text painted on top.
const PALETTE = [
  "#f87782", // red (h355)
  "#fa9e42", // orange (h30)
  "#fbe556", // yellow (h52)
  "#8fd65c", // lime-green (h95)
  "#59cf94", // green (h150)
  "#6cdada", // cyan (h180)
  "#6cb8ef", // sky-blue (h205)
  "#8b93ee", // indigo (h235)
  "#ca95e4", // violet (h280)
  "#ed82c9" // magenta-pink (h320)
];

const MAX_ROWS = PALETTE.length;

// Auto-search debounce: re-run every row this long after the last keystroke.
const DEBOUNCE_MS = 250;

const HIGHLIGHT_PREFIX = "wid-search-";
const ACTIVE_HIGHLIGHT = "wid-search-active";
const STYLE_ID = "wid-search-highlight-style";
const SHADOW_HOST_ID = "wid-shadow-host";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT"]);

type SearchRow = {
  id: number;
  term: string;
  count: number | null;
};

type ActiveMatch = {
  rowId: number;
  matchIndex: number;
};

function colorFor(index: number): string {
  return PALETTE[index];
}

// Host-document <style> that maps each highlight name to its color. Shadow DOM
// styles do not reach page Ranges, so this must live in the host document.
function ensureHighlightStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    ...PALETTE.map(
      (color, index) =>
        `::highlight(${HIGHLIGHT_PREFIX}${index}) { background-color: ${color}; color: #17202a; }`
    ),
    // Active match: strong high-contrast fill (border/outline are not honored by
    // ::highlight, so use a bold background plus an underline instead).
    `::highlight(${ACTIVE_HIGHLIGHT}) { background-color: #ff6a00; color: #ffffff; text-decoration: underline; }`
  ].join("\n");
  (document.head ?? document.documentElement).append(style);
}

function removeHighlightStyle(): void {
  document.getElementById(STYLE_ID)?.remove();
}

function clearActiveHighlight(): void {
  CSS.highlights.delete(ACTIVE_HIGHLIGHT);
}

function clearHighlights(): void {
  for (let index = 0; index < PALETTE.length; index += 1) {
    CSS.highlights.delete(`${HIGHLIGHT_PREFIX}${index}`);
  }
  clearActiveHighlight();
}

function collectTextNodes(): Text[] {
  const root = document.body;
  if (!root) {
    return [];
  }
  // Reused to measure whether each text node actually renders a box.
  const measureRange = new Range();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      // Never search inside the extension's own UI.
      if (parent.closest(`#${SHADOW_HOST_ID}`)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      // Skip hidden text. Two cheap-ish, version-independent checks (no reliance
      // on checkVisibility's Chrome 121+ options):
      //   1. visibility:hidden/collapse — inherited, so the parent's computed
      //      value is enough.
      //   2. display:none / content-visibility:hidden / no box — the text node
      //      renders no client rects. This also keeps text under a
      //      display:contents parent (which has no box itself) since the text
      //      still lays out. opacity-hidden text has rects and a visible
      //      computed value, so it stays searchable as before.
      const visibility = getComputedStyle(parent).visibility;
      if (visibility === "hidden" || visibility === "collapse") {
        return NodeFilter.FILTER_REJECT;
      }
      measureRange.selectNodeContents(node);
      if (measureRange.getClientRects().length === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function findRanges(textNodes: Text[], term: string): Range[] {
  const needle = term.toLowerCase();
  const ranges: Range[] = [];

  for (const node of textNodes) {
    const haystack = (node.nodeValue ?? "").toLowerCase();
    let from = haystack.indexOf(needle);
    while (from !== -1) {
      const range = new Range();
      range.setStart(node, from);
      range.setEnd(node, from + needle.length);
      ranges.push(range);
      from = haystack.indexOf(needle, from + needle.length);
    }
  }

  return ranges;
}

// Highlights every non-empty term on the page. Returns per-row match counts
// (null for empty terms) plus the per-row Ranges so callers can navigate them.
function applySearch(terms: string[]): {
  counts: (number | null)[];
  ranges: Range[][];
} {
  const textNodes = collectTextNodes();
  const counts: (number | null)[] = [];
  const ranges: Range[][] = [];

  terms.forEach((term) => {
    if (!term.trim()) {
      counts.push(null);
      ranges.push([]);
      return;
    }
    const found = findRanges(textNodes, term);
    counts.push(found.length);
    ranges.push(found);
  });

  clearHighlights();
  ensureHighlightStyle();
  ranges.forEach((rowRanges, index) => {
    if (rowRanges.length > 0) {
      CSS.highlights.set(
        `${HIGHLIGHT_PREFIX}${index}`,
        new Highlight(...rowRanges)
      );
    }
  });

  return { counts, ranges };
}

function scrollRangeIntoView(range: Range): void {
  // Range has no scrollIntoView; center the element containing the match.
  // Guard against a detached Text node whose parentElement is null: only an
  // Element has scrollIntoView, so skip when we can't resolve one.
  const container = range.startContainer;
  const target =
    container instanceof Element
      ? container
      : container.parentElement;
  if (target instanceof Element) {
    target.scrollIntoView({ block: "center", inline: "nearest" });
  }
}

let nextRowId = 0;

function makeRow(): SearchRow {
  nextRowId += 1;
  return { id: nextRowId, term: "", count: null };
}

export function Search() {
  const [rows, setRows] = useState<SearchRow[]>(() => [makeRow()]);
  const [active, setActive] = useState<ActiveMatch | null>(null);
  // Ranges from the last search, keyed by row id, for ▲▼ navigation.
  const rangesRef = useRef<Map<number, Range[]>>(new Map());
  // Mirror of `rows` so the debounced search reads the latest terms.
  const rowsRef = useRef<SearchRow[]>(rows);
  rowsRef.current = rows;
  // Pending auto-search timer (null when idle).
  const debounceRef = useRef<number | null>(null);

  const clearPending = () => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  useEffect(() => {
    // Stateless feature: wipe every highlight and drop any pending timer when
    // the panel closes.
    return () => {
      clearPending();
      clearHighlights();
      removeHighlightStyle();
    };
  }, []);

  const applySearchToRows = (nextRows: SearchRow[]) => {
    const { counts, ranges } = applySearch(nextRows.map((row) => row.term));
    const map = new Map<number, Range[]>();
    nextRows.forEach((row, index) => {
      map.set(row.id, ranges[index] ?? []);
    });
    rangesRef.current = map;
    setActive(null);
    return nextRows.map((row, index) => ({ ...row, count: counts[index] ?? null }));
  };

  // Runs the search, refreshes counts/ranges, and resets the active match.
  const runSearchFor = (nextRows: SearchRow[]) => {
    setRows(() => applySearchToRows(nextRows));
  };

  // Re-run every row DEBOUNCE_MS after the last keystroke, reading the latest
  // rows from the ref so stacked keystrokes collapse into one search.
  const scheduleSearch = () => {
    clearPending();
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      runSearchFor(rowsRef.current);
    }, DEBOUNCE_MS);
  };

  const updateTerm = (id: number, term: string) => {
    // Editing a term makes the active match stale; drop it.
    clearActiveHighlight();
    setActive(null);
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, term } : row))
    );
    scheduleSearch();
  };

  const addRow = () => {
    setRows((current) =>
      current.length >= MAX_ROWS ? current : [...current, makeRow()]
    );
  };

  const removeRow = (id: number) => {
    let nextRows: SearchRow[] | null = null;
    setRows((current) => {
      if (current.length <= 1) {
        return current;
      }
      nextRows = current.filter((row) => row.id !== id);
      return current;
    });
    if (!nextRows) {
      return;
    }
    // Re-run so highlights and colors follow the new row order. Drop any
    // pending debounce so it can't fire against the old row set.
    clearPending();
    runSearchFor(nextRows);
  };

  // Move the single active match within a row (direction 1 = next, -1 = prev),
  // wrapping at the ends. Activating a new row moves the highlight to it.
  const navigate = (rowId: number, direction: 1 | -1) => {
    const ranges = rangesRef.current.get(rowId);
    if (!ranges || ranges.length === 0) {
      return;
    }
    const total = ranges.length;
    const matchIndex =
      active && active.rowId === rowId
        ? (active.matchIndex + direction + total) % total
        : direction === 1
          ? 0
          : total - 1;

    const range = ranges[matchIndex];
    ensureHighlightStyle();
    const highlight = new Highlight(range);
    highlight.priority = 1; // paint above the per-row color highlight
    CSS.highlights.set(ACTIVE_HIGHLIGHT, highlight);
    setActive({ rowId, matchIndex });
    scrollRangeIntoView(range);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.isComposing) {
      // Skip the debounce and search immediately.
      event.preventDefault();
      clearPending();
      runSearchFor(rowsRef.current);
    }
  };

  return (
    <div class="wid-search">
      <div class="wid-search-rows">
        {rows.map((row, index) => {
          const hasMatches = row.count !== null && row.count > 0;
          const isActive = active?.rowId === row.id;
          const countLabel =
            row.count === null
              ? ""
              : isActive && hasMatches
                ? `${active!.matchIndex + 1} / ${row.count}`
                : String(row.count);
          return (
            <div class="wid-search-row" key={row.id}>
              <span
                class="wid-search-dot"
                style={{ background: colorFor(index) }}
                aria-hidden="true"
              />
              <input
                type="text"
                class="wid-search-input"
                placeholder={t("search_placeholder")}
                value={row.term}
                onInput={(event) =>
                  updateTerm(row.id, (event.currentTarget as HTMLInputElement).value)
                }
                onKeyDown={handleKeyDown}
              />
              <span class="wid-search-count" aria-hidden={row.count === null}>
                {countLabel}
              </span>
              <button
                type="button"
                class="wid-search-nav"
                title={t("search_prev")}
                aria-label={t("search_prev")}
                disabled={!hasMatches}
                onClick={() => navigate(row.id, -1)}
              >
                ▲
              </button>
              <button
                type="button"
                class="wid-search-nav"
                title={t("search_next")}
                aria-label={t("search_next")}
                disabled={!hasMatches}
                onClick={() => navigate(row.id, 1)}
              >
                ▼
              </button>
              <button
                type="button"
                class="wid-search-remove"
                title={t("search_remove")}
                aria-label={t("search_remove")}
                disabled={rows.length <= 1}
                onClick={() => removeRow(row.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        class="wid-search-add"
        disabled={rows.length >= MAX_ROWS}
        onClick={addRow}
      >
        {t("search_add")}
      </button>
    </div>
  );
}
