---
id: provider-sync
version: 1.0.0
description: Synchronize canonical OrchestraX project intelligence into a selected provider's supported project artifacts.
argument-hint: "[provider] for <project>"
usage: /provider-sync [provider] [for <project>]
handler: provider-sync
target: required
---
Synchronize the canonical OrchestraX project context into the selected provider adapter. The provider remains an execution surface; canonical OrchestraX definitions remain the source of truth.
