export type SyntraStatus = "draft" | "review" | "confirmed" | "rejected" | "superseded";
export type SyntraSourceType = "user" | "agent" | "file" | "command" | "handoff";
export type SyntraCategory = "project" | "architecture" | "knowledge" | "decision" | "requirement" | "constraint" | "problem" | "work";

export interface SyntraSource {
  type: SyntraSourceType;
  reference?: string;
}

export interface SyntraEntry {
  id: string;
  title: string;
  content: string;
  category: SyntraCategory;
  status: SyntraStatus;
  confidence: "high" | "medium" | "low";
  source: SyntraSource;
  createdAt: string;
  updatedAt: string;
}
