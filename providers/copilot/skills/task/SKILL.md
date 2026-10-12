---
name: task
description: "Create, inspect, update, or resolve context for an OrchestraX task."
user-invocable: true
disable-model-invocation: true
---

# Neo OrchestraX /task

This is the Copilot Agent Skill projection of the provider-neutral Neo OrchestraX AI command `/task`.

Usage: `/task <action> ... [for <project>]`

## Instructions
Operate on the target project's OrchestraX task state. Preserve explicit task status, questions, problems, next action, and relevant context.

Treat this as an OrchestraX action, not a terminal command. Preserve explicit project targeting and do not substitute a different OrchestraX action. Use the available OrchestraX command/CLI bridge only when needed to execute the action.
