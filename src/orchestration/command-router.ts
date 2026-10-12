import fs from "node:fs";
import path from "node:path";
import type { Project } from "../workspace/types.js";
import { resolveProject, type ResolutionResult } from "../workspace/project-resolver.js";
import { findCommand, loadCommands } from "../commands/registry.js";
import type { AiCommandDefinition } from "../commands/types.js";
import { parseCommand, type ParsedCommand } from "./command-parser.js";
import { isOrchestraXDirectory } from "../workspace/discovery.js";

export interface CommandResult {
  ok: boolean;
  command: ParsedCommand;
  definition?: AiCommandDefinition;
  message: string;
  project?: Project;
  candidates?: Project[];
  warning?: string;
}

function resolutionMessage(resolution: ResolutionResult): string {
  switch (resolution.status) {
    case "ambiguous": return "Project target is ambiguous. Specify: for <project>";
    case "none": return "No project was discovered in the workspace.";
    case "not-found": return "The requested project was not found in the workspace.";
    default: return "";
  }
}

export function routeCommand(input: string, projects: Project[], commandsRoot?: string, workspaceRoot?: string, orchestraxRoot?: string): CommandResult {
  const command = parseCommand(input);
  const commands = loadCommands(commandsRoot ?? "commands");
  const definition = findCommand(commands, command.name);

  if (!definition) {
    return {
      ok: false,
      command,
      message: `Unknown OrchestraX AI command: ${command.prefix}${command.name}`
    };
  }

  if (definition.target === "none") {
    return {
      ok: true,
      command,
      definition,
      message: `${command.prefix}${command.name}`,
      warning: command.legacy ? "@command is accepted for backward compatibility; use /command as the canonical OrchestraX AI syntax." : undefined
    };
  }

  if (definition.target === "optional" && !command.project) {
    return {
      ok: true,
      command,
      definition,
      message: `${command.prefix}${command.name}`,
      warning: command.legacy ? "@command is accepted for backward compatibility; use /command as the canonical OrchestraX AI syntax." : undefined
    };
  }

  const resolution = resolveProject(projects, command.project);
  if (resolution.status !== "resolved") {
    if (resolution.status === "not-found" && command.project) {
      const requested = command.project.trim().replace(/^['"]|['"]$/g, "");
      const roots = [
        workspaceRoot ? path.resolve(workspaceRoot) : undefined,
        orchestraxRoot ? path.dirname(path.resolve(orchestraxRoot)) : undefined
      ].filter((root): root is string => Boolean(root));

      for (const root of roots) {
        const candidatePath = path.isAbsolute(requested)
          ? path.normalize(requested)
          : path.resolve(root, requested);
        const rootResolved = path.resolve(root);
        const candidateResolved = path.resolve(candidatePath);
        const withinRoot = candidateResolved !== rootResolved
          && candidateResolved.startsWith(`${rootResolved}${path.sep}`);
        const candidateIsOrchestraX = isOrchestraXDirectory(candidateResolved);

        if (withinRoot && !candidateIsOrchestraX && fs.existsSync(candidateResolved) && fs.statSync(candidateResolved).isDirectory()) {
          const explicitProject: Project = {
            id: path.basename(candidateResolved),
            name: path.basename(candidateResolved),
            path: candidateResolved
          };
          return {
            ok: true,
            command,
            definition,
            project: explicitProject,
            message: `${command.prefix}${command.name} → ${explicitProject.name}`,
            warning: command.legacy
              ? "@command is accepted for backward compatibility; use /command as the canonical OrchestraX AI syntax."
              : undefined
          };
        }
      }
    }

    return {
      ok: false,
      command,
      definition,
      message: resolutionMessage(resolution),
      candidates: resolution.candidates
    };
  }

  return {
    ok: true,
    command,
    definition,
    project: resolution.project,
    message: `${command.prefix}${command.name} → ${resolution.project?.name}`,
    warning: command.legacy ? "@command is accepted for backward compatibility; use /command as the canonical OrchestraX AI syntax." : undefined
  };
}
