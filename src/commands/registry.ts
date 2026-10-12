export interface OrchestraCommandDefinition {
  name: string;
  description: string;
  argumentHint?: string;
}

/**
 * Canonical user-facing OrchestraX actions.
 * The command router is the source of truth; providers project these actions
 * into provider-native invocation mechanisms.
 */
export const orchestraCommands: OrchestraCommandDefinition[] = [
  { name: "package-selector", description: "Recommend the most relevant OrchestraX packs for the target project.", argumentHint: "[for <project>]" },
  { name: "package-install", description: "Install an OrchestraX pack and its required dependencies for the target project.", argumentHint: "<pack> [for <project>]" },
  { name: "package-list", description: "List available OrchestraX packs." },
  { name: "package-installed", description: "List OrchestraX packs installed in the target project.", argumentHint: "for <project>" },
  { name: "package-remove", description: "Remove an installed OrchestraX pack from the target project.", argumentHint: "<pack> for <project>" },
  { name: "package-validate", description: "Validate an OrchestraX pack definition.", argumentHint: "<pack>" },
  { name: "context", description: "Resolve relevant OrchestraX project context for the current task.", argumentHint: "[query] [for <project>]" },
  { name: "task", description: "Create, inspect, or update OrchestraX task state.", argumentHint: "<action> ... [for <project>]" },
  { name: "handoff", description: "Create or inspect a transferable OrchestraX work handoff.", argumentHint: "[for <project>]" },
  { name: "resume", description: "Resume from the latest OrchestraX handoff.", argumentHint: "[for <project>]" },
  { name: "instructions", description: "Inspect effective OrchestraX rails / instructions.", argumentHint: "[<instruction-id>] [for <project>]" },
  { name: "agents", description: "Inspect effective OrchestraX agents.", argumentHint: "[for <project>]" },
  { name: "agent", description: "Inspect one OrchestraX agent.", argumentHint: "<agent-id> [for <project>]" },
  { name: "skills", description: "Inspect effective OrchestraX skills.", argumentHint: "[for <project>]" },
  { name: "skill", description: "Inspect one OrchestraX skill.", argumentHint: "<skill-id> [for <project>]" },
  { name: "provider-sync", description: "Synchronize effective OrchestraX context to a provider.", argumentHint: "[provider] [for <project>]" },
  { name: "pack", description: "Inspect or compose an OrchestraX pack dependency graph.", argumentHint: "<action> ... [for <project>]" }
];

const commandMap = new Map(orchestraCommands.map(command => [command.name, command]));

export function getCommandDefinition(name: string): OrchestraCommandDefinition | undefined {
  return commandMap.get(name.toLowerCase());
}
