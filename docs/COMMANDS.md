# Commands

## AI Commands — PRIMARY

AI Commands are the user-facing commands intended for AI conversations.

```text
/package-selector
/package-install android-kotlin-dev for MoneyMap
/package-list
/package-installed for MoneyMap
/package-remove android-kotlin-dev for MoneyMap
/package-validate android-kotlin-dev for MoneyMap
/context for MoneyMap
/task start "Transaction history" "Track transaction history" for MoneyMap
/handoff for MoneyMap
/resume for MoneyMap
/instructions for MoneyMap
/agents for MoneyMap
/agent android-dev for MoneyMap
/skills for MoneyMap
/skill compose-development for MoneyMap
/pack android-kotlin-dev for MoneyMap
/provider-sync copilot for MoneyMap
```

Syntra remains internal and has no `/syntra` command.

## Command definitions

Canonical definitions are stored under:

```text
commands/*.command.md
```

The definition includes metadata plus the reusable prompt/instructions for that action.

## Legacy alias

`@...` is still accepted as a compatibility alias, but `/...` is canonical from V0.14 onward.

## CLI — SECONDARY

Native CLI commands are the direct operational interface:

```text
neo pack list
neo analyze MoneyMap
neo provider sync MoneyMap copilot
```

## AI Command Compatibility

The canonical `/...` AI command language is also available from the CLI through the
compatibility bridge. This invokes the same AI Command Engine used by provider
integrations; it is not a separate implementation of the commands.

```text
neo command "/package-selector for MoneyMap"
neo command "/package-install android-kotlin-dev for MoneyMap"
neo command "/context for MoneyMap"
neo command "/task start \"Transaction history\" \"Track transaction history\" for MoneyMap"
neo command "/handoff for MoneyMap"
neo command "/resume for MoneyMap"
neo command "/instructions for MoneyMap"
neo command "/agents for MoneyMap"
neo command "/agent android-dev for MoneyMap"
neo command "/skills for MoneyMap"
neo command "/skill compose-development for MoneyMap"
neo command "/provider-sync copilot for MoneyMap"
```

Use native `neo ...` commands when a direct CLI operation is more convenient. Use
`neo command "/..."` when the canonical AI command syntax should be exercised
from a terminal.
