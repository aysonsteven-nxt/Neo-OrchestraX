export interface ProjectSignal {
  key: string;
  category: "platform" | "language" | "framework" | "build" | "dependency" | "architecture" | "structure";
  value: string;
  evidence: string;
}

export interface ProjectProfile {
  projectId: string;
  projectName: string;
  rootPath: string;
  signals: ProjectSignal[];
}
