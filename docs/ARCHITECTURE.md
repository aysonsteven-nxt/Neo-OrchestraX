# Architecture

Neo OrchestraX is a workspace-first, provider-neutral AI development orchestration layer.

```text
Workspace
  |
  +-- Project Intelligence
  +-- Packs
  +-- Instructions / Rails
  |       |
  |       +-- Default
  |       +-- User
  |       +-- Workspace
  |       +-- Project
  |
  +-- Agents
  |       |
  |       +-- Default
  |       +-- User
  |       +-- Workspace
  |       +-- Project
  |       |
  |       +-- Instruction dependencies
  |
  +-- Skills
  +-- Syntra
  +-- Context Resolver
  +-- Tasks
  +-- Handoff / Resume
  +-- AI Commands                <-- PRIMARY interface
  |       |
  |       +-- canonical /command syntax
  |       +-- command definitions under commands/
  |       +-- command router / handlers
  |
  +-- CLI                         <-- SECONDARY interface
  |
  +-- Provider Adapters
          |
          +-- Copilot
          +-- Gemini / Antigravity
          +-- Claude Code
          +-- Cursor
```

## Canonical source of truth

The following remain provider-neutral and live inside Neo OrchestraX:

- agents/
- skills/
- instructions/
- commands/
- packs/
- Syntra/project intelligence

Provider adapters do not redefine these concepts. They only translate or expose them using provider-native mechanisms.

## AI Commands versus CLI

AI Commands are not CLI commands.

```text
AI conversation
    |
    v
AI Command Router
    |
    v
OrchestraX subsystem
```

versus:

```text
terminal
    |
    v
CLI Router
    |
    v
OrchestraX subsystem
```

Both may call the same domain services, but their interfaces remain separate.

## Provider abstraction

```text
                 Neo OrchestraX Core
                        |
                 Canonical AI Command
                        |
          +-------------+-------------+
          |             |             |
       Copilot       Gemini        Claude
       adapter       adapter       adapter
          |             |             |
          +-------------+-------------+
                        |
                provider-native surface
```

The core never requires a specific provider invocation syntax.
