# Initial AMRIT Coding Standards

These are starter standards for agent-assisted work. They should be validated by AMRIT maintainers before being treated as authoritative.

## Cross-Repo Standards

- Identify the owning AMRIT module before editing code.
- Check the paired UI/API repository when changing API contracts.
- Keep changes small and linked to the relevant ticket.
- Document setup and validation commands in PRs.
- Flag healthcare workflow changes for domain review.

## Spring Boot API Standards

- Preserve controller/service/repository boundaries.
- Keep request/response DTO changes explicit.
- Add or update tests around changed business rules.
- Avoid changing shared Common API behavior without cross-module impact review.

## Angular UI Standards

- Keep module-specific UI changes inside the relevant UI repository.
- Treat shared Common UI changes as cross-module changes.
- Validate service method changes against backend API contracts.

## Kotlin Mobile Standards

- Preserve offline/error-handling paths.
- Keep API models aligned with backend DTOs.
- Validate workflows for field health worker usability.
