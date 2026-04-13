/**
 * Pyodide main-thread wrapper.
 *
 * Manages a Web Worker that loads Pyodide for executing Python test cases.
 * Usage:
 *   const pyodide = getPyodide();
 *   pyodide.init();                    // Start background download
 *   const results = await pyodide.runTests(code, testCases);
 */

export interface TestCaseInput {
  input: string;
  expected: string;
}

export interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

interface PendingRun {
  resolve: (results: TestCaseResult[]) => void;
  reject: (error: Error) => void;
}

interface PendingCodeRun {
  resolve: (output: string) => void;
  reject: (error: Error) => void;
}

let instance: PyodideRunner | null = null;

class PyodideRunner {
  private worker: Worker | null = null;
  private status: PyodideStatus = "idle";
  private pendingRuns = new Map<string, PendingRun>();
  private pendingCodeRuns = new Map<string, PendingCodeRun>();
  private listeners = new Set<(status: PyodideStatus) => void>();
  private nextId = 0;

  init(): void {
    if (this.status !== "idle") return;
    if (typeof window === "undefined") return; // SSR guard

    this.status = "loading";
    this.notify();

    this.worker = new Worker("/workers/pyodide-worker.js");
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = () => {
      this.status = "error";
      this.notify();
    };
    this.worker.postMessage({ type: "init" });
  }

  getStatus(): PyodideStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === "ready";
  }

  onStatusChange(cb: (status: PyodideStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async runTests(
    code: string,
    testCases: TestCaseInput[],
  ): Promise<TestCaseResult[]> {
    if (!this.worker || this.status !== "ready") {
      throw new Error("Pyodide not ready");
    }

    const id = String(++this.nextId);

    return new Promise<TestCaseResult[]>((resolve, reject) => {
      this.pendingRuns.set(id, { resolve, reject });

      // 30s global timeout
      const timeout = setTimeout(() => {
        this.pendingRuns.delete(id);
        reject(new Error("Pyodide execution timed out"));
      }, 30_000);

      const wrapped = { resolve, reject };
      this.pendingRuns.set(id, {
        resolve: (results) => {
          clearTimeout(timeout);
          this.pendingRuns.delete(id);
          wrapped.resolve(results);
        },
        reject: (err) => {
          clearTimeout(timeout);
          this.pendingRuns.delete(id);
          wrapped.reject(err);
        },
      });

      this.worker!.postMessage({ type: "run", id, code, testCases });
    });
  }

  async runCode(code: string): Promise<string> {
    if (!this.worker || this.status !== "ready") {
      throw new Error("Pyodide not ready");
    }

    const id = String(++this.nextId);

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCodeRuns.delete(id);
        reject(new Error("Execution timed out"));
      }, 10_000);

      this.pendingCodeRuns.set(id, {
        resolve: (output) => {
          clearTimeout(timeout);
          this.pendingCodeRuns.delete(id);
          resolve(output);
        },
        reject: (err) => {
          clearTimeout(timeout);
          this.pendingCodeRuns.delete(id);
          reject(err);
        },
      });

      this.worker!.postMessage({ type: "run-code", id, code });
    });
  }

  private handleMessage(e: MessageEvent): void {
    const { type, id, results, error, output } = e.data;

    if (type === "init-done") {
      this.status = "ready";
      this.notify();
    } else if (type === "init-error") {
      this.status = "error";
      this.notify();
      console.error("[pyodide] Init failed:", error);
    } else if (type === "result") {
      const pending = this.pendingRuns.get(id);
      if (pending) pending.resolve(results);
    } else if (type === "error") {
      const pending = this.pendingRuns.get(id);
      if (pending) pending.reject(new Error(error));
    } else if (type === "run-code-result") {
      const pending = this.pendingCodeRuns.get(id);
      if (pending) pending.resolve(output);
    } else if (type === "run-code-error") {
      const pending = this.pendingCodeRuns.get(id);
      if (pending) pending.reject(new Error(error));
    }
  }

  private notify(): void {
    for (const cb of this.listeners) cb(this.status);
  }
}

/** Get the singleton Pyodide runner instance. */
export function getPyodide(): PyodideRunner {
  if (!instance) instance = new PyodideRunner();
  return instance;
}

/**
 * Map test case pass rate to drill confidence.
 * ≥4/5 → conf 4, ≥3/5 → conf 3, ≥2/5 → conf 2, <2/5 → conf 1
 */
export function passRateToConfidence(
  passed: number,
  total: number,
): 1 | 2 | 3 | 4 {
  if (total === 0) return 1;
  const rate = passed / total;
  if (rate >= 0.8) return 4;
  if (rate >= 0.6) return 3;
  if (rate >= 0.4) return 2;
  return 1;
}
