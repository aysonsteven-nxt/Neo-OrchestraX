function tokenize(input) {
    return input.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(token => token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token) ?? [];
}
export function parseCommand(input) {
    const raw = input.trim();
    const match = raw.match(/^([/@])(\S+)(?:\s+([\s\S]*))?$/);
    if (!match) {
        throw new Error("Invalid OrchestraX AI command. Commands use the /command syntax.");
    }
    const prefix = match[1];
    const name = match[2];
    let remainder = (match[3] ?? "").trim();
    let project;
    // Canonical targeting: /command ... for <project>
    const projectMatch = remainder.match(/(?:^|\s+)for\s+(.+)$/i);
    if (projectMatch) {
        project = projectMatch[1].trim();
        remainder = remainder.slice(0, projectMatch.index ?? 0).trim();
    }
    return {
        name,
        args: tokenize(remainder),
        project,
        raw,
        prefix,
        legacy: prefix === "@"
    };
}
