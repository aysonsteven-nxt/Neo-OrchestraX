# Neo OrchestraX

**Version 0.8.0**

V0.8 adds Handoff / Resume continuity.

Handoff captures transferable current work state from the local OrchestraX task state. Resume restores the latest saved handoff for a project. Handoff is distinct from Syntra: Syntra stores persistent project intelligence, while Handoff stores current session/work continuity.

```text
@handoff
@handoff for MoneyMap
@resume
@resume for MoneyMap
```

OrchestraX does not inspect private provider conversations. Provider, agent, session, active-file, recent-change, decision, and constraint metadata are explicit handoff fields and are only populated when supplied by an integration or caller.
