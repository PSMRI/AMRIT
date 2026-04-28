from pathlib import Path

from amrit_agent_framework.indexer import DocumentIndex
from amrit_agent_framework.mcp_stdio import handle_request
from amrit_agent_framework.skills import generate_implementation_plan


ROOT = Path(__file__).resolve().parents[1]


def test_index_search_finds_relevant_module_context():
    index = DocumentIndex.from_paths([ROOT / "examples" / "docs"])
    results = index.search("beneficiary identity api")

    assert results
    assert "Identity API" in results[0].snippet


def test_generate_plan_includes_context_and_review_risks():
    index = DocumentIndex.from_paths([ROOT / "examples" / "docs"])
    plan = generate_implementation_plan("Add beneficiary registration support", index)

    assert plan.context
    assert any("domain review" in risk for risk in plan.risks)
    assert len(plan.steps) >= 3


def test_json_rpc_tool_call_searches_docs():
    index = DocumentIndex.from_paths([ROOT / "examples" / "docs"])
    response = handle_request(
        {
            "id": 1,
            "method": "tools/call",
            "params": {"name": "search_docs", "arguments": {"query": "helpline 104"}},
        },
        index,
    )

    assert response["id"] == 1
    assert response["result"]["content"]
