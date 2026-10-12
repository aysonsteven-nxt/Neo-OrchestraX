export interface Handoff {
  id: string;
  projectId: string;
  taskId?: string;
  title: string;
  objective: string;
  taskStatus?: string;
  completedWork: string[];
  inProgressWork: string[];
  openQuestions: string[];
  knownProblems: string[];
  nextAction?: string;
  activeFiles: string[];
  recentChanges: string[];
  decisions: string[];
  constraints: string[];
  provider?: string;
  agent?: string;
  session?: string;
  createdAt: string;
}
