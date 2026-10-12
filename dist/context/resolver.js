import { analyzeProject } from "../analyzer/project-analyzer.js";
import { searchSyntra, listSyntra, searchWorkspaceSyntra, listWorkspaceSyntra } from "../syntra/manager.js";
function scoreText(query, entry) {
    if (!query?.trim())
        return 50;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = `${entry.title} ${entry.content} ${entry.category}`.toLowerCase();
    const matches = terms.filter(t => haystack.includes(t)).length;
    return Math.min(100, Math.round((matches / terms.length) * 100));
}
function governanceWeight(entry) {
    switch (entry.status) {
        case "confirmed": return 20;
        case "review": return 10;
        case "draft": return 0;
        case "rejected": return -50;
        case "superseded": return -40;
    }
}
export function resolveContext(project, query, workspaceRoot) {
    const profile = analyzeProject(project);
    const projectEntries = query ? searchSyntra(project.path, query) : listSyntra(project.path);
    const workspaceEntries = workspaceRoot ? (query ? searchWorkspaceSyntra(workspaceRoot, query) : listWorkspaceSyntra(workspaceRoot)) : [];
    const sourceEntries = [...workspaceEntries.map(entry => ({ ...entry, title: `[workspace] ${entry.title}` })), ...projectEntries];
    const items = [
        ...profile.signals.map(signal => ({
            source: "project-profile",
            relevance: 80,
            title: signal.value,
            content: signal.evidence,
            reference: signal.key
        })),
        ...sourceEntries
            .map(entry => ({
            source: "syntra",
            relevance: Math.max(0, Math.min(100, scoreText(query, entry) + governanceWeight(entry))),
            title: entry.title,
            content: entry.content,
            reference: entry.id
        }))
            .filter(item => item.relevance > 0)
    ];
    items.sort((a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title));
    return {
        projectId: project.id,
        projectName: project.name,
        query,
        items
    };
}
