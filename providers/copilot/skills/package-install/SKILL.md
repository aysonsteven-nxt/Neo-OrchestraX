---
name: package-install
description: "Install an OrchestraX pack and resolve its required dependency graph for the target project."
user-invocable: true
disable-model-invocation: true
---

# Neo OrchestraX /package-install

This is the Copilot Agent Skill projection of the provider-neutral Neo OrchestraX AI command `/package-install`.

Usage: `/package-install <pack> [for <project>]`

## Instructions
Install the requested OrchestraX pack for the resolved project. Resolve dependencies before installation, validate compatibility, and report every installed pack and any blocking issue.

Treat this as an OrchestraX action, not a terminal command. Preserve explicit project targeting and do not substitute a different OrchestraX action. Use the available OrchestraX command/CLI bridge only when needed to execute the action.
