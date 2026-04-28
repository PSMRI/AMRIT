"""Minimal JSON-RPC stdio server shape for future MCP integration.

This is not a full MCP SDK implementation. It gives a dependency-light local
prototype for the two core tools proposed in the DMP ticket: document search
and a reusable implementation-plan skill.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from amrit_agent_framework.indexer import DocumentIndex
from amrit_agent_framework.repo_map import RepositoryMap
from amrit_agent_framework.skills import generate_implementation_plan


def serve(paths: list[Path], repo_manifest: Path | None = None) -> None:
    index = DocumentIndex.from_paths(paths)
    repository_map = RepositoryMap.from_path(repo_manifest)
    for line in sys.stdin:
        if not line.strip():
            continue
        request = json.loads(line)
        response = handle_request(request, index, repository_map)
        sys.stdout.write(json.dumps(response, sort_keys=True) + "\n")
        sys.stdout.flush()


def handle_request(
    request: dict[str, Any],
    index: DocumentIndex,
    repository_map: RepositoryMap | None = None,
) -> dict[str, Any]:
    method = request.get("method")
    request_id = request.get("id")
    params = request.get("params") or {}

    if method == "tools/list":
        return {
            "id": request_id,
            "result": {
                "tools": [
                    {"name": "search_docs", "description": "Search indexed AMRIT docs."},
                    {"name": "generate_implementation_plan", "description": "Create a structured plan from a ticket."},
                ]
            },
        }

    if method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments") or {}
        if tool_name == "search_docs":
            results = [result.to_dict() for result in index.search(str(arguments.get("query", "")))]
            return {"id": request_id, "result": {"content": results}}
        if tool_name == "generate_implementation_plan":
            plan = generate_implementation_plan(str(arguments.get("ticket", "")), index, repository_map)
            return {"id": request_id, "result": {"content": plan.to_dict()}}

    return {
        "id": request_id,
        "error": {"code": "UNKNOWN_METHOD_OR_TOOL", "message": f"Unsupported request: {method}"},
    }
