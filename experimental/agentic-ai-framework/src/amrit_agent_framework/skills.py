"""Reusable skills for AMRIT SDLC assistance."""

from __future__ import annotations

from dataclasses import dataclass

from amrit_agent_framework.indexer import DocumentIndex


@dataclass(frozen=True)
class ImplementationPlan:
    title: str
    context: list[dict[str, object]]
    steps: list[str]
    risks: list[str]

    def to_dict(self) -> dict[str, object]:
        return {
            "title": self.title,
            "context": self.context,
            "steps": self.steps,
            "risks": self.risks,
        }


def generate_implementation_plan(ticket: str, index: DocumentIndex) -> ImplementationPlan:
    """Generate a structured first-pass implementation plan from a ticket."""

    context = [result.to_dict() for result in index.search(ticket, limit=3)]
    return ImplementationPlan(
        title="AMRIT implementation plan",
        context=context,
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
