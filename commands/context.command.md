---
id: context
version: 1.0.0
description: Resolve the most relevant OrchestraX project context for the current request.
argument-hint: "[query] [for <project>]"
usage: /context [query] [for <project>]
handler: context
target: required
---
Resolve relevant project context using Project Intelligence, Syntra, installed packs, effective instructions, agents, skills, task state, and handoff continuity. Prefer authoritative information over inferred or draft information.
