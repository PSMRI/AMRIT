/**
 * retry.ts — Agent Task Retry & Failure Recovery Engine
 *
 * Provides a production-grade, configurable retry mechanism for async/sync
 * task execution in the AMRIT Agentic AI Framework (MCP server context).
 *
 * Design goals:
 *  - Zero breaking changes to existing MCP tool handlers
 *  - Drop-in wrapper: wrap any () => Promise<T> with withRetry()
 *  - Exponential backoff with optional jitter to avoid thundering-herd
 *  - Full execution state tracking: Pending → Running → Retrying → Success | Failed
 *  - Structured logs written to stderr (same channel as the MCP server)
 */

// ── Execution state enum ────────────────────────────────────────────────────

export type TaskState =
  | "Pending"
  | "Running"
  | "Retrying"
  | "Success"
  | "Failed";

// ── Configuration ───────────────────────────────────────────────────────────

export interface RetryConfig {
  /** Maximum number of retry attempts after the first failure (default: 3). */
  maxRetries: number;

  /**
   * Base delay in milliseconds for exponential backoff (default: 300).
   * Actual delay on attempt n = baseDelayMs * 2^n + optional jitter.
   */
  baseDelayMs: number;

  /**
   * Maximum cap on delay in milliseconds so backoff does not grow unbounded
   * (default: 10_000 — 10 seconds).
   */
  maxDelayMs: number;

  /**
   * When true, adds up to baseDelayMs of random jitter to each backoff delay,
   * preventing retry storms when many agents fail simultaneously (default: true).
   */
  jitter: boolean;

  /**
   * Optional predicate. If provided, only errors for which this returns true
   * will be retried. Non-retryable errors (e.g. validation errors) fail fast.
   * Default: always retry.
   */
  isRetryable?: (error: unknown) => boolean;
}

/** Sensible production defaults — can be overridden per call-site. */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 300,
  maxDelayMs: 10_000,
  jitter: true,
};

// ── Execution record ────────────────────────────────────────────────────────

export interface TaskExecutionRecord {
  /** Human-readable label for this task (used in log output). */
  taskName: string;

  /** Current lifecycle state. */
  state: TaskState;

  /** Number of attempts made so far (1 = first try). */
  attempts: number;

  /** ISO timestamp of when the first attempt started. */
  startedAt: string;

  /** ISO timestamp of when the task reached a terminal state (Success/Failed). */
  completedAt?: string;

  /** Ordered list of failure reasons across all attempts. */
  failureLog: FailureEntry[];
}

export interface FailureEntry {
  attempt: number;
  reason: string;
  retriable: boolean;
  timestamp: string;
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Compute the next backoff delay using exponential growth with an optional
 * random jitter component.
 *
 *   delay = min(baseDelayMs * 2^attempt, maxDelayMs) + jitter?
 */
function computeBackoff(attempt: number, config: RetryConfig): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, config.maxDelayMs);
  const jitter = config.jitter ? Math.random() * config.baseDelayMs : 0;
  return Math.floor(capped + jitter);
}

/** Returns a Promise that resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract a human-readable reason string from an unknown thrown value.
 * Handles Error objects, axios-style errors with a `response`, and plain
 * values.
 */
function extractReason(error: unknown): string {
  if (error instanceof Error) {
    // Axios errors carry a `.response.status` — surface it clearly.
    const axiosError = error as Error & {
      response?: { status: number; statusText?: string };
      code?: string;
    };
    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
      return `Network timeout (${axiosError.code}): ${axiosError.message}`;
    }
    if (axiosError.response) {
      return `HTTP ${axiosError.response.status} ${axiosError.response.statusText ?? ""}: ${axiosError.message}`;
    }
    return axiosError.message;
  }
  return String(error);
}

/** Emit a structured log line to stderr (same channel as MCP server). */
function log(record: TaskExecutionRecord, message: string): void {
  const prefix = `[retry:${record.taskName}][attempt:${record.attempts}][state:${record.state}]`;
  console.error(`${prefix} ${message}`);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * withRetry — wraps any async (or sync) task function with retry logic.
 *
 * Usage:
 * ```ts
 * const readme = await withRetry(
 *   "fetch-readme",
 *   () => fetchGitHubReadme(repoName),
 *   { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 8000, jitter: true }
 * );
 * ```
 *
 * @param taskName  - Label shown in all log output for this task.
 * @param task      - A zero-argument function returning T or Promise<T>.
 * @param config    - Retry configuration (merged with DEFAULT_RETRY_CONFIG).
 * @returns         - Resolves with the task result on success.
 * @throws          - Re-throws the last error once maxRetries is exhausted.
 */
export async function withRetry<T>(
  taskName: string,
  task: () => T | Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  // Merge caller config over defaults
  const cfg: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  const record: TaskExecutionRecord = {
    taskName,
    state: "Pending",
    attempts: 0,
    startedAt: new Date().toISOString(),
    failureLog: [],
  };

  let lastError: unknown;

  // Total attempts = 1 (first try) + maxRetries
  const totalAttempts = 1 + cfg.maxRetries;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    record.attempts = attempt + 1;
    record.state = attempt === 0 ? "Running" : "Retrying";

    log(record, attempt === 0 ? "Starting task." : `Retrying (attempt ${record.attempts}/${totalAttempts}).`);

    try {
      const result = await Promise.resolve(task());

      // ── Success path ─────────────────────────────────────────────────────
      record.state = "Success";
      record.completedAt = new Date().toISOString();
      log(record, `Task succeeded.`);
      return result;

    } catch (error) {
      // ── Failure path ─────────────────────────────────────────────────────
      lastError = error;
      const reason = extractReason(error);

      // Check if this error type is retryable
      const retriable =
        attempt < totalAttempts - 1 &&
        (cfg.isRetryable ? cfg.isRetryable(error) : true);

      record.failureLog.push({
        attempt: record.attempts,
        reason,
        retriable,
        timestamp: new Date().toISOString(),
      });

      if (!retriable) {
        // Non-retryable error: fail immediately without burning more attempts
        record.state = "Failed";
        record.completedAt = new Date().toISOString();
        log(record, `Non-retryable error — stopping immediately. Reason: ${reason}`);
        throw error;
      }

      const isLastAttempt = attempt === totalAttempts - 1;
      if (isLastAttempt) {
        // Max retries exhausted — fall through to throw below
        break;
      }

      // Compute and wait for backoff delay
      const delayMs = computeBackoff(attempt, cfg);
      log(record, `Attempt failed. Reason: ${reason}. Backing off ${delayMs}ms before retry.`);
      await sleep(delayMs);
    }
  }

  // ── All attempts exhausted ────────────────────────────────────────────────
  record.state = "Failed";
  record.completedAt = new Date().toISOString();
  log(
    record,
    `All ${cfg.maxRetries + 1} attempts exhausted. Failure log:\n${record.failureLog
      .map((f) => `  [attempt ${f.attempt}] ${f.reason}`)
      .join("\n")}`
  );

  throw lastError;
}

/**
 * isNetworkError — pre-built isRetryable predicate for network/timeout errors.
 *
 * Pass this as `isRetryable` to avoid retrying on HTTP 4xx client errors
 * (bad input, not found, etc.) while still retrying on transient 5xx / timeout.
 *
 * Usage:
 * ```ts
 * await withRetry("fetch", task, { isRetryable: isNetworkError });
 * ```
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const axiosError = error as Error & {
    response?: { status: number };
    code?: string;
  };

  // Always retry on network/timeout codes
  if (
    axiosError.code === "ECONNABORTED" ||
    axiosError.code === "ETIMEDOUT" ||
    axiosError.code === "ECONNRESET" ||
    axiosError.code === "ENOTFOUND"
  ) {
    return true;
  }

  // Retry on 5xx server errors; do NOT retry on 4xx client errors
  if (axiosError.response) {
    return axiosError.response.status >= 500;
  }

  // Retry on unknown errors (no response received at all)
  return true;
}
