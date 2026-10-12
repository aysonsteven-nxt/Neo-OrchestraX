---
name: package-selector
description: "Select the most relevant OrchestraX pack or packs for the target project and current task."
user-invocable: true
disable-model-invocation: true
---

# Neo OrchestraX /package-selector

This is the Copilot Agent Skill projection of the provider-neutral Neo OrchestraX AI command `/package-selector`.

Usage: `/package-selector [task or goal] [for <project>]`

## Instructions
Use the OrchestraX Pack Selector for the resolved project. Consider Project Intelligence, technology signals, existing installed packs, pack capabilities, pack compatibility, and resolved dependencies. Return ranked recommendations with technical relevance evidence. Do not treat the score as a quality rating.

Treat this as an OrchestraX action, not a terminal command. Preserve explicit project targeting and do not substitute a different OrchestraX action. Use the available OrchestraX command/CLI bridge only when needed to execute the action.
