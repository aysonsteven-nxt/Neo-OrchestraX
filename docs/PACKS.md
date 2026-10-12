# Pack Model

A **Pack** is a composable bundle of reusable AI development capabilities. V0.13 makes the dependency graph first-class instead of treating packs as flat metadata lists.

## Canonical metadata

```json
{
  "name": "android-kotlin-dev",
  "version": "0.2.0",
  "description": "Android and Kotlin development.",
  "capabilities": ["android", "kotlin", "jetpack-compose"],
  "instructions": [
    { "id": "common/coding-standards", "version": "^1.0.0", "required": true }
  ],
  "agents": [
    { "id": "android-dev", "version": "^1.0.0", "required": true }
  ],
  "skills": [
    { "id": "android-development", "version": "^1.0.0", "required": true }
  ],
  "dependencies": [],
  "compatibility": {
    "signals": ["android", "kotlin"]
  }
}
```

## Composition

A pack can compose:

- instructions / rails
- agents
- skills
- other packs through `dependencies`
- compatibility requirements

Dependencies use semantic-range forms already used by OrchestraX (`1.0.0`, `^1.0.0`, `~1.0.0`, `*`). Required dependencies fail validation when unavailable or incompatible. Optional dependencies are reported as warnings.

## Resolution

```text
Pack
 ├── Pack dependencies
 │    └── Pack dependencies ...
 ├── Instructions
 ├── Agents
 └── Skills
        ↓
 Dependency graph
        ↓
 Compatibility validation
        ↓
 Effective project resources
```

The resolver detects missing dependencies, version mismatches and circular pack dependencies. Pack composition does not hard-code provider behavior; provider artifacts remain generated from the canonical effective context.
