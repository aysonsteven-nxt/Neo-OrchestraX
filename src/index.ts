import fs from "node:fs";
import path from "node:path";

export interface Project {
  id: string;
  name: string;
  path: string;
}

export interface Workspace {
  root: string;
  projects: Project[];
}

function isProject(dir: string): boolean {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.some(e => e.isFile() &&
    ["package.json", "build.gradle", "settings.gradle", "pom.xml"].includes(e.name))
    || entries.some(e => e.isDirectory() &&
    [".git", ".devkit", ".orchestrax"].includes(e.name));
}

export function discoverWorkspace(root: string): Workspace {
  const resolved = path.resolve(root);
  const projects: Project[] = [];

  for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const projectPath = path.join(resolved, entry.name);
    if (entry.name === "neo-orchestrax") continue;
    if (isProject(projectPath)) {
      projects.push({ id: entry.name, name: entry.name, path: projectPath });
    }
  }
  return { root: resolved, projects };
}

function printHelp(): void {
  console.log(`
Neo OrchestraX v0.1.0

Secondary CLI foundation.

Commands:
  neo workspace status
  neo project list
  neo status
  neo help
`);
}

const args = process.argv.slice(2);
const command = args.join(" ");
if (!command || command === "help" || command === "--help") {
  printHelp();
  process.exit(0);
}

const workspace = discoverWorkspace(process.cwd());

if (command === "status" || command === "workspace status") {
  console.log("Neo OrchestraX v0.1.0");
  console.log(`Workspace: ${workspace.root}`);
  console.log(`Projects: ${workspace.projects.length}`);
  for (const project of workspace.projects) {
    console.log(`  - ${project.name} (${project.id})`);
  }
} else if (command === "project list") {
  for (const project of workspace.projects) {
    console.log(`${project.id}\t${project.path}`);
  }
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
