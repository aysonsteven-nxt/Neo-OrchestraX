# Neo OrchestraX

**Version 0.2.0**

Neo OrchestraX is an AI development orchestration platform designed around a workspace containing the orchestration system and one or more projects.

## V0.2.0 — Command Engine

V0.2 establishes the first real OrchestraX interaction layer:

- command parsing
- command routing
- explicit project targeting
- single-project resolution
- multi-project ambiguity handling
- supported command catalog

Supported commands:

```text
@package-selector
@package-install <package>
@context
@task
@handoff
@resume
```

Project targeting:

```text
@package-selector for MoneyMap
@package-install android-kotlin-dev for MoneyMap
```

Target resolution:

1. Explicit `for <project>` target
2. Single project in workspace
3. Ambiguous multi-project workspace → ask for a target
4. No project → report no project

## Syntra

Syntra remains an internal subsystem. It is not a user-facing command namespace.

## CLI

The CLI is still secondary and is used here for command diagnostics:

```text
neo command "@package-selector"
neo command "@package-install android-kotlin-dev for MoneyMap"
```

## Existing prototype

The old `neo-devkit` repository is not part of this project and should remain untouched.
