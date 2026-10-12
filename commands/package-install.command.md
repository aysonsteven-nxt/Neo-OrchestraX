---
id: package-install
version: 1.0.0
description: Install an OrchestraX pack and resolve its required dependency graph for the target project.
argument-hint: "<pack> for <project>"
usage: /package-install <pack> [for <project>]
handler: package-install
target: required
---
Install the requested OrchestraX pack for the resolved project. Resolve dependencies before installation, validate compatibility, and report every installed pack and any blocking issue.
