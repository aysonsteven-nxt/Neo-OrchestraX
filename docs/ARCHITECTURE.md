# Architecture

```text
Neo OrchestraX
│
├── Workspace / Project Resolution
├── Packs
├── Project Intelligence
├── Instructions / Rails
│   ├── Defaults
│   ├── User
│   ├── Workspace
│   └── Project
├── Syntra
├── Context Resolver
├── Tasks
├── Handoff / Resume
└── Provider Adapters
```

Instructions are canonical OrchestraX configuration. Provider adapters consume the resolved instructions and generate provider-specific artifacts.
