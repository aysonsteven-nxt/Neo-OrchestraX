export type PackDependencyKind = "pack" | "instruction" | "agent" | "skill";

export interface PackDependency {
  id: string;
  version: string;
  required: boolean;
}

export interface PackCompatibility {
  capabilities?: string[];
  signals?: string[];
  excludes?: string[];
}

export interface PackMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  instructions: PackDependency[];
  agents: PackDependency[];
  skills: PackDependency[];
  dependencies: PackDependency[];
  compatibility?: PackCompatibility;
}

export interface PackRecord extends PackMetadata {
  installed: boolean;
  sourcePath: string;
}

export interface PackDependencyIssue {
  kind: PackDependencyKind;
  id: string;
  version: string;
  required: boolean;
  message: string;
}

export interface ResolvedPack {
  pack: PackMetadata;
  sourcePath: string;
  dependencies: ResolvedPack[];
  issues: PackDependencyIssue[];
}

export interface PackGraphResolution {
  root: ResolvedPack;
  order: ResolvedPack[];
  issues: PackDependencyIssue[];
}
