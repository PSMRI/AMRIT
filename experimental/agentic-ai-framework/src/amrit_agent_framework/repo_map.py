"""Repository manifest lookup for AMRIT-aware planning."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class RepositoryInfo:
    name: str
    repo_type: str
    stack: str
    purpose: str
    port: int | None = None

    def to_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "type": self.repo_type,
            "stack": self.stack,
            "purpose": self.purpose,
            "port": self.port,
        }


class RepositoryMap:
    def __init__(self, repositories: list[RepositoryInfo]) -> None:
        self.repositories = repositories

    @classmethod
    def from_path(cls, path: Path | None) -> "RepositoryMap":
        if path is None:
            return cls([])
        payload = json.loads(path.read_text(encoding="utf-8"))
        return cls([_repo_from_record(record) for record in payload.get("repositories", [])])

    def search(self, query: str) -> list[RepositoryInfo]:
        query_lower = query.casefold()
        return [
            repository
            for repository in self.repositories
            if query_lower in repository.name.casefold()
            or query_lower in repository.purpose.casefold()
            or query_lower in repository.stack.casefold()
        ]


def _repo_from_record(record: dict[str, Any]) -> RepositoryInfo:
    return RepositoryInfo(
        name=str(record["name"]),
        repo_type=str(record["type"]),
        stack=str(record["stack"]),
        purpose=str(record["purpose"]),
        port=record.get("port"),
    )
