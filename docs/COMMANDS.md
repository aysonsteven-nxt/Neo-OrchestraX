# OrchestraX Command Model

## Single project

```text
@package-selector
@package-install <package>
@context
@task start "<objective>"
@handoff
@resume
```

## Multiple projects

```text
@package-selector for <project>
@package-install <package> for <project>
@context for <project>
@task start "<objective>" for <project>
@handoff for <project>
@resume for <project>
```

The project qualifier is optional whenever OrchestraX can resolve the target unambiguously.

The user interacts with Neo OrchestraX. Syntra is internal.
