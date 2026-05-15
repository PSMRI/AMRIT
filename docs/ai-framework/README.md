# AMRIT Agentic AI Framework

An open-source, modular framework that gives AI agents (Claude Code, Cursor,
Copilot, Gemini) deep contextual knowledge of the AMRIT platform so they can
assist across every phase of AMRIT's Software Development Lifecycle.

## What this framework does

Without this framework, an AI agent helping with AMRIT needs you to manually
paste architecture context, coding conventions, and domain knowledge into every
session. With this framework, agents understand AMRIT's codebase, patterns, and
healthcare domain automatically.

**Ask any AI agent:**
- "How does beneficiary registration work in HWC-API?"
- "Write a new Spring Boot service following AMRIT conventions"
- "Generate a JIRA ticket from this Confluence BRD"
- "Review this PR against AMRIT's coding standards"

## Repository structure

```
amrit-ai-framework/
├── standards/                    # Coding standards per technology layer
│   ├── AMRIT_CODING_STANDARDS.md # Spring Boot + Angular + Kotlin/Android
│   ├── spring-boot.md            # Spring Boot deep-dive
│   ├── angular.md                # Angular deep-dive
│   └── kotlin-android.md        # Kotlin/Android deep-dive
├── mcp-servers/                  # MCP servers connecting agents to AMRIT knowledge
│   └── amrit-docs-mcp/           # Indexes AMRIT docs for plain-English search
├── skills/                       # Reusable agent skills (Claude Code slash commands)
│   ├── generate-jira-ticket.md   # BRD → JIRA ticket
│   ├── implementation-plan.md    # JIRA ticket → implementation plan
│   └── review-pr.md              # PR diff → review against AMRIT standards
├── commands/                     # Developer workflow commands
│   └── onboard-repo.sh           # Clone + load context for any AMRIT repo
├── context/                      # Per-repo CLAUDE.md context files
│   └── FLW-Mobile-App/
│       └── CLAUDE.md
├── docs/                         # Framework documentation
│   └── CONTRIBUTING.md
└── README.md
```

## Quick start

### For Claude Code users

1. Clone this repo
2. Copy the relevant `context/<repo>/CLAUDE.md` to your AMRIT repo root
3. Copy `.cursorrules` to your repo root (also works with Claude Code)
4. Start coding — Claude Code now understands AMRIT patterns automatically

### For Cursor users

1. Copy `.cursorrules` to your AMRIT repo root
2. Add the MCP server config to your `~/.cursor/mcp.json` (see `mcp-servers/`)
3. Cursor will automatically load AMRIT context for all completions

### For Copilot users

1. Copy the relevant `context/<repo>/CLAUDE.md` to your repo root as `.github/copilot-instructions.md`
2. Copilot workspace instructions will be loaded automatically

## Acceptance criteria coverage

| Criterion | Satisfied by |
|---|---|
| MCP server indexes AMRIT docs | `mcp-servers/amrit-docs-mcp/` |
| Integration with external tool | MCP server connects to AMRIT GitBook + GitHub |
| Coding standards defined | `standards/AMRIT_CODING_STANDARDS.md` |
| Working skill (SDLC phase) | `skills/generate-jira-ticket.md` |
| Works with 2+ AI agents | Claude Code + Cursor (`.cursorrules` + MCP config) |
| Contributor documentation | `docs/CONTRIBUTING.md` |
| Modular — add without touching core | Each component is independent |

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for how to add new MCP servers,
skills, commands, and coding standards.
