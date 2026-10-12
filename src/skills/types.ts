export type SkillSource = "default" | "user" | "workspace" | "project";
export interface SkillInstructionDependency { id:string; version:string; required:boolean; }
export interface SkillDefinition { id:string; version:string; description:string; category:string; capabilities:string[]; appliesToAgents:string[]; appliesTo:string[]; requiredInstructions:SkillInstructionDependency[]; overrideable:boolean; priority:number; source:SkillSource; content:string; sourcePath:string; }
export interface EffectiveSkill extends SkillDefinition { overridden?:SkillSource; }
export interface SkillResolution { skills:EffectiveSkill[]; conflicts:string[]; }
