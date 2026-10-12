export interface PackMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  agents: string[];
  skills: string[];
}

export interface PackRecord extends PackMetadata {
  installed: boolean;
  sourcePath: string;
}
