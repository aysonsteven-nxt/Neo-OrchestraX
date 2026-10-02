# Neo OrchestraX V0.1.0 Architecture

```text
Developer / AI Agent
        |
        | @commands
        v
 Neo OrchestraX
        |
  +-----+-------------------+
  |                         |
Project Resolver       Command Router
  |                         |
Projects               Agents / Packs
                            |
                     Context Resolver
                            |
                          Syntra
                            |
                Persistent project intelligence
```

Primary interface: AI prompt / agent interaction.
Secondary interface: CLI for bootstrap and diagnostics.

Canonical concepts:
Workspace, Project, Command, Agent, Pack, Context, Task, Handoff, Provider, Syntra.

Provider-specific artifacts are generated/adapted outputs, not canonical source definitions.
