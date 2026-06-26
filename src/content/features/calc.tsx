import { useEffect, useState } from "preact/hooks";

import {
  getStorageValue,
  removeStorageValue,
  setStorageValue
} from "../../shared/storage";
import type { WidCalcHistoryItem } from "../../shared/types";

type BinaryOperator = "+" | "-" | "x" | "/";

type CalcError = "Cannot divide by zero" | "Invalid input";

type CalcState = {
  display: string;
  storedValue: number | null;
  pendingOperator: BinaryOperator | null;
  waitingForEntry: boolean;
  error: CalcError | null;
};

const INITIAL_STATE: CalcState = {
  display: "0",
  storedValue: null,
  pendingOperator: null,
  waitingForEntry: false,
  error: null
};

const MAX_HISTORY_ITEMS = 10;
const MAX_INPUT_LENGTH = 16;

function toNumber(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function trimFormatted(value: string): string {
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "Invalid input";
  }

  if (Object.is(value, -0) || Math.abs(value) < 1e-12) {
    return "0";
  }

  const rounded = Number(value.toPrecision(12));
  const abs = Math.abs(rounded);

  if (abs >= 1e12 || abs < 1e-9) {
    return trimFormatted(rounded.toExponential(8).replace("e+", "e"));
  }

  return trimFormatted(rounded.toString());
}

function formatOperand(value: number): string {
  return formatNumber(value);
}

function applyBinary(
  left: number,
  operator: BinaryOperator,
  right: number
): { value: number; error: CalcError | null } {
  switch (operator) {
    case "+":
      return { value: left + right, error: null };
    case "-":
      return { value: left - right, error: null };
    case "x":
      return { value: left * right, error: null };
    case "/":
      if (right === 0) {
        return { value: 0, error: "Cannot divide by zero" };
      }
      return { value: left / right, error: null };
  }
}

function historyLabel(item: WidCalcHistoryItem): string {
  const time = new Date(item.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${time} ${item.expr} ${item.result}`;
}

export function Calculator() {
  const [state, setState] = useState<CalcState>(INITIAL_STATE);
  const [history, setHistory] = useState<WidCalcHistoryItem[]>([]);

  useEffect(() => {
    let active = true;

    getStorageValue("wid:calc:history").then((items) => {
      if (!active) {
        return;
      }
      setHistory(items ?? []);
    });

    return () => {
      active = false;
    };
  }, []);

  const persistHistoryItem = (item: WidCalcHistoryItem) => {
    setHistory((current) => {
      const next = [...current, item].slice(-MAX_HISTORY_ITEMS);
      void setStorageValue("wid:calc:history", next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    void removeStorageValue("wid:calc:history");
  };

  const clearAll = () => {
    setState(INITIAL_STATE);
  };

  const clearEntry = () => {
    setState((current) => ({
      ...current,
      display: "0",
      waitingForEntry: false,
      error: null
    }));
  };

  const inputDigit = (digit: string) => {
    setState((current) => {
      if (current.error !== null) {
        return current;
      }

      if (current.waitingForEntry) {
        return { ...current, display: digit, waitingForEntry: false };
      }

      if (current.display === "0") {
        return { ...current, display: digit };
      }

      if (current.display.replace("-", "").replace(".", "").length >= MAX_INPUT_LENGTH) {
        return current;
      }

      return { ...current, display: `${current.display}${digit}` };
    });
  };

  const inputDecimal = () => {
    setState((current) => {
      if (current.error !== null) {
        return current;
      }

      if (current.waitingForEntry) {
        return { ...current, display: "0.", waitingForEntry: false };
      }

      if (current.display.includes(".")) {
        return current;
      }

      return { ...current, display: `${current.display}.` };
    });
  };

  const backspace = () => {
    setState((current) => {
      if (current.error !== null || current.waitingForEntry) {
        return current;
      }

      if (current.display.length <= 1 || (current.display.length === 2 && current.display.startsWith("-"))) {
        return { ...current, display: "0" };
      }

      return { ...current, display: current.display.slice(0, -1) };
    });
  };

  const toggleSign = () => {
    setState((current) => {
      if (current.error !== null || current.display === "0") {
        return current;
      }

      return {
        ...current,
        display: current.display.startsWith("-")
          ? current.display.slice(1)
          : `-${current.display}`
      };
    });
  };

  const applyPercent = () => {
    setState((current) => {
      if (current.error !== null) {
        return current;
      }

      const value = toNumber(current.display);
      const next =
        current.storedValue !== null && current.pendingOperator !== null
          ? current.storedValue * (value / 100)
          : value / 100;

      return { ...current, display: formatNumber(next), waitingForEntry: false };
    });
  };

  const applyUnary = (operation: "reciprocal" | "square" | "sqrt") => {
    setState((current) => {
      if (current.error !== null) {
        return current;
      }

      const value = toNumber(current.display);
      if (operation === "reciprocal" && value === 0) {
        return { ...current, display: "Cannot divide by zero", error: "Cannot divide by zero" };
      }
      if (operation === "sqrt" && value < 0) {
        return { ...current, display: "Invalid input", error: "Invalid input" };
      }

      const next =
        operation === "reciprocal"
          ? 1 / value
          : operation === "square"
            ? value * value
            : Math.sqrt(value);

      return { ...current, display: formatNumber(next), waitingForEntry: true };
    });
  };

  const chooseOperator = (operator: BinaryOperator) => {
    setState((current) => {
      if (current.error !== null) {
        return current;
      }

      const inputValue = toNumber(current.display);

      if (current.pendingOperator !== null && current.storedValue !== null && !current.waitingForEntry) {
        const result = applyBinary(current.storedValue, current.pendingOperator, inputValue);
        if (result.error !== null) {
          return { ...current, display: result.error, error: result.error };
        }

        return {
          display: formatNumber(result.value),
          storedValue: result.value,
          pendingOperator: operator,
          waitingForEntry: true,
          error: null
        };
      }

      return {
        ...current,
        storedValue: inputValue,
        pendingOperator: operator,
        waitingForEntry: true
      };
    });
  };

  const evaluate = () => {
    setState((current) => {
      if (
        current.error !== null ||
        current.pendingOperator === null ||
        current.storedValue === null
      ) {
        return current;
      }

      const right = toNumber(current.display);
      const result = applyBinary(current.storedValue, current.pendingOperator, right);
      if (result.error !== null) {
        return { ...current, display: result.error, error: result.error };
      }

      const formattedResult = formatNumber(result.value);
      const item = {
        expr: `${formatOperand(current.storedValue)} ${current.pendingOperator} ${formatOperand(right)} =`,
        result: formattedResult,
        at: Date.now()
      };
      persistHistoryItem(item);

      return {
        display: formattedResult,
        storedValue: null,
        pendingOperator: null,
        waitingForEntry: true,
        error: null
      };
    });
  };

  return (
    <div class="wid-calc">
      <div class="wid-calc-display" aria-live="polite">{state.display}</div>

      <div class="wid-calc-keypad" aria-label="Calculator keypad">
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={applyPercent}>%</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={clearEntry}>CE</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={clearAll}>C</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" aria-label="Backspace" onClick={backspace}>Back</button>

        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={() => applyUnary("reciprocal")}>1/x</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={() => applyUnary("square")}>x^2</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={() => applyUnary("sqrt")}>sqrt</button>
        <button type="button" class="wid-calc-button wid-calc-button-op" onClick={() => chooseOperator("/")}>/</button>

        <button type="button" class="wid-calc-button" onClick={() => inputDigit("7")}>7</button>
        <button type="button" class="wid-calc-button" onClick={() => inputDigit("8")}>8</button>
        <button type="button" class="wid-calc-button" onClick={() => inputDigit("9")}>9</button>
        <button type="button" class="wid-calc-button wid-calc-button-op" onClick={() => chooseOperator("x")}>x</button>

        <button type="button" class="wid-calc-button" onClick={() => inputDigit("4")}>4</button>
        <button type="button" class="wid-calc-button" onClick={() => inputDigit("5")}>5</button>
        <button type="button" class="wid-calc-button" onClick={() => inputDigit("6")}>6</button>
        <button type="button" class="wid-calc-button wid-calc-button-op" onClick={() => chooseOperator("-")}>-</button>

        <button type="button" class="wid-calc-button" onClick={() => inputDigit("1")}>1</button>
        <button type="button" class="wid-calc-button" onClick={() => inputDigit("2")}>2</button>
        <button type="button" class="wid-calc-button" onClick={() => inputDigit("3")}>3</button>
        <button type="button" class="wid-calc-button wid-calc-button-op" onClick={() => chooseOperator("+")}>+</button>

        <button type="button" class="wid-calc-button" onClick={toggleSign}>+/-</button>
        <button type="button" class="wid-calc-button" onClick={() => inputDigit("0")}>0</button>
        <button type="button" class="wid-calc-button" onClick={inputDecimal}>.</button>
        <button type="button" class="wid-calc-button wid-calc-button-equals" onClick={evaluate}>=</button>
      </div>

      <div class="wid-calc-history">
        <div class="wid-calc-history-header">
          <span>History</span>
          <button type="button" class="wid-calc-history-clear" onClick={clearHistory} disabled={history.length === 0}>
            Clear
          </button>
        </div>
        <div class="wid-calc-history-list">
          {history.length === 0 ? (
            <div class="wid-calc-history-empty">No calculations yet.</div>
          ) : (
            history.slice().reverse().map((item) => (
              <div class="wid-calc-history-item" key={`${item.at}-${item.expr}`}>
                {historyLabel(item)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
