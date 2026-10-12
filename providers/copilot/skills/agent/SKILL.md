---
name: agent
description: "Inspect one OrchestraX agent for a project."
user-invocable: true
disable-model-invocation: true
---

# Neo OrchestraX /agent

This is the Copilot Agent Skill projection of the provider-neutral Neo OrchestraX AI command `/agent`.

Usage: `/agent <agent-id> [for <project>]`

## Instructions
Inspect the requested OrchestraX agent and show its role, resolved instruction dependencies, resolved skill dependencies, capabilities, and content.

Treat this as an OrchestraX action, not a terminal command. Preserve explicit project targeting and do not substitute a different OrchestraX action. Use the available OrchestraX command/CLI bridge only when needed to execute the action.
