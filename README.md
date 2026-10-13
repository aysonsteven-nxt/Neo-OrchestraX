# Neo OrchestraX

**Version 0.19.0**

Neo OrchestraX is a local-first, provider-neutral AI development orchestration toolkit.

V0.15 separates the **OrchestraX installation** from the **workspace** and makes workspace scope optional.

```text
OrchestraX installation
        |
        +-- Packs
        +-- Agents
        +-- Skills
        +-- Instructions / Rails
        +-- AI Commands
        +-- Provider adapters
        |
        v
     Workspace (optional)
        |
        +-- projects/
        +-- documentation/
        +-- context/
        +-- .orchestrax/
        |
        +-- Project A
        |     +-- .orchestrax/
        |
        +-- Project B
              +-- .orchestrax/
```

## Installation vs Workspace

The OrchestraX installation is the toolkit/runtime. It does not need to live inside a workspace.

A workspace is an optional logical scope for related projects, shared configuration, documentation, and cross-project context. Projects may live in different physical directories; a VS Code multi-root `.code-workspace` can define those folders without moving them under the workspace directory.

A standalone project can use OrchestraX without a workspace.

## Initialize a workspace

```text
neo workspace init D:\Work\MyProduct
```

Creates:

```text
MyProduct/
├── projects/
├── documentation/
├── context/
│   └── syntra/
└── .orchestrax/
    ├── workspace.json
    └── packs/
```

## Initialize a standalone project

```text
neo project init D:\Work\MoneyMap
```

Creates:

```text
MoneyMap/
└── .orchestrax/
    ├── project.json
    ├── packs/
    └── syntra/
```

## Pack scopes

Packs can be installed at workspace or project scope:

```text
neo pack install product-manager --workspace
neo pack install android-kotlin-dev MoneyMap
```

The effective project environment is resolved from the OrchestraX installation, workspace scope, and project scope.

## AI Commands — compatibility only

Copilot already exposes OrchestraX commands through its provider plugin:

```text
/package-selector
/package-install android-kotlin-dev for MoneyMap
/context for MoneyMap
/task start "Transaction history" "Track transaction history" for MoneyMap
/handoff for MoneyMap
/resume for MoneyMap
```

AI Commands remain provider-neutral capabilities. OrchestraX does not require every AI client to expose the same slash-command registry.

## CLI — UNIVERSAL control surface

The CLI remains the provider-independent control surface:

```text
neo workspace status
neo project list
neo pack list
neo pack install android-kotlin-dev MoneyMap
neo pack install product-manager --workspace
neo context MoneyMap
neo task list MoneyMap
neo handoff latest MoneyMap
```

The CLI can also exercise the AI command engine diagnostically:

```text
neo command "/package-selector for MoneyMap"
```

## Core separation

- **OrchestraX** — tooling and orchestration capabilities.
- **Workspace** — optional scope for multiple related projects and shared configuration.
- **Projects** — the actual software repositories.
- **Documentation** — human-facing product/technical documentation.
- **Context / Syntra** — persistent knowledge and project/workspace intelligence.

Syntra is not a user-facing command registry and is not a replacement for packs, agents, skills, or instructions.


## V0.17.0

V0.17 provisions the separate Neo Project Board repository inside `<project>-docs/neo-project-board` when the Project Manager pack is installed.

## V0.18.0 — AI/Agent Project Collaboration

V0.18.0 makes Project Hub data consumable by AI/Agents without introducing a second data store. Use `neo project context <project>` for a complete structured project context, `neo story context <project> <story-id>` for focused ticket context, and `neo story comment <project> <story-id> <author> "<comment>"` to persist agent/human contributions directly in the User Story JSON.

## V0.19.0 — Agent-to-Project Collaboration

V0.19.0 introduces provider-neutral User Story analysis with `neo story collaborate <project> <story-id> <agent-id>`. Use `--dry-run` to inspect the generated analysis request without launching a process. Execution is opt-in through `.orchestrax/agent-executors.json`, and an executor is blocked unless `readOnlyVerified` is true after independent verification of OS-enforced read-only isolation. See [docs/V0.19.0.md](docs/V0.19.0.md) for configuration, safety boundaries, and test coverage.
