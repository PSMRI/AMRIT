# amrit-docs-mcp

MCP server that gives AI agents (Claude Code, Cursor, Copilot) plain-English
access to AMRIT documentation, repository descriptions, and coding standards.

## What it does

Without this server, every AI session requires you to manually paste AMRIT
context. With this server, agents can:

- Search AMRIT docs and repo descriptions in plain English
- Fetch any AMRIT repo README on demand
- Get coding standards for Spring Boot, Angular, or Kotlin/Android
- List all AMRIT repos with descriptions
- Get repo folder structure

## Installation

**Prerequisites:** Node.js 18+

```bash
cd mcp-servers/amrit-docs-mcp
npm install
npm run build
```

## Configure with Claude Code

Add to your `claude_mcp_config.json`:

```json
{
  "mcpServers": {
    "amrit-docs": {
      "command": "node",
      "args": ["/absolute/path/to/amrit-docs-mcp/dist/index.js"]
    }
  }
}
```

## Configure with Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "amrit-docs": {
      "command": "node",
      "args": ["/absolute/path/to/amrit-docs-mcp/dist/index.js"]
    }
  }
}
```

## Available tools

| Tool | Description |
|---|---|
| `search_amrit_docs` | Plain-English search across AMRIT docs and standards |
| `get_repo_readme` | Fetch README for any AMRIT repo |
| `get_coding_standards` | Get standards for spring-boot / angular / kotlin-android |
| `list_amrit_repos` | List all repos with descriptions, filterable by layer |
| `get_repo_structure` | Get top-level folder structure of any AMRIT repo |

## Example usage

Once connected, ask your AI agent:

```
"How does beneficiary registration work in AMRIT?"
→ Uses search_amrit_docs("beneficiary registration")

"Show me the HWC-API README"
→ Uses get_repo_readme("HWC-API")

"What are the Spring Boot conventions for AMRIT?"
→ Uses get_coding_standards("spring-boot")

"What repos does AMRIT have?"
→ Uses list_amrit_repos("all")
```
