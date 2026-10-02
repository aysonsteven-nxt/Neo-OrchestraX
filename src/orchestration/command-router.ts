import type { Project } from "../index.js";
import { parseCommand, type ParsedCommand } from "./command-parser.js";
import { resolveProject } from "../workspace/project-resolver.js";

export interface CommandResult {
  ok: boolean;
  command: ParsedCommand;
  message: string;
  project?: Project;
  candidates?: Project[];
}

const supported = new Set([
  "package-selector",
  "package-install",
  "context",
  "task",
  "handoff",
  "resume"
]);

export function routeCommand(input: string, projects: Project[]): CommandResult {
  const command = parseCommand(input);

  if (!supported.has(command.name)) {
    return {
      ok: false,
      command,
      message: `Unknown OrchestraX command: @${command.name}`
    };
  }

  const resolution = resolveProject(projects, command.project);

  if (resolution.status === "resolved") {
    return {
      ok: true,
      command,
      project: resolution.project,
      message: `@${command.name} → ${resolution.project?.name}`
    };
  }

  if (resolution.status === "ambiguous") {
    return {
      ok: false,
      command,
      candidates: resolution.candidates,
      message: "Project target is ambiguous. Specify: for <project>"
    };
  }

  if (resolution.status === "none") {
    return {
      ok: false,
      command,
      message: "No project was discovered in the workspace."
    };
  }

  return {
    ok: false,
    command,
    message: `Project "${command.project}" was not found in the workspace.`
  };
}
