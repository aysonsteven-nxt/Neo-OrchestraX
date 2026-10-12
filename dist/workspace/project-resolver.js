export function resolveProject(projects, explicitTarget) {
    if (explicitTarget) {
        const target = explicitTarget.trim().toLowerCase();
        const matches = projects.filter(p => p.id.toLowerCase() === target || p.name.toLowerCase() === target);
        if (matches.length === 1) {
            return { status: "resolved", project: matches[0], reason: "explicit-target" };
        }
        if (matches.length > 1) {
            return { status: "ambiguous", candidates: matches, reason: "explicit-target-ambiguous" };
        }
        return { status: "not-found", reason: "explicit-target-not-found" };
    }
    if (projects.length === 1) {
        return { status: "resolved", project: projects[0], reason: "single-project" };
    }
    if (projects.length > 1) {
        return { status: "ambiguous", candidates: projects, reason: "multiple-projects" };
    }
    return { status: "none", reason: "no-projects" };
}
