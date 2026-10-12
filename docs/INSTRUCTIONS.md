# Instructions / Rails

Instructions are OrchestraX's default rails: reusable rules, standards, conventions, and project guidance that can be layered without embedding them in orchestration code.

```text
OrchestraX Defaults
        ↓
      User
        ↓
    Workspace
        ↓
     Project
        ↓
 Effective Rails
```

Use `overrideable: false` for a rule that must remain authoritative across lower-level configuration. Use `required: true` to identify a required rail for a consuming component; it does not by itself make the instruction non-overrideable.

Instruction content is stored in `instruction.md`; metadata is stored in `instruction.json`.
