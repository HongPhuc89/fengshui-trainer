# Project Rules

## Code Language

All code, comments, docstrings, variable names, function names, and commit messages must be written in **English**. Vietnamese is only acceptable in user-facing UI strings and content data.

## Feature Development Workflow

Every feature must go through the following stages **in order**. Do not skip or reorder steps.

### Stage 1 — Detail Design (Technical Leader)

- Use the `/technical-leader` skill to produce a detail design document.
- Save the document to `md/design/feature-<number>-<short-name>.md` (e.g. `feature-32-change-password.md`). The number must be the next sequential number after the highest existing feature number in `md/TASKS.md`. Never use a non-numeric slug as the filename (e.g. `feature-change-password.md` is **invalid**).
- Present the design to the user and explicitly ask for PO review.

### Stage 2 — PO Review Loop

- Use the `/project-owner-detail-design-review` skill to review the design as PO.
- If the PO provides **feedback or change requests**:
  - Revise the design document accordingly.
  - Re-present the updated design and ask for another PO review.
  - Repeat until the PO explicitly approves.
- **Do not proceed to Stage 3 until the PO says the design is approved.**

### Stage 3 — Implementation (Fullstack Developer)

- Only begin after receiving explicit PO approval in Stage 2.
- **Wait for the user to explicitly trigger implementation** (e.g. "implement", "start coding", "go ahead"). Never auto-proceed to Stage 3 after approval — always stop and wait for the user's instruction.
- Use the `/fullstack-developer` skill to implement according to the approved design doc.
- Do not deviate from the approved design. If scope changes are needed, return to Stage 2.

### Rules

- **No code before approval** — if asked to code without an approved design, refuse and redirect to Stage 1.
- **Implementation is user-triggered only** — after PO approval, stop and inform the user. Never automatically start Stage 3. Only proceed when the user explicitly says to implement.
- **One feature at a time** — complete all three stages for a feature before starting the next.
- **Design doc is the source of truth** — implementation must match the approved design.

## Django Commands

All Django management commands must be run inside docker-compose, not locally.

- docker-compose file: `docker/docker-compose.yml`
- Django service name: `web`

```bash
docker-compose -f docker/docker-compose.yml exec web python manage.py <command>
```

Examples:
```bash
docker-compose -f docker/docker-compose.yml exec web python manage.py migrate
docker-compose -f docker/docker-compose.yml exec web python manage.py makemigrations
docker-compose -f docker/docker-compose.yml exec web python manage.py shell
```
