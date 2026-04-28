"""Starter standards for agent-assisted AMRIT work."""

AMRIT_CODING_STANDARDS = {
    "cross_repo": [
        "Identify the owning AMRIT module before editing code.",
        "Check paired UI/API repositories when changing API contracts.",
        "Keep changes small and linked to the relevant ticket.",
        "Document setup and validation commands in PRs.",
        "Flag healthcare workflow changes for domain review.",
    ],
    "spring_boot_api": [
        "Preserve controller/service/repository boundaries.",
        "Keep DTO changes explicit.",
        "Add or update tests around changed business rules.",
    ],
    "angular_ui": [
        "Keep module-specific UI changes inside the relevant UI repository.",
        "Treat shared Common UI changes as cross-module changes.",
        "Validate service method changes against backend API contracts.",
    ],
    "kotlin_mobile": [
        "Preserve offline and error-handling paths.",
        "Keep API models aligned with backend DTOs.",
        "Validate workflows for field health worker usability.",
    ],
}
