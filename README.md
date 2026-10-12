# Neo OrchestraX

**Version 0.5.0**

Neo OrchestraX is an AI development orchestration platform for workspace-based AI-assisted software development.

## V0.5.0 — Syntra

**Syntra** is the internal persistent project-intelligence and context storage subsystem.

It stores structured information such as:

- project knowledge
- architecture
- decisions
- requirements
- constraints
- known problems
- work state

Each entry includes provenance, confidence and governance status.

### Important boundary

The developer talks to **Neo OrchestraX**, not Syntra.

Use:

```text
@context
@context for MoneyMap
```

Not:

```text
@syntra
```

Project-local storage:

```text
MoneyMap/
└── .orchestrax/
    └── syntra/
        └── entries.json
```

The existing `neo-devkit` prototype remains untouched.
