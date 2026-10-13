import type { EffectiveAgent } from "../types.js";
import type { Project } from "../../workspace/types.js";

export interface AgentExecutionPayload {
  schema: "neo-orchestrax/story-analysis@1";
  project: { id: string; name: string; path: string };
  storyId: string;
  agent: {
    id: string;
    version: string;
    role: string;
    capabilities: string[];
    instructions: string;
  };
  requiredInstructions: Array<{ id: string; version: string; content: string }>;
  skills: Array<{ id: string; version: string; category: string; content: string }>;
  storyContext: Record<string, unknown>;
  constraints: string[];
}

export interface AgentExecutionRequest {
  agent: EffectiveAgent;
  project: Project;
  workspaceRoot: string;
  storyId: string;
  prompt: string;
  payload: AgentExecutionPayload;
}

export interface AgentExecutionResult {
  ok: boolean;
  response?: string;
  error?: string;
  exitCode?: number | null;
  durationMs?: number;
}

/** Provider-neutral boundary for running an agent. Implementations must honor their configured execution policy. */
export interface AgentExecutor {
  readonly id: string;
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
}

export interface CommandAgentExecutorDefinition {
  id: string;
  kind: "command";
  description?: string;
  command: string;
  args: string[];
  inputMode: "stdin" | "argument";
  /** Must be true only after the operator has independently verified OS-enforced read-only isolation. */
  readOnlyVerified: boolean;
  timeoutMs?: number;
  maxOutputBytes?: number;
  env?: Record<string, string>;
}

export interface AgentExecutorConfiguration {
  schema: "neo-orchestrax/agent-executors@1";
  defaultExecutor?: string;
  executors: CommandAgentExecutorDefinition[];
}
