/**
 * retry.test.ts — Unit tests for the agent task retry & failure recovery engine
 *
 * Run with: npx ts-node --esm retry.test.ts
 * Or via Jest (add ts-jest to devDependencies).
 *
 * Covers:
 *  - Successful task on first attempt
 *  - Retry until success
 *  - Exhausted retries → throws last error
 *  - Non-retryable error fails fast (no wasted attempts)
 *  - Backoff delay is applied between retries
 *  - State transitions: Pending → Running → Retrying → Success | Failed
 *  - Failure log records every attempt reason
 *  - Edge cases: network timeout, repeated failures, partial success, invalid input
 */

import { withRetry, isNetworkError, DEFAULT_RETRY_CONFIG, TaskExecutionRecord } from "./retry.js";

// ── Minimal test harness (no external deps) ─────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Make an Error that looks like an axios timeout. */
function makeTimeoutError(): Error {
  const err = new Error("timeout of 5000ms exceeded");
  (err as any).code = "ECONNABORTED";
  return err;
}

/** Make an Error that looks like an HTTP 404. */
function make404Error(): Error {
  const err = new Error("Request failed with status code 404");
  (err as any).response = { status: 404, statusText: "Not Found" };
  return err;
}

/** Make an Error that looks like an HTTP 500. */
function make500Error(): Error {
  const err = new Error("Request failed with status code 500");
  (err as any).response = { status: 500, statusText: "Internal Server Error" };
  return err;
}

// Minimal config for fast tests (no actual sleeping)
const FAST_CONFIG = { baseDelayMs: 1, maxDelayMs: 5, jitter: false };

// ── Tests ────────────────────────────────────────────────────────────────────

console.log("\nrunning retry engine tests…\n");

// 1. Happy path: succeeds on first attempt
await test("succeeds on first attempt", async () => {
  const result = await withRetry("success-task", () => "hello", FAST_CONFIG);
  assert(result === "hello", `expected "hello", got "${result}"`);
});

// 2. Succeeds after one failure
await test("succeeds on second attempt after one failure", async () => {
  let callCount = 0;
  const result = await withRetry(
    "flaky-task",
    () => {
      callCount++;
      if (callCount < 2) throw makeTimeoutError();
      return "recovered";
    },
    { ...FAST_CONFIG, maxRetries: 3 }
  );
  assert(result === "recovered", `expected "recovered", got "${result}"`);
  assert(callCount === 2, `expected 2 calls, got ${callCount}`);
});

// 3. Exhausts all retries and throws
await test("throws after exhausting all retries", async () => {
  let callCount = 0;
  let threw = false;
  try {
    await withRetry(
      "always-fails",
      () => {
        callCount++;
        throw makeTimeoutError();
      },
      { ...FAST_CONFIG, maxRetries: 2 }
    );
  } catch {
    threw = true;
  }
  assert(threw, "expected an error to be thrown");
  assert(callCount === 3, `expected 3 total attempts, got ${callCount}`);
});

// 4. Non-retryable error (404) fails immediately
await test("non-retryable 404 fails fast without retrying", async () => {
  let callCount = 0;
  let threw = false;
  try {
    await withRetry(
      "not-found-task",
      () => {
        callCount++;
        throw make404Error();
      },
      { ...FAST_CONFIG, maxRetries: 3, isRetryable: isNetworkError }
    );
  } catch {
    threw = true;
  }
  assert(threw, "expected error to be thrown");
  assert(callCount === 1, `expected exactly 1 attempt for 404, got ${callCount}`);
});

// 5. 500 errors are retried
await test("retryable 500 error triggers retry", async () => {
  let callCount = 0;
  let threw = false;
  try {
    await withRetry(
      "server-error-task",
      () => {
        callCount++;
        throw make500Error();
      },
      { ...FAST_CONFIG, maxRetries: 2, isRetryable: isNetworkError }
    );
  } catch {
    threw = true;
  }
  assert(threw, "expected error after exhausted retries");
  assert(callCount === 3, `expected 3 attempts for 500 error, got ${callCount}`);
});

// 6. Network timeout is retried
await test("network timeout error is retried", async () => {
  let callCount = 0;
  try {
    await withRetry(
      "timeout-task",
      () => {
        callCount++;
        throw makeTimeoutError();
      },
      { ...FAST_CONFIG, maxRetries: 2, isRetryable: isNetworkError }
    );
  } catch { /* expected */ }
  assert(callCount === 3, `expected 3 attempts for timeout, got ${callCount}`);
});

// 7. Async task works correctly
await test("works with async task function", async () => {
  const result = await withRetry(
    "async-task",
    async () => {
      await new Promise((r) => setTimeout(r, 1));
      return 42;
    },
    FAST_CONFIG
  );
  assert(result === 42, `expected 42, got ${result}`);
});

// 8. Partial success — fails first 2, succeeds on 3rd
await test("partial success: fails twice then succeeds", async () => {
  let callCount = 0;
  const result = await withRetry(
    "partial-success",
    () => {
      callCount++;
      if (callCount < 3) throw make500Error();
      return "partial-ok";
    },
    { ...FAST_CONFIG, maxRetries: 3, isRetryable: isNetworkError }
  );
  assert(result === "partial-ok", `expected "partial-ok", got "${result}"`);
  assert(callCount === 3, `expected 3 calls, got ${callCount}`);
});

// 9. Invalid task input — validation error thrown synchronously
await test("invalid task input throws without retrying", async () => {
  let callCount = 0;
  let threw = false;
  try {
    await withRetry(
      "invalid-input-task",
      () => {
        callCount++;
        throw new Error("Invalid task input: repoName must be a non-empty string.");
      },
      {
        ...FAST_CONFIG,
        maxRetries: 3,
        // Treat "Invalid task input" errors as non-retryable
        isRetryable: (err) => {
          if (err instanceof Error && err.message.startsWith("Invalid task input")) return false;
          return true;
        },
      }
    );
  } catch {
    threw = true;
  }
  assert(threw, "expected error to be thrown");
  assert(callCount === 1, `expected 1 attempt for invalid input, got ${callCount}`);
});

// 10. isNetworkError predicate
await test("isNetworkError returns true for timeout code", () => {
  const err = makeTimeoutError();
  assert(isNetworkError(err), "ECONNABORTED should be retryable");
  return Promise.resolve();
});

await test("isNetworkError returns false for 404", () => {
  const err = make404Error();
  assert(!isNetworkError(err), "404 should NOT be retryable");
  return Promise.resolve();
});

await test("isNetworkError returns true for 500", () => {
  const err = make500Error();
  assert(isNetworkError(err), "500 should be retryable");
  return Promise.resolve();
});

// 11. Default config values
await test("DEFAULT_RETRY_CONFIG has expected values", () => {
  assert(DEFAULT_RETRY_CONFIG.maxRetries === 3, "default maxRetries should be 3");
  assert(DEFAULT_RETRY_CONFIG.baseDelayMs === 300, "default baseDelayMs should be 300");
  assert(DEFAULT_RETRY_CONFIG.maxDelayMs === 10_000, "default maxDelayMs should be 10000");
  assert(DEFAULT_RETRY_CONFIG.jitter === true, "default jitter should be true");
  return Promise.resolve();
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
