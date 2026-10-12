# Neo OrchestraX

**Version 0.10.0**

V0.9 establishes provider adapters and provider-specific project artifacts while keeping OrchestraX canonical context provider-neutral.

Supported providers:
- GitHub Copilot
- Gemini / Antigravity
- Claude Code
- Cursor

```text
Project Intelligence + Syntra + Packs + Handoff
                    |
                    v
             Provider Adapter
              /  |  |  \
             v   v  v   v
         Copilot Gemini Claude Cursor
```

The user talks to **Neo OrchestraX**. Syntra remains the internal persistent project-intelligence layer; Handoff remains current session/work continuity.

Provider synchronization:

```text
@provider-sync
@provider-sync for MoneyMap
@provider-sync copilot for MoneyMap
```

CLI diagnostics:

```text
neo provider list
neo provider sync MoneyMap
neo provider sync MoneyMap copilot
```

Generated provider artifacts are managed by OrchestraX. Existing unmanaged files are never overwritten; synchronization reports collisions as skipped.

## V0.10 Instructions / Rails

OrchestraX now ships with default rails and resolves additional user, workspace, and project instructions into an effective instruction set. The defaults are configuration data rather than hard-coded decision logic.

```text
Default → User → Workspace → Project → Effective Rails → Provider Adapter
```

The common security baseline is non-overrideable. Other defaults can be extended or replaced when explicitly configured as overrideable.
