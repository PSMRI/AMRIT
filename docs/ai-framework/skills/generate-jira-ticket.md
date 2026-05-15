# Skill: Generate JIRA Ticket from Confluence BRD

## What it does
Takes a Confluence Business Requirements Document (BRD) or concept note and
generates a structured JIRA ticket ready for the AMRIT sprint board.

## When to use it
- You have a Confluence page describing a new feature or change request
- A stakeholder has sent a requirements doc and you need to create a ticket
- You want to break a large BRD into individual sprint-ready tickets

## Input
- Confluence page URL or pasted BRD text
- Target AMRIT repo (e.g. HWC-API, FLW-Mobile-App, HWC-UI)
- Story point estimate (optional — agent will suggest if not provided)

## Prompt

```
You are an AMRIT technical project manager. Given the following Business
Requirements Document (BRD) from Confluence, generate a structured JIRA
ticket following AMRIT's sprint conventions.

BRD Content:
{{brd_content}}

Target Repository: {{target_repo}}

Generate a JIRA ticket with exactly these sections:

**Summary** (one line, action-oriented, e.g. "Add gamification streak tracking to FLW-Mobile-App")

**Type:** Story | Bug | Task | Sub-task

**Priority:** Critical | High | Medium | Low
(justify briefly)

**Description**
What needs to be built and why. 2–3 sentences max. Non-technical language.

**Acceptance Criteria**
Bullet list. Each item is testable and specific. No vague criteria like
"should work correctly". Use "Given/When/Then" format where applicable.

**Technical Notes**
- Which repo(s) are affected
- Which layer (controller/service/repo for Java; Fragment/ViewModel/Room for Android; component/service for Angular)
- Any database schema changes required
- Any API changes (new endpoints, changed contracts)
- Known risks or dependencies

**Story Points:** X (1/2/3/5/8/13)
(Use Fibonacci. Justify if > 5.)

**Labels:** (select all that apply)
android | spring-boot | angular | database | migration | api-change |
offline-first | ui | performance | security | breaking-change

**Linked Issues:** (list any known dependencies or blocked-by tickets)
```

## Example

**Input BRD excerpt:**
> ASHA workers need a way to track their daily activity streaks to stay motivated.
> The app should show how many consecutive days they have been active and reward
> milestones at 3, 7, and 30 days with badges.

**Generated ticket:**

---
**Summary:** Add daily activity streak tracking and milestone badges to FLW-Mobile-App

**Type:** Story

**Priority:** Medium — improves worker retention, not blocking clinical workflow

**Description:**
ASHA workers currently have no feedback mechanism for consistent app usage.
Adding streak tracking with milestone badges at 3, 7, and 30 days will
improve daily engagement and habit formation, which research shows increases
data quality in CHW digitisation programs.

**Acceptance Criteria:**
- Given an ASHA worker uses the app on consecutive days, when they open the
  dashboard, then their current streak count is visible
- Given a worker reaches a 7-day streak, when the app processes that day's
  activity, then a "Week Warrior" badge is unlocked and displayed
- Given a worker misses a day, when they next open the app, then their streak
  resets to 1 (not 0)
- Given the device is offline, when the worker uses the app, then streak is
  tracked locally and syncs when connectivity returns

**Technical Notes:**
- Repo: FLW-Mobile-App
- Layer: new Room entities (GamificationProfile, GamificationBadge) + ViewModel + Fragment
- DB change: new tables, migration required (increment DB version)
- No new API endpoints required at this stage (sync to be added later)
- Risk: streak date calculation must handle timezone edge cases

**Story Points:** 8
(New Room schema + migration + engine logic + UI + tests = non-trivial)

**Labels:** android, database, migration, offline-first, ui

**Linked Issues:** None
---

## Limitations
- Cannot access Confluence directly — paste the BRD text or provide the URL
  and use the `fetch_confluence_page` MCP tool if available
- Story point estimates are suggestions — review with the team
- Technical notes assume familiarity with AMRIT repo structure; verify before
  copy-pasting into JIRA
