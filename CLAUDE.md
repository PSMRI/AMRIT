# CLAUDE.md for `PSMRI/AMRIT`

This repository is the AMRIT **coordination hub**. It contains documentation, issue templates, and contributor metadata. It does **not** contain deployable UI/API/mobile application code.

Primary references:
- `README.md` (ecosystem repository map and ports)
- `CONTRIBUTOR_GUIDELINES.md` (issue and PR process)
- [AMRIT GitBook](https://piramal-swasthya.gitbook.io/amrit)

## Project Architecture Overview

- This repo is a documentation and community-management hub.
- Application code lives in separate `PSMRI/*` repositories listed in `README.md`.
- Most feature work should happen in those service repositories, not here.

## Folder Structure (This Repository)

| Path | Purpose |
|---|---|
| `README.md` | AMRIT overview, repository catalog, local dev ports |
| `CONTRIBUTOR_GUIDELINES.md` | Assignment and PR rules |
| `.github/ISSUE_TEMPLATE/` | Issue templates for contributors and programs |
| `.well-known/` | Funding/discovery metadata |
| `.all-contributorsrc` | all-contributors configuration |
| `CODE_OF_CONDUCT.md`, `LICENSE` | Governance and licensing |

## Existing Conventions in This Repo

- Keep changes small, specific, and easy to review.
- Prefer factual markdown updates over broad rewrites.
- Link PRs to issues (`Closes #...`) when applicable.
- For contributor table updates, use the all-contributors flow instead of manual edits.

## Service/Controller/Component Patterns

No `controller`, `service`, or UI `component` source exists in this repository.

Pattern orientation from `README.md`:
- UI repositories (`*-UI`) use Angular component/module patterns in their own repos.
- API repositories (`*-API`) use Spring Boot controller/service patterns in their own repos.
- Mobile repositories use Kotlin app module patterns in their own repos.

## Naming Conventions

- UI repos use `*-UI` naming (example: `HWC-UI`).
- API repos use `*-API` naming (example: `HWC-API`).
- Use repository names exactly as listed in `README.md` when raising issues/PRs.

## Logging Standards

- No logging implementation exists in this hub repo.
- Follow logging standards in the target service repository (for example its Spring Boot logging config).

## API Conventions

- No API endpoints are implemented in this repo.
- REST path/DTO/error conventions are defined per API microservice repository.

## Testing Expectations

- This hub has no application test suite.
- In service repos, add tests using that repository’s stack and existing patterns.

## For AI Coding Assistants

- Do not assume this repository contains deployable application code.
- Most implementation work belongs in individual service repositories.
- Always verify target repository before suggesting architecture or code changes.
- Prefer referencing existing repo names from `README.md` instead of inventing new services.

## Avoid in This Repo

- Adding speculative framework code, MCP servers, or root build tooling.
- Inventing architecture, ports, services, or APIs not documented here.
- Making unrelated large edits when a small doc change solves the issue.
