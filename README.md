# Neo OrchestraX

**Version 0.1.0**

Neo OrchestraX is an AI development orchestration platform designed around a workspace containing the orchestration system and one or more projects.

## Primary interaction

```text
@package-selector
@package-install android-kotlin-dev
@context
@task start "Implement transaction history"
@handoff
@resume
```

For multiple projects:

```text
@package-selector for MoneyMap
@package-install android-kotlin-dev for <project-id or project-name>
```

Project resolution order:

1. Explicit project target
2. Current AI/task/project context
3. Single project in the workspace
4. Ask when ambiguous


## Workspace

```text
<workspace>/
├── neo-orchestrax/
├── Project/
├── AnotherProject/
└── ...
```

The existing `neo-devkit` prototype remains separate and untouched.

## V0.1.0

This release establishes the new foundation: workspace discovery, project targeting, command model.
