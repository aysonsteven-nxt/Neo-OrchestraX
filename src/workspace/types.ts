export interface Project {
  id: string;
  name: string;
  path: string;
}

export interface Workspace {
  root: string;
  orchestraxRoot: string;
  projects: Project[];
}
