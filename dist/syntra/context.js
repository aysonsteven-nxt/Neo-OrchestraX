import { readEntries, searchEntries } from "./store.js";
export function resolveSyntraContext(projectPath, query) {
    const entries = query ? searchEntries(projectPath, query) : readEntries(projectPath);
    return { entries };
}
