# Commands

AI-facing commands are handled by Neo OrchestraX:

```text
@package-selector
@package-install android-kotlin-dev for MoneyMap
@context for MoneyMap
@task start "Transaction history" for MoneyMap
@handoff
@handoff for MoneyMap
@resume
@instructions for MoneyMap
@agents for MoneyMap
@agent android-dev for MoneyMap
```

Syntra is internal and has no `@syntra` command.

Provider integration:

```text
@provider-sync
@provider-sync for MoneyMap
@provider-sync copilot for MoneyMap
```

## Skills

- `@skills` — show effective skills
- `@skill <id>` — show a specific skill
- `@skills for <project>` — target a project
- `@skill <id> for <project>` — target a project
