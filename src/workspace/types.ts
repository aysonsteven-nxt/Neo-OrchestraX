export interface Project {
  id: string;
  name: string;
  path: string;
}

export interface Workspace {
  root: string;
  orchestraxRoot: string;
  installationRoot: string;
  configPath?: string;
  initialized: boolean;
  scope: "workspace" | "project" | "legacy";
  projects: Project[];
  folderRoots?: string[];
  workspaceFile?: string;
}
