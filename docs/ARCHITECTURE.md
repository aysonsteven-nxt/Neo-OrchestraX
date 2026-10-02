# Neo OrchestraX V0.2.0 Architecture

```text
Developer / AI Agent
        |
        | @command
        v
 Command Parser
        |
        v
 Command Router
        |
        v
 Project Resolver
        |
   +----+----+
   |         |
resolved   ambiguous
   |         |
   v         v
Handler    ask user
   |
   +-----------------------------+
   |             |               |
 Agents        Packs           Context
                                  |
                                Syntra
```

The command layer is intentionally provider-neutral. Copilot, Gemini/Antigravity, Claude Code, Cursor, or another agent provider can eventually invoke the same canonical OrchestraX command model.
