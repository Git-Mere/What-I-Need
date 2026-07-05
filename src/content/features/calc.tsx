import { useEffect, useRef, useState } from "preact/hooks";

import {
  getStorageValue,
  removeStorageValue,
  setStorageValue
} from "../../shared/storage";
import type { WidCalcHistoryItem } from "../../shared/types";
import { t } from "../../shared/i18n";

type BinaryOperator = "+" | "-" | "x" | "/";

type CalcError = "Cannot divide by zero" | "Invalid input";

type CalcState = {
  display: string;
  storedValue: number | null;
  pendingOperator: BinaryOperator | null;
  waitingForEntry: boolean;
  error: CalcError | null;
  lastOperator: BinaryOperator | null;
  lastOperand: number | null;
};

const INITIAL_STATE: CalcState = {
  display: "0",
  storedValue: null,
  pendingOperator: null,
  waitingForEntry: false,
  error: null,
  lastOperator: null,
  lastOperand: null
};

const MAX_HISTORY_ITEMS = 10;
const MAX_INPUT_LENGTH = 16;

function toNumber(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function trimFormatted(value: string): string {
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

// The CalcError union stays the canonical (English) identity; this maps it to
// the localized text shown in the display.
function errorText(error: CalcError): string {
  return error === "Cannot divide by zero"
    ? t("calc_divide_by_zero")
    : t("calc_invalid_input");
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return t("calc_invalid_input");
  }

  if (Object.is(value, -0) || Math.abs(value) < 1e-12) {
    return "0";
  }

  const rounded = Number(value.toPrecision(12));
  const abs = Math.abs(rounded);

  if (abs >= 1e12 || abs < 1e-9) {
    const [mantissa, exponent] = rounded.toExponential(8).split("e");
    return `${trimFormatted(mantissa)}e${exponent}`;
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

function historyTime(item: WidCalcHistoryItem): string {
  return new Date(item.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function Calculator() {
  const [state, setState] = useState<CalcState>(INITIAL_STATE);
  const [history, setHistory] = useState<WidCalcHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyLoaded = useRef(false);

  useEffect(() => {
    let active = true;

    getStorageValue("wid:calc:history").then((items) => {
      if (!active) {
        return;
      }
      setHistory(items ?? []);
      historyLoaded.current = true;
    });

    return () => {
      active = false;
    };
  }, []);

  // Persist history as a side-effect of state changes, keeping the state
  // updaters pure. Skipped until the initial load has run so the stored
  // value is not clobbered before it is read.
  useEffect(() => {
    if (!historyLoaded.current) {
      return;
    }
    if (history.length === 0) {
      void removeStorageValue("wid:calc:history");
    } else {
      void setStorageValue("wid:calc:history", history);
    }
  }, [history]);

  const persistHistoryItem = (item: WidCalcHistoryItem) => {
    setHistory((current) => [...current, item].slice(-MAX_HISTORY_ITEMS));
  };

  const clearHistory = () => {
    setHistory([]);
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

      if (current.display.replace("-", "").replace(".", "").length >= MAX_INPUT_LENGTH) {
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
      if (current.error !== null || toNumber(current.display) === 0) {
        return current;
      }

      // Sign toggle never starts a new entry: preserve waitingForEntry so a
      // shown result/operand is negated in place while the next digit still
      // replaces it rather than appending.
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
          : 0;

      return { ...current, display: formatNumber(next), waitingForEntry: true };
    });
  };

  const applyUnary = (operation: "reciprocal" | "square" | "sqrt") => {
    setState((current) => {
      if (current.error !== null) {
        return current;
      }

      const value = toNumber(current.display);
      if (operation === "reciprocal" && value === 0) {
        return { ...current, display: errorText("Cannot divide by zero"), error: "Cannot divide by zero" };
      }
      if (operation === "sqrt" && value < 0) {
        return { ...current, display: errorText("Invalid input"), error: "Invalid input" };
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
          return { ...current, display: errorText(result.error), error: result.error };
        }

        return {
          ...current,
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
    if (state.error !== null) {
      return;
    }

    // Determine the operation to run: an explicit pending operation, or (for a
    // repeated "=") the last operator + operand applied to the current display.
    let left: number;
    let operator: BinaryOperator;
    let right: number;

    if (state.pendingOperator !== null && state.storedValue !== null) {
      left = state.storedValue;
      operator = state.pendingOperator;
      right = toNumber(state.display);
    } else if (state.lastOperator !== null && state.lastOperand !== null) {
      left = toNumber(state.display);
      operator = state.lastOperator;
      right = state.lastOperand;
    } else {
      return;
    }

    const result = applyBinary(left, operator, right);
    if (result.error !== null) {
      setState({ ...state, display: errorText(result.error), error: result.error });
      return;
    }

    const formattedResult = formatNumber(result.value);
    persistHistoryItem({
      expr: `${formatOperand(left)} ${operator} ${formatOperand(right)} =`,
      result: formattedResult,
      at: Date.now()
    });

    setState({
      ...state,
      display: formattedResult,
      storedValue: null,
      pendingOperator: null,
      waitingForEntry: true,
      error: null,
      lastOperator: operator,
      lastOperand: right
    });
  };

  const indicator =
    state.error === null && state.pendingOperator !== null && state.storedValue !== null
      ? `${formatOperand(state.storedValue)} ${state.pendingOperator}`
      : "";

  return (
    <div class="wid-calc">
      <div class="wid-calc-indicator" aria-hidden="true">{indicator}</div>
      <div class="wid-calc-display" aria-live="polite">{state.display}</div>

      <div class="wid-calc-keypad" aria-label={t("calc_keypad_aria")}>
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={applyPercent}>%</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={clearEntry}>CE</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" onClick={clearAll}>C</button>
        <button type="button" class="wid-calc-button wid-calc-button-muted" aria-label={t("calc_backspace_aria")} onClick={backspace}>{t("calc_back")}</button>

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

      <div class="wid-calc-history" data-open={historyOpen}>
        <div class="wid-calc-history-bar">
          <button
            type="button"
            class="wid-calc-history-toggle"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <span>{t("calc_history")}</span>
            <span class="wid-calc-history-caret" aria-hidden="true">{historyOpen ? "▾" : "▸"}</span>
          </button>
          {historyOpen && (
            <button type="button" class="wid-calc-history-clear" onClick={clearHistory} disabled={history.length === 0}>
              {t("calc_clear")}
            </button>
          )}
        </div>
        {historyOpen && (
          <div class="wid-calc-history-list">
            {history.length === 0 ? (
              <div class="wid-calc-history-empty">{t("calc_history_empty")}</div>
            ) : (
              history.slice().reverse().map((item) => (
                <div class="wid-calc-history-item" key={`${item.at}-${item.expr}`}>
                  <span class="wid-calc-history-calc">{item.expr} {item.result}</span>
                  <span class="wid-calc-history-time">{historyTime(item)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
