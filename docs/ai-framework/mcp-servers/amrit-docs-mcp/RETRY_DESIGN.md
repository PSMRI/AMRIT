# Agent Task Retry & Failure Recovery

> **Scope:** `docs/ai-framework/mcp-servers/amrit-docs-mcp/`  
> **Affects:** Network-bound MCP tool helpers (`fetchGitHubReadme`, `fetchRepoStructure`)  
> **Breaking changes:** None — all existing tool APIs are identical.

---

## Why this is needed

The MCP server makes live HTTP calls to GitHub (raw content + GitHub API) for
every `get_repo_readme` and `get_repo_structure` tool call. Without retry logic,
a single transient network blip returns an error to the AI agent — even though
resending the same request milliseconds later would succeed.

For a health-data platform like AMRIT where agents may run in constrained
network environments (rural deployments, CI pipelines), silent retries give
reliability without changing the agent's experience.

---

## Architecture

```
MCP Tool Handler
      │
      ▼
fetchGitHubReadme / fetchRepoStructure
      │
      ▼
  withRetry(taskName, task, config)   ◄── new
      │
      ├── attempt 1 ──► axios.get(url, { timeout: 5000 })
      │        ↓ fails
      ├── backoff (300ms × 2^1 + jitter)
      ├── attempt 2 ──► axios.get(url, { timeout: 5000 })
      │        ↓ fails
      ├── backoff (300ms × 2^2 + jitter)
      ├── attempt 3 ──► axios.get(url, { timeout: 5000 })
      │        ↓ fails
      └── throw last error ──► MCP tool returns graceful error message
```

---

## Execution States

| State | Description |
|-------|-------------|
| `Pending` | Task created, not yet started |
| `Running` | First attempt in progress |
| `Retrying` | Subsequent attempt after a recoverable failure |
| `Success` | Task completed successfully |
| `Failed` | All attempts exhausted or non-retryable error encountered |

---

## Configuration (`RetryConfig`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxRetries` | `number` | `3` | Retry attempts after first failure |
| `baseDelayMs` | `number` | `300` | Base for exponential backoff (ms) |
| `maxDelayMs` | `number` | `10000` | Cap on any single backoff delay (ms) |
| `jitter` | `boolean` | `true` | Add randomness to avoid retry storms |
| `isRetryable` | `fn` | always true | Filter which errors trigger a retry |

**Backoff formula:**
```
delay = min(baseDelayMs × 2^attempt, maxDelayMs) + (jitter ? random(0, baseDelayMs) : 0)
```

| Attempt | Delay (no jitter) |
|---------|-------------------|
| 1st retry | 600ms |
| 2nd retry | 1,200ms |
| 3rd retry | 2,400ms |
| 4th retry | 4,800ms |

---

## Files Changed

| File | Change |
|------|--------|
| `src/retry.ts` | **New** — self-contained retry engine, `withRetry()`, `isNetworkError()` |
| `src/retry.test.ts` | **New** — 13 unit tests covering all states and edge cases |
| `src/index.ts` | **Modified** — imports retry module, wraps `fetchGitHubReadme` and `fetchRepoStructure`, version bumped `1.0.0` → `1.1.0` |

---

## Edge Cases Handled

| Scenario | Behaviour |
|----------|-----------|
| **Network timeout** (`ECONNABORTED`) | Retried up to `maxRetries` times with backoff |
| **HTTP 5xx** | Retried — server-side transient failure |
| **HTTP 4xx** (404, 400) | Fails fast — `isNetworkError` returns `false` |
| **Invalid task input** | Custom `isRetryable` predicate can short-circuit retries |
| **Repeated failures** | All failure reasons logged with timestamps and attempt numbers |
| **Partial success** | Each branch URL tried independently; success on any branch returns immediately |
| **Max retries reached** | Last error re-thrown; full failure log emitted to stderr |

---

## Usage Examples

### Basic usage
```ts
import { withRetry } from "./retry.js";

const data = await withRetry(
  "fetch-readme:HWC-API",
  () => axios.get(url, { timeout: 5000 }).then(r => r.data),
  { maxRetries: 3, baseDelayMs: 300, maxDelayMs: 8000, jitter: true }
);
```

### With retryable predicate
```ts
import { withRetry, isNetworkError } from "./retry.js";

// Will retry on 5xx and timeouts, but NOT on 404
const data = await withRetry("my-task", task, {
  maxRetries: 3,
  isRetryable: isNetworkError,
});
```

### Custom predicate
```ts
await withRetry("validate-task", task, {
  maxRetries: 2,
  isRetryable: (err) => {
    if (err instanceof Error && err.message.startsWith("Invalid")) return false;
    return true;
  }
});
```

---

## Running Tests

```bash
cd docs/ai-framework/mcp-servers/amrit-docs-mcp
npx ts-node --esm src/retry.test.ts
```

Expected output:
```
running retry engine tests…

  ✅ succeeds on first attempt
  ✅ succeeds on second attempt after one failure
  ✅ throws after exhausting all retries
  ✅ non-retryable 404 fails fast without retrying
  ✅ retryable 500 error triggers retry
  ✅ network timeout error is retried
  ✅ works with async task function
  ✅ partial success: fails twice then succeeds
  ✅ invalid task input throws without retrying
  ✅ isNetworkError returns true for timeout code
  ✅ isNetworkError returns false for 404
  ✅ isNetworkError returns true for 500
  ✅ DEFAULT_RETRY_CONFIG has expected values

13 tests: 13 passed, 0 failed.
```
