export type AiCommandTargetMode = "required" | "optional" | "none";

export type AiCommandHandler =
  | "package-selector"
  | "package-install"
  | "package-list"
  | "package-installed"
  | "package-remove"
  | "package-validate"
  | "context"
  | "task"
  | "handoff"
  | "resume"
  | "provider-sync"
  | "instructions"
  | "agents"
  | "agent"
  | "skills"
  | "skill"
  | "pack";

export interface AiCommandDefinition {
  id: string;
  version: string;
  description: string;
  argumentHint?: string;
  usage: string;
  handler: AiCommandHandler;
  target: AiCommandTargetMode;
  prompt: string;
  sourcePath: string;
}
