export type WidStorageKey = "wid:settings" | "wid:memo" | "wid:calc:history";

export type WidSettings = {
  railEnabled: boolean;
  disabledHosts: string[];
  // Distance in CSS px from the top of the viewport to the top of the rail /
  // expanded panel (they share one position). Absent = runtime default
  // (15% of viewport height). Re-clamped to the viewport on load.
  railTop?: number;
  brush: {
    // A KeyboardEvent.code (e.g. "Backquote", "KeyB"). Held to activate drawing.
    key: string;
    color: string;
    width: number;
  };
};

export type WidMemo = {
  text: string;
  updatedAt: number;
};

export type WidCalcHistoryItem = {
  expr: string;
  result: string;
  at: number;
};

export type WidStorageSchema = {
  "wid:settings": WidSettings;
  "wid:memo": WidMemo;
  "wid:calc:history": WidCalcHistoryItem[];
};
