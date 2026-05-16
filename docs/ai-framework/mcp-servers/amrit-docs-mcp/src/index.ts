import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { withRetry, isNetworkError } from "./retry.js";

/**
 * AMRIT Docs MCP Server
 *
 * Gives AI agents (Claude Code, Cursor, Copilot) plain-English access to
 * AMRIT's documentation and repository READMEs without manual context pasting.
 *
 * Tools exposed:
 *   - search_amrit_docs     : keyword search across indexed AMRIT docs
 *   - get_repo_readme       : fetch README for any AMRIT repo
 *   - get_coding_standards  : retrieve AMRIT coding standards for a tech layer
 *   - list_amrit_repos      : list all AMRIT repositories with descriptions
 *   - get_repo_structure    : get folder structure of an AMRIT repo
 *
 * Retry behaviour:
 *   Network-bound helpers (fetchGitHubReadme, fetchRepoStructure) are now
 *   wrapped with withRetry() — up to 3 attempts, exponential backoff, only
 *   on retryable errors (5xx / timeout). Validation errors fail fast.
 */

// ── AMRIT repo registry ────────────────────────────────────────────────────

const AMRIT_REPOS: Record<string, { description: string; layer: string }> = {
  "HWC-API": {
    description: "Health and Wellness Centre backend API — Spring Boot, handles clinical workflows for nurses and doctors",
    layer: "backend"
  },
  "FLW-API": {
    description: "Field-Level Worker API — Spring Boot backend for ASHA worker mobile app",
    layer: "backend"
  },
  "Common-API": {
    description: "Shared services API — authentication, beneficiary registration, cross-cutting concerns",
    layer: "backend"
  },
  "Identity-API": {
    description: "Identity and access management API — user authentication, session management",
    layer: "backend"
  },
  "FHIR-API": {
    description: "FHIR-compliant health data exchange API",
    layer: "backend"
  },
  "HWC-UI": {
    description: "Health and Wellness Centre Angular frontend — clinical workflow UI for nurses and doctors",
    layer: "frontend"
  },
  "ECD-UI": {
    description: "Early Childhood Development Angular frontend",
    layer: "frontend"
  },
  "MMU-UI": {
    description: "Mobile Medical Unit Angular frontend",
    layer: "frontend"
  },
  "ADMIN-UI": {
    description: "AMRIT administration Angular frontend",
    layer: "frontend"
  },
  "FLW-Mobile-App": {
    description: "Field-Level Worker Kotlin/Android app for ASHA community health workers — offline-first, handles household registration, ANC, immunization, NCD screening",
    layer: "mobile"
  },
  "HWC-Mobile-App": {
    description: "Health and Wellness Centre Kotlin/Android app for CHO workers",
    layer: "mobile"
  },
  "AMRIT": {
    description: "AMRIT hub repository — issues, documentation, community",
    layer: "docs"
  }
};

const GITHUB_BASE = "https://raw.githubusercontent.com/PSMRI";
const GITHUB_API_BASE = "https://api.github.com/repos/PSMRI";

// ── Coding standards content ───────────────────────────────────────────────

const LAYER_STANDARDS: Record<string, string> = {
  "spring-boot": `

## AMRIT Spring Boot / Java Standards
**Package:** com.iemr.<product> (e.g. com.iemr.hwc, com.iemr.flw)

**Layers:**
- controller/ — thin REST controllers, no business logic, return String JSON
- service/ — business logic, @Transactional on write methods
- repo/ — Spring Data JPA interfaces extending JpaRepository, named *Repo

**Key conventions:**
- Repos named *Repo (NOT *Repository)
- Services named *ServiceImpl
- Use InputMapper.gson().fromJson() for deserialization
- Use OutputMapper().gson().toJson() for serialization  
- @CrossOrigin() on all controllers
- Table names prefixed t_ (e.g. t_anc_care)
- Soft delete via deleted = false boolean field
- Audit fields: createdBy, createdDate with updatable=false
- GenerationType.IDENTITY for primary keys, type Long
`,
  "angular": `

## AMRIT Angular / TypeScript Standards
**Structure:** Feature modules in src/app/app-modules/<feature>/
- Components in <feature>/<component-name>/
- Services in <feature>/shared/services/

**Key conventions:**
- NgModule pattern (not standalone) in existing repos
- All HTTP via HttpServiceService — never inject HttpClient directly
- API URLs in environment.ts — never hardcode
- ConfirmationService for all alerts/dialogs — never window.alert()
- ReactiveFormsModule for all forms
- Import MaterialModule from core/material.module.ts
- Check package.json Angular version — match it exactly before writing code
`,
  "kotlin-android": `

**Package:** org.piramalswasthya.sakhi
**Min SDK:** 25 (critical — affects API choices)

**Key conventions:**
- Entities named *Cache, in model/ package
- syncState: Int (0=UNSYNCED, 1=SYNCING, 2=SYNCED) — never Boolean isSynced
- Always guard migrations with tableExists() and columnExists()
- Flow + StateFlow — never LiveData
- ViewBinding — never synthetics or findViewById
- @HiltViewModel + @Inject constructor for ViewModels
- @AndroidEntryPoint for Fragments
- Never use java.time.* (API 26+), use Calendar + SimpleDateFormat
- Never use paddingHorizontal/paddingVertical XML (API 26+)
- Never mark syncState=2 before confirmed API response
`
};

// ── Helper functions ───────────────────────────────────────────────────────

/**
 * Fetch a repository README from GitHub.
 *
 * Tries main → master → develop branches in order.
 * Wrapped with withRetry so transient network failures (timeouts, 5xx) are
 * automatically retried up to 3 times with exponential backoff.
 * 4xx errors (repo not found, bad name) are NOT retried — they fail fast.
 */
async function fetchGitHubReadme(repoName: string): Promise<string> {
  const branches = ["main", "master", "develop"];

  // Validate input early — invalid names won't get better with retries
  if (!repoName || repoName.trim().length === 0) {
    throw new Error("Invalid task input: repoName must be a non-empty string.");
  }

  for (const branch of branches) {
    try {
      const url = `${GITHUB_BASE}/${repoName}/${branch}/README.md`;

      // withRetry wraps the axios call per-branch with configurable backoff.
      const data = await withRetry(
        `fetch-readme:${repoName}@${branch}`,
        () => axios.get<string>(url, { timeout: 5000 }).then((r) => r.data),
        {
          maxRetries: 3,
          baseDelayMs: 300,
          maxDelayMs: 8_000,
          jitter: true,
          // Only retry network errors and 5xx — not 404 (wrong branch is expected)
          isRetryable: isNetworkError,
        }
      );

      return data;
    } catch {
      // Branch not found or all retries exhausted for this branch — try next
      continue;
    }
  }

  throw new Error(`README not found for ${repoName} on any known branch.`);
}

/**
 * Fetch top-level directory structure via GitHub API.
 *
 * Also wrapped with withRetry for the same transient-failure resilience.
 */
async function fetchRepoStructure(repoName: string): Promise<string> {
  try {
    const response = await withRetry(
      `fetch-structure:${repoName}`,
      () =>
        axios.get<{ tree: Array<{ path: string; type: string }> }>(
          `${GITHUB_API_BASE}/${repoName}/git/trees/main?recursive=0`,
          { timeout: 5000 }
        ),
      {
        maxRetries: 3,
        baseDelayMs: 300,
        maxDelayMs: 8_000,
        jitter: true,
        isRetryable: isNetworkError,
      }
    );

    const topLevel = response.data.tree
      .filter((item) => !item.path.startsWith(".") && item.path !== "node_modules")
      .slice(0, 30)
      .map((item) => `${item.type === "tree" ? "📁" : "📄"} ${item.path}`)
      .join("\n");

    return topLevel;
  } catch {
    return `Could not fetch structure for ${repoName}. Try cloning locally.`;
  }
}

function searchDocs(query: string): string {
  const q = query.toLowerCase();
  const results: string[] = [];

  // Search repo descriptions
  for (const [repo, info] of Object.entries(AMRIT_REPOS)) {
    if (
      info.description.toLowerCase().includes(q) ||
      repo.toLowerCase().includes(q) ||
      info.layer.includes(q)
    ) {
      results.push(`**${repo}** (${info.layer}): ${info.description}`);
    }
  }

  // Search coding standards
  for (const [layer, content] of Object.entries(LAYER_STANDARDS)) {
    if (content.toLowerCase().includes(q) || layer.includes(q)) {
      const lines = content.split("\n")
        .filter(line => line.toLowerCase().includes(q) || line.startsWith("##"))
        .slice(0, 8)
        .join("\n");
      if (lines) {
        results.push(`**Coding Standards (${layer}):**\n${lines}`);
      }
    }
  }

  if (results.length === 0) {
    return `No results found for "${query}". Try terms like: beneficiary, ANC, HRP, Room, Spring Boot, Angular, ASHA, offline, migration, sync`;
  }

  return results.join("\n\n---\n\n");
}

// ── MCP Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "amrit-docs-mcp",
  version: "1.1.0"
});

// Tool 1: Search AMRIT docs
server.tool(
  "search_amrit_docs",
  "Search AMRIT documentation, repo descriptions, and coding standards using plain English",
  {
    query: z.string().describe(
      "Plain English search query. Examples: 'beneficiary registration', 'ANC visit', 'offline sync', 'Spring Boot service pattern'"
    )
  },
  async ({ query }) => {
    const results = searchDocs(query);
    return {
      content: [{
        type: "text",
        text: `## Search results for: "${query}"\n\n${results}`
      }]
    };
  }
);

// Tool 2: Get repo README
server.tool(
  "get_repo_readme",
  "Fetch the README for any AMRIT repository from GitHub",
  {
    repo_name: z.string().describe(
      "AMRIT repository name. Examples: HWC-API, FLW-Mobile-App, HWC-UI, Common-API"
    )
  },
  async ({ repo_name }) => {
    try {
      const readme = await fetchGitHubReadme(repo_name);
      return {
        content: [{
          type: "text",
          text: `## README: ${repo_name}\n\n${readme.slice(0, 8000)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Could not fetch README for ${repo_name}. Verify the repo name is correct.\nAvailable repos: ${Object.keys(AMRIT_REPOS).join(", ")}`
        }]
      };
    }
  }
);

// Tool 3: Get coding standards
server.tool(
  "get_coding_standards",
  "Get AMRIT coding standards and conventions for a specific technology layer",
  {
    layer: z.enum(["spring-boot", "angular", "kotlin-android", "all"]).describe(
      "Technology layer: spring-boot, angular, kotlin-android, or all"
    )
  },
  async ({ layer }) => {
    if (layer === "all") {
      const all = Object.entries(LAYER_STANDARDS)
        .map(([, content]) => content)
        .join("\n\n---\n\n");
      return { content: [{ type: "text", text: all }] };
    }

    const standards = LAYER_STANDARDS[layer];
    if (!standards) {
      return {
        content: [{
          type: "text",
          text: `No standards found for layer: ${layer}. Available: ${Object.keys(LAYER_STANDARDS).join(", ")}`
        }]
      };
    }

    return { content: [{ type: "text", text: standards }] };
  }
);

// Tool 4: List AMRIT repos
server.tool(
  "list_amrit_repos",
  "List all AMRIT repositories with their descriptions and technology layer",
  {
    layer: z.enum(["all", "backend", "frontend", "mobile", "docs"]).optional()
      .describe("Filter by layer: all, backend, frontend, mobile, docs")
  },
  async ({ layer = "all" }) => {
    const filtered = Object.entries(AMRIT_REPOS)
      .filter(([, info]) => layer === "all" || info.layer === layer)
      .map(([repo, info]) => `**${repo}** (${info.layer})\n${info.description}`)
      .join("\n\n");

    return {
      content: [{
        type: "text",
        text: `## AMRIT Repositories${layer !== "all" ? ` — ${layer}` : ""}\n\n${filtered}`
      }]
    };
  }
);

// Tool 5: Get repo structure
server.tool(
  "get_repo_structure",
  "Get the top-level folder structure of an AMRIT repository",
  {
    repo_name: z.string().describe(
      "AMRIT repository name. Examples: HWC-API, FLW-Mobile-App, HWC-UI"
    )
  },
  async ({ repo_name }) => {
    const structure = await fetchRepoStructure(repo_name);
    return {
      content: [{
        type: "text",
        text: `## Repository structure: ${repo_name}\n\n${structure}`
      }]
    };
  }
);

// ── Start server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AMRIT Docs MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
