# Neo OrchestraX AI Commands

AI Commands are the **PRIMARY user-facing command interface** of Neo OrchestraX.
They are not CLI commands.

Canonical syntax:

```text
/package-selector
/package-install android-kotlin-dev for MoneyMap
/context for MoneyMap
/task start "Transaction history" "Track transaction history" for MoneyMap
/handoff for MoneyMap
/resume for MoneyMap
```

Command definitions are provider-neutral Markdown files under this directory:

```text
commands/
├── package-selector.command.md
├── package-install.command.md
├── context.command.md
└── ...
```

Each command definition contains its metadata plus the reusable prompt/instructions that describe the action.

The `@...` syntax remains accepted by the parser as a **legacy compatibility alias** for existing V0.2–V0.13 workflows. New documentation uses `/...` only.

## CLI distinction

The terminal interface remains separate:

```text
neo pack list
neo analyze MoneyMap
neo provider sync MoneyMap copilot
```

The CLI may provide a diagnostic bridge for the AI command router:

```text
neo command "/package-selector for MoneyMap"
```

That bridge exists for testing/diagnostics; it does not redefine AI Commands as CLI commands.
