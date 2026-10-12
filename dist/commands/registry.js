import fs from "node:fs";
import path from "node:path";
const FILE_PATTERN = /^(.*)\.command\.md$/;
const VALID_HANDLERS = new Set([
    "package-selector", "package-install", "package-list", "package-installed",
    "package-remove", "package-validate", "context", "task", "handoff", "resume",
    "provider-sync", "instructions", "agents", "agent", "skills", "skill", "pack"
]);
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match)
        return { metadata: {}, body: content.trim() };
    const metadata = {};
    for (const line of match[1].split(/\r?\n/)) {
        const separator = line.indexOf(":");
        if (separator < 0)
            continue;
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
        if (key)
            metadata[key] = value;
    }
    return { metadata, body: match[2].trim() };
}
function parseCommandFile(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const { metadata, body } = parseFrontmatter(source);
    const fileName = path.basename(filePath).replace(FILE_PATTERN, "$1");
    const id = metadata.id || fileName;
    const handler = metadata.handler || id;
    const target = metadata.target || "required";
    if (!id.trim())
        throw new Error(`Command file has no id: ${filePath}`);
    if (!metadata.version?.trim())
        throw new Error(`Command ${id} is missing version.`);
    if (!metadata.description?.trim())
        throw new Error(`Command ${id} is missing description.`);
    if (!metadata.usage?.trim())
        throw new Error(`Command ${id} is missing usage.`);
    if (!VALID_HANDLERS.has(handler))
        throw new Error(`Command ${id} has unsupported handler: ${handler}`);
    if (!["required", "optional", "none"].includes(target))
        throw new Error(`Command ${id} has invalid target mode: ${target}`);
    return {
        id,
        version: metadata.version,
        description: metadata.description,
        argumentHint: metadata["argument-hint"],
        usage: metadata.usage,
        handler: handler,
        target: target,
        prompt: body,
        sourcePath: filePath
    };
}
export function loadCommands(commandsRoot) {
    if (!fs.existsSync(commandsRoot))
        return [];
    const commands = [];
    for (const entry of fs.readdirSync(commandsRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !FILE_PATTERN.test(entry.name))
            continue;
        commands.push(parseCommandFile(path.join(commandsRoot, entry.name)));
    }
    const seen = new Set();
    for (const command of commands) {
        const key = command.id.toLowerCase();
        if (seen.has(key))
            throw new Error(`Duplicate OrchestraX AI command: ${command.id}`);
        seen.add(key);
    }
    return commands.sort((a, b) => a.id.localeCompare(b.id));
}
export function findCommand(commands, id) {
    return commands.find(command => command.id.toLowerCase() === id.trim().toLowerCase());
}
export function validateCommandDirectory(commandsRoot) {
    try {
        loadCommands(commandsRoot);
        return [];
    }
    catch (error) {
        return [error instanceof Error ? error.message : String(error)];
    }
}
