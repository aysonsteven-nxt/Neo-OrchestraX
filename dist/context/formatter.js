export function formatContext(context) {
    const lines = [
        `Context: ${context.projectName}`,
        context.query ? `Query: ${context.query}` : "Query: project context",
        ""
    ];
    if (!context.items.length) {
        lines.push("No relevant context found.");
        return lines.join("\n");
    }
    for (const item of context.items) {
        lines.push(`[${item.source}] ${item.title} (${item.relevance}%)`);
        lines.push(`  ${item.content}`);
        if (item.reference)
            lines.push(`  ref: ${item.reference}`);
        lines.push("");
    }
    return lines.join("\n").trimEnd();
}
