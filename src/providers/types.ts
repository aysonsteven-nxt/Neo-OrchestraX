export type ProviderId = "copilot" | "gemini" | "claude" | "cursor";

export interface ProviderArtifact {
  relativePath: string;
  content: string;
}

export interface ProviderAdapter {
  id: ProviderId;
  name: string;
  description: string;
  generate(project: { id: string; name: string; path: string }, context: ProviderContext): ProviderArtifact[];
}

export interface ProviderContext {
  projectProfile: {
    signals: Array<{ category: string; value: string; evidence: string }>;
  };
  installedPacks: string[];
  instructions: Array<{ id: string; version: string; category: string; source: string; required: boolean; content: string }>;
  syntra: Array<{ title: string; content: string; category: string; status: string }>;
  latestHandoff?: {
    title: string;
    objective: string;
    nextAction?: string;
  };
}
