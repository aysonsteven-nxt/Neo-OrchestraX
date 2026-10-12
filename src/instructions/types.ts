export type InstructionSource = "default" | "user" | "workspace" | "project";

export interface InstructionDefinition {
  id: string;
  version: string;
  description: string;
  category: string;
  appliesTo: string[];
  required: boolean;
  overrideable: boolean;
  priority: number;
  source: InstructionSource;
  content: string;
  sourcePath: string;
}

export interface EffectiveInstruction extends InstructionDefinition {
  overridden?: string;
}

export interface InstructionResolution {
  instructions: EffectiveInstruction[];
  conflicts: string[];
}
