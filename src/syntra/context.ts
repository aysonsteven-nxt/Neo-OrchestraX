import type { SyntraEntry } from "./types.js";
import { readEntries, searchEntries } from "./store.js";

export interface SyntraContext {
  entries: SyntraEntry[];
}

export function resolveSyntraContext(projectPath: string, query?: string): SyntraContext {
  const entries = query ? searchEntries(projectPath, query) : readEntries(projectPath);
  return { entries };
}
