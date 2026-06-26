export type WidStorageKey = "wid:settings" | "wid:memo" | "wid:calc:history";

export type WidBrushKey = "Alt" | "Ctrl" | "Shift" | "Meta";

export type WidSettings = {
  railEnabled: boolean;
  disabledHosts: string[];
  brush: {
    key: WidBrushKey;
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
