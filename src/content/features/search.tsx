import { useEffect, useState } from "preact/hooks";

// Highlight colors assigned by row order; cycles when there are more rows.
const PALETTE = [
  "#fde047", // yellow
  "#7dd3fc", // sky
  "#f9a8d4", // pink
  "#bef264", // lime
  "#fdba74", // orange
  "#c4b5fd" // violet
];

const HIGHLIGHT_PREFIX = "wid-search-";
const STYLE_ID = "wid-search-highlight-style";
const SHADOW_HOST_ID = "wid-shadow-host";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT"]);

type SearchRow = {
  id: number;
  term: string;
  count: number | null;
};

function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

// Host-document <style> that maps each highlight name to its color. Shadow DOM
// styles do not reach page Ranges, so this must live in the host document.
function ensureHighlightStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PALETTE.map(
    (color, index) =>
      `::highlight(${HIGHLIGHT_PREFIX}${index}) { background-color: ${color}; color: #17202a; }`
  ).join("\n");
  (document.head ?? document.documentElement).append(style);
}

function removeHighlightStyle(): void {
  document.getElementById(STYLE_ID)?.remove();
}

function clearHighlights(): void {
  for (let index = 0; index < PALETTE.length; index += 1) {
    CSS.highlights.delete(`${HIGHLIGHT_PREFIX}${index}`);
  }
}

function collectTextNodes(): Text[] {
  const root = document.body;
  if (!root) {
    return [];
  }
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

// Highlights every non-empty term on the page and returns per-row match counts
// (null for empty terms). Terms sharing a color slot merge into one Highlight.
function applySearch(terms: string[]): (number | null)[] {
  const textNodes = collectTextNodes();
  const perColor: Range[][] = PALETTE.map(() => []);
  const counts: (number | null)[] = [];

  terms.forEach((term, index) => {
    if (!term.trim()) {
      counts.push(null);
      return;
    }
    const ranges = findRanges(textNodes, term);
    counts.push(ranges.length);
    perColor[index % PALETTE.length].push(...ranges);
  });

  clearHighlights();
  ensureHighlightStyle();
  perColor.forEach((ranges, colorIndex) => {
    if (ranges.length > 0) {
      CSS.highlights.set(
        `${HIGHLIGHT_PREFIX}${colorIndex}`,
        new Highlight(...ranges)
      );
    }
  });

  return counts;
}

let nextRowId = 0;

function makeRow(): SearchRow {
  nextRowId += 1;
  return { id: nextRowId, term: "", count: null };
}

// Runs the search for the given rows and returns them with refreshed counts.
function searchedRows(rows: SearchRow[]): SearchRow[] {
  const counts = applySearch(rows.map((row) => row.term));
  return rows.map((row, index) => ({ ...row, count: counts[index] ?? null }));
}

export function Search() {
  const [rows, setRows] = useState<SearchRow[]>(() => [makeRow()]);

  useEffect(() => {
    // Stateless feature: wipe every highlight when the panel closes.
    return () => {
      clearHighlights();
      removeHighlightStyle();
    };
  }, []);

  const runSearch = () => {
    setRows(searchedRows(rows));
  };

  const updateTerm = (id: number, term: string) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, term } : row))
    );
  };

  const addRow = () => {
    setRows((current) => [...current, makeRow()]);
  };

  const removeRow = (id: number) => {
    if (rows.length <= 1) {
      return;
    }
    // Re-run so highlights and colors follow the new row order.
    setRows(searchedRows(rows.filter((row) => row.id !== id)));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  };

  return (
    <div class="wid-search">
      <div class="wid-search-rows">
        {rows.map((row, index) => (
          <div class="wid-search-row" key={row.id}>
            <span
              class="wid-search-dot"
              style={{ background: colorFor(index) }}
              aria-hidden="true"
            />
            <input
              type="text"
              class="wid-search-input"
              placeholder="Search term"
              value={row.term}
              onInput={(event) =>
                updateTerm(row.id, (event.currentTarget as HTMLInputElement).value)
              }
              onKeyDown={handleKeyDown}
            />
            <span class="wid-search-count" aria-hidden={row.count === null}>
              {row.count === null ? "" : row.count}
            </span>
            <button
              type="button"
              class="wid-search-remove"
              title="Remove row"
              aria-label="Remove row"
              disabled={rows.length <= 1}
              onClick={() => removeRow(row.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" class="wid-search-add" onClick={addRow}>
        + Add term
      </button>

      <button type="button" class="wid-search-run" onClick={runSearch}>
        Search
      </button>
    </div>
  );
}
