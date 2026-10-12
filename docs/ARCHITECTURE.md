# Neo OrchestraX V0.6.0 Architecture

```text
Developer / AI Agent
        |
        | @context
        v
 Neo OrchestraX
        |
   Project Resolver
        |
        v
 Context Resolver
    /          \
Project       Syntra
Profile
    \          /
     \        /
      Focused Context
            |
            v
        AI Agent
```

The resolver is deliberately separate from Syntra.

Syntra stores persistent intelligence.

The Context Resolver decides what portion is relevant to the current request.
