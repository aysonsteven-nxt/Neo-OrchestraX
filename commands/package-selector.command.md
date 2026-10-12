---
id: package-selector
version: 1.0.0
description: Select the most relevant OrchestraX pack or packs for the target project and current task.
argument-hint: "[task or goal] for <project>"
usage: /package-selector [task or goal] [for <project>]
handler: package-selector
target: required
---
Use the OrchestraX Pack Selector for the resolved project. Consider Project Intelligence, technology signals, existing installed packs, pack capabilities, pack compatibility, and resolved dependencies. Return ranked recommendations with technical relevance evidence. Do not treat the score as a quality rating.
