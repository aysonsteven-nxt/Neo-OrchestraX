# Neo OrchestraX

**Version 0.4.0**

Neo OrchestraX is an AI development orchestration platform designed around a workspace containing the orchestration system and one or more projects.

## V0.4.0 — Intelligent Pack Selector

V0.4 introduces:

- deterministic project analysis
- Project Profile
- technology/framework/dependency signals
- Pack capability matching
- Pack recommendations
- relevance scores with evidence

CLI:

```text
neo analyze MoneyMap
neo pack recommend MoneyMap
```

AI-facing command:

```text
@package-selector
@package-selector for MoneyMap
```

Example output:

```text
Project Analysis: MoneyMap
✓ Android
✓ Kotlin
✓ Jetpack Compose
✓ Gradle
✓ Room
✓ Hilt

Pack Recommendations:
android-kotlin-dev  100%
solutions-architect 80%
project-manager      70%
```

Scores represent technical relevance/match, not quality.

Syntra remains an internal subsystem and is not exposed as a command.
