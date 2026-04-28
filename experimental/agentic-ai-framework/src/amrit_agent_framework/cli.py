"""CLI for the experimental AMRIT agent framework."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from amrit_agent_framework.indexer import DocumentIndex
from amrit_agent_framework.mcp_stdio import serve
from amrit_agent_framework.skills import generate_implementation_plan


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AMRIT-aware local agent tools.")
    parser.add_argument(
        "--docs",
        type=Path,
        action="append",
        required=True,
        help="Markdown file or directory to index. Repeat for multiple paths.",
    )
    subcommands = parser.add_subparsers(dest="command", required=True)

    search = subcommands.add_parser("search")
    search.add_argument("query")

    plan = subcommands.add_parser("plan")
    plan.add_argument("ticket")

    subcommands.add_parser("serve")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    docs = list(args.docs)
    if args.command == "serve":
        serve(docs)
        return

    index = DocumentIndex.from_paths(docs)
    if args.command == "search":
        payload = [result.to_dict() for result in index.search(args.query)]
    else:
        payload = generate_implementation_plan(args.ticket, index).to_dict()
    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
