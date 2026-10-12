import type { ProjectProfile } from "../analyzer/types.js";
import type { SyntraEntry } from "../syntra/types.js";

export type ContextSource = "project-profile" | "syntra" | "task" | "file";

export interface ContextItem {
  source: ContextSource;
  relevance: number;
  title: string;
  content: string;
  reference?: string;
}

export interface ResolvedContext {
  projectId: string;
  projectName: string;
  query?: string;
  items: ContextItem[];
  profile?: ProjectProfile;
}
