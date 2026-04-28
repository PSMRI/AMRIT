# Experimental AMRIT Agent Framework

This is a concrete experimental implementation for the DMP 2026 AMRIT Agentic AI Coding Framework idea.

It is intentionally placed under `experimental/` so it does not imply a production-ready framework or changes to existing AMRIT applications.

## What It Demonstrates

- Local indexing of AMRIT text/Markdown documentation
- Plain-English search over indexed docs
- A reusable SDLC skill: generate an implementation plan from a ticket
- Repository manifest lookup for module-aware planning
- A minimal JSON-RPC stdio server shape for future MCP SDK integration
- Starter coding standards embedded in code for agent-assisted AMRIT work
- Tests for search, skill generation, and tool calls

## Quickstart

```bash
cd experimental/agentic-ai-framework
python -m pip install -e ".[dev]"
amrit-agent --docs examples/docs search "beneficiary identity api"
amrit-agent --docs examples/docs \
  --repo-manifest examples/repo_manifest.json \
  plan "Add beneficiary registration support in Identity API"
python -m pytest
```

## Implementation approach

Implemented:

- dependency-light local indexer
- search tool
- implementation-plan skill
- repository manifest loader
- repo-aware implementation plans
- JSON-RPC style tool handler
- coding standards represented as structured Python data
- tests

Planned:

- proper MCP SDK server
- Confluence/JIRA adapters after access model is confirmed
- codebase indexer across AMRIT repositories
- agent-specific packaging for Claude Code, Cursor, Copilot, and Gemini
- maintainer-approved coding standards per repo family

## Repository structure

```text
experimental/agentic-ai-framework/
  README.md
  pyproject.toml
  examples/
    docs/amrit-overview.txt
    repo_manifest.json
  src/amrit_agent_framework/
    cli.py          command line entrypoint
    indexer.py      local document index and search
    mcp_stdio.py    JSON-RPC tool server surface
    repo_map.py     AMRIT repository manifest lookup
    skills.py       implementation-plan skill
    standards.py    structured AMRIT coding standards
  tests/
    test_framework.py
```

## Important Caveat

This is not a replacement for the C4GT proposal process. It is a concrete prototype to reason about architecture and scope.
