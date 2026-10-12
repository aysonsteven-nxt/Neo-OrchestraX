import crypto from "node:crypto";
import { addEntry, addEntryAt, readEntries, readEntriesAt, searchEntries, searchEntriesAt, updateEntry, updateEntryAt, workspaceSyntraRoot } from "./store.js";
export function createEntry(projectPath, input) {
    const now = new Date().toISOString();
    const entry = {
        id: crypto.randomUUID(), title: input.title, content: input.content,
        category: input.category, status: input.status ?? "draft",
        confidence: input.confidence ?? "medium",
        source: { type: input.sourceType ?? "user", reference: input.sourceReference },
        createdAt: now, updatedAt: now
    };
    addEntry(projectPath, entry);
    return entry;
}
export const listSyntra = (projectPath) => readEntries(projectPath);
export const listWorkspaceSyntra = (workspacePath) => readEntriesAt(workspaceSyntraRoot(workspacePath));
export const searchSyntra = (projectPath, query) => searchEntries(projectPath, query);
export const searchWorkspaceSyntra = (workspacePath, query) => searchEntriesAt(workspaceSyntraRoot(workspacePath), query);
export const changeSyntraStatus = (projectPath, id, status) => updateEntry(projectPath, id, { status });
export function createWorkspaceEntry(workspacePath, input) {
    const now = new Date().toISOString();
    const entry = { id: crypto.randomUUID(), title: input.title, content: input.content, category: input.category, status: input.status ?? "draft", confidence: input.confidence ?? "medium", source: { type: input.sourceType ?? "user", reference: input.sourceReference }, createdAt: now, updatedAt: now };
    addEntryAt(workspaceSyntraRoot(workspacePath), entry);
    return entry;
}
export const changeWorkspaceSyntraStatus = (workspacePath, id, status) => updateEntryAt(workspaceSyntraRoot(workspacePath), id, { status });
