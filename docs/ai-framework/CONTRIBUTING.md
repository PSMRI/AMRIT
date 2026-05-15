# Contributing to AMRIT Agentic AI Framework

This framework is modular by design. Every component — MCP servers, coding
standards, skills, commands, and context files — can be added independently
without touching anything else.

---

## What you can contribute

### 1. Coding standards for a new repo or language

Add a markdown file to `standards/` documenting the actual patterns used in
a specific AMRIT repo. Good standards come from reading real source code, not
from generic best-practice guides.

**File:** `standards/<repo-name>.md` or `standards/<language>.md`

**Minimum content:**
- Package/folder structure (with real examples from the repo)
- Naming conventions
- 2–3 code examples showing the actual pattern used
- Common anti-patterns to avoid

**How to derive standards correctly:**
1. Clone the repo
2. Read 3–5 existing implementations of the same type (e.g. 3 controllers, 3 services)
3. Extract the pattern they share — that's the standard
4. Verify against a 4th file you haven't read yet

---

### 2. A new MCP server

MCP servers expose AMRIT knowledge to AI agents as searchable tools.

**Folder:** `mcp-servers/<server-name>/`

**Required files:**
```
mcp-servers/my-server/
├── README.md          # what this server does, how to install
├── package.json       # Node.js dependencies
├── src/
│   └── index.ts       # MCP server entry point
└── .env.example       # required environment variables
```

**Minimal MCP server structure (TypeScript):**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "amrit-my-server", version: "1.0.0" });

server.tool(
  "search_amrit_docs",
  "Search AMRIT documentation for a given query",
  { query: z.string().describe("The search query") },
  async ({ query }) => {
    // implement search logic
    const results = await searchDocs(query);
    return { content: [{ type: "text", text: results }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Acceptance criteria for a new MCP server:**
- Handles at least one plain-English query correctly
- README explains installation in under 5 minutes
- Errors are handled gracefully (no unhandled exceptions)
- Tested with at least Claude Code and Cursor

---

### 3. A new skill

Skills are reusable agent capabilities documented as markdown prompts.
They are designed to work as Claude Code slash commands or Cursor custom prompts.

**File:** `skills/<skill-name>.md`

**Required sections:**
```markdown
# Skill: <Name>

## What it does
One sentence.

## When to use it
Specific trigger condition.

## Input
What the agent needs to start (e.g. a Confluence URL, a JIRA ticket ID, a file path).

## Prompt
The actual prompt text. Use {{placeholders}} for variable parts.

## Example
A worked example showing input → output.

## Limitations
Known failure modes or edge cases.
```

---

### 4. A new command

Commands are shell scripts or CLI workflows for developer tasks.

**File:** `commands/<command-name>.sh` (or `.ps1` for Windows)

**Required:**
- Shebang line
- Comment block explaining what the command does
- Usage example in comments
- Error handling for missing dependencies

---

### 5. A context file for a new repo

Context files (`CLAUDE.md`) give AI agents instant deep knowledge of a
specific repo. One file per repo, placed at the repo root.

**File:** `context/<RepoName>/CLAUDE.md`

**Required sections:**
- What this repo does (1 paragraph)
- Tech stack table
- Package/folder structure
- 4–6 critical conventions with code examples
- What NOT to do (anti-patterns)

**Quality bar:** An AI agent reading only this file should be able to write
a new feature that passes code review on the first attempt.

---

## PR checklist

Before opening a PR to this framework:

- [ ] Tested the contribution against at least one AMRIT repo
- [ ] Verified against Claude Code (primary agent)
- [ ] README or docstring explains what it does and how to use it
- [ ] No hardcoded credentials, tokens, or internal URLs
- [ ] Follows existing folder/naming conventions in this repo
- [ ] PR description references the specific AMRIT issue or use case it addresses

---

## Framework design principles

**Modular:** Every component works independently. Adding a new skill does
not require changing the MCP server. Adding a new coding standard does not
require changing existing skills.

**Evidence-based:** Standards come from reading real AMRIT code, not from
generic best practices. Skills are tested against real AMRIT tasks, not toy
examples.

**Honest about limitations:** If a skill only works for a specific repo or
Angular version, say so. Document known failure modes.

**Minimal dependencies:** MCP servers should have as few npm/pip dependencies
as possible. Skills are markdown — no dependencies at all.
