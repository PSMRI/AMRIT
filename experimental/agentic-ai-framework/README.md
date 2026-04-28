# Experimental AMRIT Agent Framework

This is a small proof-of-work prototype for the DMP 2026 AMRIT Agentic AI Coding Framework idea.

It is intentionally placed under `experimental/` so it does not imply a production-ready framework or changes to existing AMRIT applications.

## What It Demonstrates

- Local indexing of AMRIT markdown documentation
- Plain-English search over indexed docs
- A reusable SDLC skill: generate an implementation plan from a ticket
- A minimal JSON-RPC stdio server shape for future MCP SDK integration
- Starter coding standards for agent-assisted AMRIT work
- Tests for search, skill generation, and tool calls

## Quickstart

```bash
cd experimental/agentic-ai-framework
python -m pip install -e ".[dev]"
amrit-agent --docs examples/docs search "beneficiary identity api"
amrit-agent --docs examples/docs plan "Add beneficiary registration support"
python -m pytest
```

## Current Scope

Implemented:

- dependency-light local indexer
- search tool
- implementation-plan skill
- JSON-RPC style tool handler
- standards draft
- tests

Planned:

- proper MCP SDK server
- Confluence/JIRA adapters after access model is confirmed
- codebase indexer across AMRIT repositories
- agent-specific packaging for Claude Code, Cursor, Copilot, and Gemini
- maintainer-approved coding standards per repo family

## Important Caveat

This is not a replacement for the C4GT proposal process. It is a concrete prototype to reason about architecture and scope.
