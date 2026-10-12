# Neo OrchestraX

**Version 0.7.0**

V0.7 adds the Task / Workflow foundation.

Tasks track objectives, status, relevant packs, context, completed/in-progress work, questions, problems, and next action.

```text
@task start "Implement transaction history"
@task start "Implement transaction history" for MoneyMap
```

Task context is resolved through the Context Resolver using task information, Project Profile, and Syntra.

Syntra remains an internal subsystem and is not a command namespace.
