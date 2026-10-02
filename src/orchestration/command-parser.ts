export interface ParsedCommand {
  name: string;
  args: string[];
  project?: string;
  raw: string;
}

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim();
  const match = raw.match(/^@(\S+)(?:\s+([\s\S]*))?$/);

  if (!match) {
    throw new Error("Invalid OrchestraX command. Commands must start with @.");
  }

  const name = match[1];
  let remainder = (match[2] ?? "").trim();
  let project: string | undefined;

  // Project targeting uses the canonical:
  // @command ... for <project>
  const projectMatch = remainder.match(/\s+for\s+(.+)$/i);
  if (projectMatch) {
    project = projectMatch[1].trim();
    remainder = remainder.slice(0, projectMatch.index).trim();
  }

  const args = remainder
    ? remainder.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a =>
        a.startsWith('"') && a.endsWith('"') ? a.slice(1, -1) : a
      ) ?? []
    : [];

  return { name, args, project, raw };
}
