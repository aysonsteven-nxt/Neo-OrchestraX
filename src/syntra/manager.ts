import crypto from "node:crypto";
import type { SyntraCategory, SyntraEntry, SyntraSourceType, SyntraStatus } from "./types.js";
import { addEntry, addEntryAt, readEntries, readEntriesAt, searchEntries, searchEntriesAt, updateEntry, updateEntryAt, workspaceSyntraRoot } from "./store.js";

export function createEntry(projectPath: string, input: {
  title: string; content: string; category: SyntraCategory;
  status?: SyntraStatus; confidence?: SyntraEntry["confidence"];
  sourceType?: SyntraSourceType; sourceReference?: string;
}): SyntraEntry {
  const now = new Date().toISOString();
  const entry: SyntraEntry = {
    id: crypto.randomUUID(), title: input.title, content: input.content,
    category: input.category, status: input.status ?? "draft",
    confidence: input.confidence ?? "medium",
    source: { type: input.sourceType ?? "user", reference: input.sourceReference },
    createdAt: now, updatedAt: now
  };
  addEntry(projectPath, entry);
  return entry;
}

export const listSyntra = (projectPath: string) => readEntries(projectPath);
export const listWorkspaceSyntra = (workspacePath: string) => readEntriesAt(workspaceSyntraRoot(workspacePath));
export const searchSyntra = (projectPath: string, query: string) => searchEntries(projectPath, query);
export const searchWorkspaceSyntra = (workspacePath: string, query: string) => searchEntriesAt(workspaceSyntraRoot(workspacePath), query);
export const changeSyntraStatus = (projectPath: string, id: string, status: SyntraStatus) => updateEntry(projectPath, id, { status });
export function createWorkspaceEntry(workspacePath: string, input: Parameters<typeof createEntry>[1]): SyntraEntry {
  const now = new Date().toISOString();
  const entry: SyntraEntry = { id: crypto.randomUUID(), title: input.title, content: input.content, category: input.category, status: input.status ?? "draft", confidence: input.confidence ?? "medium", source: { type: input.sourceType ?? "user", reference: input.sourceReference }, createdAt: now, updatedAt: now };
  addEntryAt(workspaceSyntraRoot(workspacePath), entry);
  return entry;
}
export const changeWorkspaceSyntraStatus = (workspacePath: string, id: string, status: SyntraStatus) => updateEntryAt(workspaceSyntraRoot(workspacePath), id, { status });
