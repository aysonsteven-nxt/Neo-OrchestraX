import type { AiCommandDefinition } from "../commands/types.js";

export type ProviderId = "copilot" | "gemini" | "claude" | "cursor";

export type ProviderCommandExposure =
  | "native"
  | "projected"
  | "adapter-defined"
  | "unsupported";

export interface ProviderCapabilities {
  context: boolean;
  instructions: boolean;
  agents: boolean;
  skills: boolean;
  aiCommands: ProviderCommandExposure;
}

export interface ProviderCommandProjection {
  commandId: string;
  exposure: ProviderCommandExposure;
  invocation?: string;
  notes?: string;
}

export interface ProviderArtifact {
  relativePath: string;
  content: string;
}

export interface ProviderAdapter {
  id: ProviderId;
  name: string;
  description: string;
  capabilities: ProviderCapabilities;
  generate(project: { id: string; name: string; path: string }, context: ProviderContext): ProviderArtifact[];
  projectCommands(commands: AiCommandDefinition[]): ProviderCommandProjection[];
}

export interface ProviderContext {
  projectProfile: {
    signals: Array<{ category: string; value: string; evidence: string }>;
  };
  installedPacks: string[];
  instructions: Array<{ id: string; version: string; category: string; source: string; required: boolean; content: string }>;
  skills: Array<{ id: string; version: string; category: string; source: string; capabilities: string[]; appliesToAgents: string[]; content: string }>;
  agents: Array<{ id: string; version: string; role: string; source: string; capabilities: string[]; content: string; requiredInstructions: Array<{ id: string; version: string; required: boolean; available: boolean }>; resolvedSkills: Array<{ id: string; version: string; required: boolean; available: boolean; source?: string }> }>;
  syntra: Array<{ title: string; content: string; category: string; status: string }>;
  latestHandoff?: {
    title: string;
    objective: string;
    nextAction?: string;
  };
}
