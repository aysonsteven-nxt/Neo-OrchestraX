---
name: agents
description: "Inspect the effective OrchestraX agents for a project."
user-invocable: true
disable-model-invocation: true
---

# Neo OrchestraX /agents

This is the Copilot Agent Skill projection of the provider-neutral Neo OrchestraX AI command `/agents`.

Usage: `/agents [for <project>]`

## Instructions
Inspect agents applicable to the resolved project and show their roles, dependencies, versions, capabilities, and resolution state.

Treat this as an OrchestraX action, not a terminal command. Preserve explicit project targeting and do not substitute a different OrchestraX action. Use the available OrchestraX command/CLI bridge only when needed to execute the action.
