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
  +-- Syntra
  +-- Context Resolver
  +-- Tasks
  +-- Handoff / Resume
  +-- Provider Adapters
```

The user talks to Neo OrchestraX. Syntra is the internal persistent project-intelligence/context layer.

## Composition direction

V0.10 establishes effective instructions/rails. V0.11 adds role-oriented agents that consume those rails. V0.12 will add reusable skills. V0.13 will make packs explicit compositions of these components and resolve their dependency graph.
