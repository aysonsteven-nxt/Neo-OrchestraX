---
id: pack
version: 1.0.0
description: Inspect or compose an OrchestraX pack and its dependency graph for a project.
argument-hint: "<pack> [compose] [for <project>]"
usage: /pack <pack> [compose] [for <project>]
handler: pack
target: optional
---
Inspect the requested pack or compose it against the resolved project's effective instructions, agents, skills, compatibility signals, and dependency graph.
