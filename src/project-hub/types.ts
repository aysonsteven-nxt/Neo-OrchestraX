export interface ProjectHubPackContribution {
  id: string;
  version: string;
  installedAt: string;
}

export interface ProjectHubManifest {
  schema: "neo-orchestrax/project-hub@1";
  version: 1;
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  packs: ProjectHubPackContribution[];
}
