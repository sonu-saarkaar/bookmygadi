import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected app error",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Root app crash", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-lg p-5 text-center">
          <p className="text-[11px] uppercase tracking-[0.16em] font-black text-slate-400">BookMyGadi</p>
          <h1 className="mt-2 text-lg font-black text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-xs text-slate-500 break-words">{this.state.message || "Map render failed"}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 h-11 w-full rounded-xl bg-slate-900 text-white text-sm font-black"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

const ensurePerformanceApis = () => {
  if (typeof globalThis === "undefined") return;

  const noop = () => undefined;
  const safeDefine = (target: object, key: string, value: () => void) => {
    const current = (target as Record<string, unknown>)[key];
    if (typeof current === "function") return;
    try {
      Object.defineProperty(target, key, { value, configurable: true, writable: true });
    } catch {
      (target as Record<string, unknown>)[key] = value;
    }
  };

  let perf = globalThis.performance as Performance & {
    mark?: (name?: string) => void;
    measure?: (name?: string, start?: string, end?: string) => void;
    clearMarks?: (name?: string) => void;
    clearMeasures?: (name?: string) => void;
  };

  if (!perf) {
    try {
      (globalThis as unknown as Record<string, unknown>).performance = {};
    } catch {
      return;
    }
    perf = globalThis.performance as Performance;
  }

  // Some older browsers/webviews expose partial Performance APIs.
  safeDefine(perf, "mark", noop);
  safeDefine(perf, "measure", noop);
  safeDefine(perf, "clearMarks", noop);
  safeDefine(perf, "clearMeasures", noop);

  if (typeof Performance !== "undefined" && Performance.prototype) {
    safeDefine(Performance.prototype, "mark", noop);
    safeDefine(Performance.prototype, "measure", noop);
    safeDefine(Performance.prototype, "clearMarks", noop);
    safeDefine(Performance.prototype, "clearMeasures", noop);
  }
};

ensurePerformanceApis();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
