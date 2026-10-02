# OrchestraX Commands

V0.2 establishes command parsing and routing for:

- `@package-selector`
- `@package-install <package>`
- `@context`
- `@task`
- `@handoff`
- `@resume`

Project targeting:

```text
@package-selector
@package-selector for MoneyMap
@package-install android-kotlin-dev
@package-install android-kotlin-dev for MoneyMap
```

The command engine resolves explicit targets first, then the single-project case. Multi-project ambiguity is reported instead of guessed.
