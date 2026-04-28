"""Reusable skills for AMRIT SDLC assistance."""

from __future__ import annotations

from dataclasses import dataclass

from amrit_agent_framework.indexer import DocumentIndex
from amrit_agent_framework.repo_map import RepositoryMap
from amrit_agent_framework.standards import AMRIT_CODING_STANDARDS


@dataclass(frozen=True)
class ImplementationPlan:
    title: str
    context: list[dict[str, object]]
    repositories: list[dict[str, object]]
    standards: dict[str, list[str]]
    steps: list[str]
    risks: list[str]

    def to_dict(self) -> dict[str, object]:
        return {
            "title": self.title,
            "context": self.context,
            "repositories": self.repositories,
            "standards": self.standards,
            "steps": self.steps,
            "risks": self.risks,
        }


def generate_implementation_plan(
    ticket: str,
    index: DocumentIndex,
    repository_map: RepositoryMap | None = None,
) -> ImplementationPlan:
    """Generate a structured first-pass implementation plan from a ticket."""

    context = [result.to_dict() for result in index.search(ticket, limit=3)]
    repo_map = repository_map or RepositoryMap([])
    repositories = [
        repository.to_dict()
        for token in ticket.split()
        for repository in repo_map.search(token)
    ]
    return ImplementationPlan(
        title="AMRIT implementation plan",
        context=context,
        repositories=_dedupe_repositories(repositories),
        standards=AMRIT_CODING_STANDARDS,
        steps=[
            "Identify the AMRIT module and dependent UI/API repositories.",
            "Confirm relevant API contracts, data models, and configuration paths.",
            "Map the change to repo-specific coding standards before implementation.",
            "Create or update tests around the affected workflow.",
            "Document setup, validation commands, and rollback notes.",
        ],
        risks=[
            "Cross-repo API/UI mismatch if contracts are not checked early.",
            "Healthcare workflow changes may require domain review before merge.",
            "Generated plans should be reviewed by a maintainer before execution.",
        ],
    )


def _dedupe_repositories(repositories: list[dict[str, object]]) -> list[dict[str, object]]:
    seen: set[str] = set()
    unique: list[dict[str, object]] = []
    for repository in repositories:
        name = str(repository["name"])
        if name not in seen:
            seen.add(name)
            unique.append(repository)
    return unique
