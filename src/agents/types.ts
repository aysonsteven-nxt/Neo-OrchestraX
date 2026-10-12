export type AgentSource = "default" | "user" | "workspace" | "project";
export interface AgentInstructionDependency { id:string; version:string; required:boolean; }
export interface AgentSkillDependency { id:string; version:string; required:boolean; }
export interface AgentDefinition { id:string; version:string; description:string; role:string; capabilities:string[]; appliesTo:string[]; requiredInstructions:AgentInstructionDependency[]; skills:AgentSkillDependency[]; overrideable:boolean; priority:number; source:AgentSource; content:string; sourcePath:string; }
export interface EffectiveAgent extends AgentDefinition { overridden?:AgentSource; resolvedInstructions:Array<{id:string;version:string;required:boolean;available:boolean;source?:string}>; resolvedSkills:Array<{id:string;version:string;required:boolean;available:boolean;source?:string}>; }
export interface AgentResolution { agents:EffectiveAgent[]; conflicts:string[]; }
