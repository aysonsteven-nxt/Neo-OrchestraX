---
name: pack
description: "Inspect or compose an OrchestraX pack and its dependency graph for a project."
user-invocable: true
disable-model-invocation: true
---

# Neo OrchestraX /pack

This is the Copilot Agent Skill projection of the provider-neutral Neo OrchestraX AI command `/pack`.

Usage: `/pack <pack> [compose] [for <project>]`

## Instructions
Inspect the requested pack or compose it against the resolved project's effective instructions, agents, skills, compatibility signals, and dependency graph.

Treat this as an OrchestraX action, not a terminal command. Preserve explicit project targeting and do not substitute a different OrchestraX action. Use the available OrchestraX command/CLI bridge only when needed to execute the action.
