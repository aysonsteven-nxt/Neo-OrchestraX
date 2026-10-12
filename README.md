# Neo OrchestraX

**Version 0.6.0**

Neo OrchestraX is an AI development orchestration platform for workspace-based AI-assisted software development.

## V0.6.0 — Context Resolver

V0.6 adds focused context resolution.

Instead of giving an agent the entire project knowledge store, OrchestraX can resolve relevant context from:

- Project Profile
- Syntra
- optional task/query text

Example:

```text
@context
```

or:

```text
@context for MoneyMap
```

Diagnostic CLI:

```text
neo context MoneyMap
neo context MoneyMap authentication
```

Syntra remains an internal subsystem. There is no `@syntra` command.

The existing `neo-devkit` prototype remains untouched.
