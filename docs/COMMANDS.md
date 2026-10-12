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

CLI commands remain separate:

```text
neo pack list
neo analyze MoneyMap
neo provider sync MoneyMap copilot
```

The diagnostic bridge can exercise an AI Command through:

```text
neo command "/package-selector for MoneyMap"
```
