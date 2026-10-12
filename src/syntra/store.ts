import fs from "node:fs";
import path from "node:path";
import type { SyntraEntry } from "./types.js";

export function syntraRoot(projectPath: string): string {
  return path.join(projectPath, ".orchestrax", "syntra");
}

function entriesFile(projectPath: string): string {
  return path.join(syntraRoot(projectPath), "entries.json");
}

export function initSyntra(projectPath: string): void {
  fs.mkdirSync(syntraRoot(projectPath), { recursive: true });
  if (!fs.existsSync(entriesFile(projectPath))) fs.writeFileSync(entriesFile(projectPath), "[]\n");
}

export function readEntries(projectPath: string): SyntraEntry[] {
  initSyntra(projectPath);
  try { return JSON.parse(fs.readFileSync(entriesFile(projectPath), "utf8")) as SyntraEntry[]; }
  catch { return []; }
}

export function writeEntries(projectPath: string, entries: SyntraEntry[]): void {
  initSyntra(projectPath);
  fs.writeFileSync(entriesFile(projectPath), JSON.stringify(entries, null, 2) + "\n");
}

export function addEntry(projectPath: string, entry: SyntraEntry): void {
  writeEntries(projectPath, [...readEntries(projectPath), entry]);
}

export function updateEntry(projectPath: string, id: string, patch: Partial<SyntraEntry>): SyntraEntry | undefined {
  const entries = readEntries(projectPath);
  const i = entries.findIndex(e => e.id === id);
  if (i < 0) return undefined;
  entries[i] = { ...entries[i], ...patch, updatedAt: new Date().toISOString() };
  writeEntries(projectPath, entries);
  return entries[i];
}

export function searchEntries(projectPath: string, query: string): SyntraEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return readEntries(projectPath).filter(e => {
    const haystack = [e.id, e.title, e.content, e.category, e.status].join(" ").toLowerCase();
    return terms.every(t => haystack.includes(t));
  });
}
