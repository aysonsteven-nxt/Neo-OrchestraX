# Neo OrchestraX

**Version 0.14.1**

Neo OrchestraX is a workspace-first, provider-neutral AI development orchestration layer.

```text
Project Intelligence + Packs + Rails + Agents + Skills + Syntra
                              |
                              v
                        AI Commands
                              |
                              v
                       Command Router
                              |
                              v
                     Provider Adapters
                       /   /   |   \\
                      v   v    v    v
                 Copilot Gemini Claude Cursor
```

## AI Commands — PRIMARY

```text
/package-selector
/package-install android-kotlin-dev for MoneyMap
/context for MoneyMap
/task start "Transaction history" "Track transaction history" for MoneyMap
/handoff for MoneyMap
/resume for MoneyMap
/instructions for MoneyMap
/agents for MoneyMap
/agent android-dev for MoneyMap
/skills for MoneyMap
/skill compose-development for MoneyMap
```

The canonical AI Command definitions live in:

```text
neo-orchestrax/commands/*.command.md
```

The legacy `@command` syntax remains accepted for compatibility but `/command` is canonical.

## CLI — SECONDARY

```text
neo pack list
neo analyze MoneyMap
neo provider list
neo provider sync MoneyMap copilot
```

The CLI can exercise the AI command router for diagnostics:

```text
neo command "/package-selector for MoneyMap"
```

## Provider-neutral core

The canonical OrchestraX definitions remain inside `neo-orchestrax`:

```text
neo-orchestrax/
├── agents/
├── skills/
├── instructions/
├── commands/
├── packs/
├── syntra/
└── providers/
```

Provider adapters determine how those canonical capabilities are exposed through a specific AI provider. The core does not depend on Copilot, Gemini, Claude Code, Cursor, or any other single provider.

## V0.14.1

This bug-fix release improves workspace and OrchestraX root discovery so versioned release folders and invocation from inside the OrchestraX directory work correctly.


V0.14 introduces:

- first-class AI Commands
- provider-neutral command definitions
- slash-style canonical `/command` syntax
- legacy `@command` compatibility parsing
- dedicated AI command routing/execution
- provider capability abstraction for AI command exposure
- provider manifests containing the canonical command catalog

Syntra remains the internal persistent project-intelligence layer, and Handoff remains current transferable work/session state.
