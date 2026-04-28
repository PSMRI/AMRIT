"""Small local document index for AMRIT-aware retrieval."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


TOKEN_RE = re.compile(r"[a-zA-Z0-9_/-]+")


@dataclass(frozen=True)
class SearchResult:
    path: str
    score: int
    snippet: str

    def to_dict(self) -> dict[str, object]:
        return {"path": self.path, "score": self.score, "snippet": self.snippet}


@dataclass(frozen=True)
class IndexedDocument:
    path: str
    text: str
    tokens: set[str]


class DocumentIndex:
    """In-memory keyword index for docs and repository markdown files."""

    def __init__(self, documents: list[IndexedDocument]) -> None:
        self.documents = documents

    @classmethod
    def from_paths(cls, paths: list[Path]) -> "DocumentIndex":
        documents: list[IndexedDocument] = []
        for path in paths:
            if path.is_dir():
                candidates = sorted(path.rglob("*.md"))
            else:
                candidates = [path]
            for candidate in candidates:
                if candidate.exists() and candidate.is_file():
                    text = candidate.read_text(encoding="utf-8", errors="ignore")
                    documents.append(
                        IndexedDocument(
                            path=str(candidate),
                            text=text,
                            tokens=set(_tokens(text)),
                        )
                    )
        return cls(documents)

    def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        query_tokens = set(_tokens(query))
        scored: list[SearchResult] = []
        for document in self.documents:
            overlap = query_tokens & document.tokens
            if not overlap:
                continue
            scored.append(
                SearchResult(
                    path=document.path,
                    score=len(overlap),
                    snippet=_snippet(document.text, overlap),
                )
            )
        return sorted(scored, key=lambda result: (-result.score, result.path))[:limit]


def _tokens(text: str) -> list[str]:
    return [match.group(0).casefold() for match in TOKEN_RE.finditer(text)]


def _snippet(text: str, overlap: set[str]) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    best_line = ""
    best_score = 0
    for line in lines:
        score = len(overlap & set(_tokens(line)))
        if score > best_score:
            best_score = score
            best_line = line
    if best_line:
        return best_line[:240]
    return (lines[0] if lines else "")[:240]
