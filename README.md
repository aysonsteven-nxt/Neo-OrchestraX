# Neo OrchestraX

**Version 0.13.1**

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
/provider-sync
/provider-sync for MoneyMap
/provider-sync copilot for MoneyMap
```

CLI diagnostics:

```text
neo provider list
neo provider sync MoneyMap
neo provider sync MoneyMap copilot
neo provider sync-user copilot
```

Generated provider artifacts are managed by OrchestraX. Existing unmanaged files are never overwritten; synchronization reports collisions as skipped.

## V0.10 Instructions / Rails

OrchestraX now ships with default rails and resolves additional user, workspace, and project instructions into an effective instruction set. The defaults are configuration data rather than hard-coded decision logic.

```text
Default → User → Workspace → Project → Effective Rails → Provider Adapter
```

The common security baseline is non-overrideable. Other defaults can be extended or replaced when explicitly configured as overrideable.

## V0.11 Agents

Agents are role-oriented components layered on top of the effective V0.10 rails. OrchestraX ships with `java-dev`, `android-dev`, `web-angular-dev`, and `web-vanilla-dev`. Agents declare instruction dependencies rather than duplicating the rails. User, workspace, and project agent definitions can be layered and resolved similarly to instructions.

```text
Default Rails → Effective Rails → Agent → Provider Adapter
```

AI-facing commands:

```text
/agents
/agents for MoneyMap
/agent java-dev for MoneyMap
```

## V0.12 Skills

Skills are reusable capabilities mapped to Agents. OrchestraX ships default skills for Java, Android, Angular and vanilla web development, with user, workspace and project layers available for customization.

```text
Default Rails → Agent → Skills → Provider Adapter
```

AI-facing commands:

```text
/skills
/skills for MoneyMap
/skill compose-development for MoneyMap
```


## V0.13 Pack Composition

Packs are now composable dependency graphs. A pack can declare instructions, agents, skills, other pack dependencies and compatibility requirements. OrchestraX resolves versions, detects missing or circular dependencies, and validates a pack against the selected project's effective resources.

CLI diagnostics:

```text
neo pack show android-kotlin-dev
neo pack graph android-kotlin-dev
neo pack validate android-kotlin-dev
neo pack compose android-kotlin-dev MoneyMap
```

## V0.13.1 Command UX / Copilot Slash Actions

OrchestraX now uses `/` as its canonical AI-facing command syntax. The parser still accepts the older `@` syntax for backward compatibility.

Core actions include:

```text
/package-selector for MoneyMap
/package-install android-kotlin-dev for MoneyMap
/context for MoneyMap
/handoff for MoneyMap
/resume for MoneyMap
```

For GitHub Copilot Agent Host, OrchestraX can project these actions into user-level Agent Skills, which Copilot exposes as slash commands. Run:

```text
neo provider sync-user copilot
```

The canonical OrchestraX definitions remain inside `neo-orchestrax`; the user-level files are provider projections and are safely collision-checked.
