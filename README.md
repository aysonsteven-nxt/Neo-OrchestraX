# Neo OrchestraX

**Version 0.3.0**

Neo OrchestraX is an AI development orchestration platform designed around a workspace containing the orchestration system and one or more projects.

## V0.3.0 — Pack System

V0.3 establishes the canonical Pack model and project-local pack lifecycle.

Built-in packs:

- `project-manager`
- `solutions-architect`
- `android-kotlin-dev`
- `java-dev`

Pack operations:

```text
neo pack list
neo pack validate android-kotlin-dev
neo pack install android-kotlin-dev MoneyMap
neo pack installed MoneyMap
neo pack remove android-kotlin-dev MoneyMap
```

The AI-facing command model includes:

```text
@package-selector
@package-install android-kotlin-dev
@package-list
@package-installed
@package-remove android-kotlin-dev
@package-validate android-kotlin-dev
```

For multiple projects:

```text
@package-install android-kotlin-dev for MoneyMap
```

## Syntra

Syntra remains internal to OrchestraX. It is not a command namespace.

## Project state

Installed packs are stored under:

```text
<project>/.orchestrax/packs/
```

The existing `neo-devkit` prototype remains untouched.
