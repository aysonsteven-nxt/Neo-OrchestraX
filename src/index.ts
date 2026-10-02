import fs from "node:fs";
import path from "node:path";
import { routeCommand } from "./orchestration/command-router.js";

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
    if (entry.name === "neo-orchestrax") continue;

    const projectPath = path.join(resolved, entry.name);
    if (isProject(projectPath)) {
      projects.push({ id: entry.name, name: entry.name, path: projectPath });
    }
  }
  return { root: resolved, projects };
}

function help(): void {
  console.log(`
Neo OrchestraX v0.2.0

Workspace:
  neo workspace status
  neo project list

Command diagnostics:
  neo command "@package-selector"
  neo command "@package-selector for MoneyMap"
  neo command "@package-install android-kotlin-dev for MoneyMap"
`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "help" || command === "--help") {
  help();
  process.exit(0);
}

const workspace = discoverWorkspace(process.cwd());

if (command === "status" || args.join(" ") === "workspace status") {
  console.log("Neo OrchestraX v0.2.0");
  console.log(`Workspace: ${workspace.root}`);
  console.log(`Projects: ${workspace.projects.length}`);
  for (const project of workspace.projects) {
    console.log(`  - ${project.name} (${project.id})`);
  }
} else if (args.join(" ") === "project list") {
  for (const project of workspace.projects) {
    console.log(`${project.id}\t${project.path}`);
  }
} else if (command === "command") {
  const input = args.slice(1).join(" ").trim();
  if (!input) {
    console.error("Missing OrchestraX command.");
    process.exit(1);
  }

  const result = routeCommand(input, workspace.projects);
  console.log(result.message);

  if (result.candidates?.length) {
    console.log("Candidates:");
    for (const project of result.candidates) {
      console.log(`  - ${project.name}`);
    }
  }

  process.exit(result.ok ? 0 : 2);
} else {
  console.error(`Unknown CLI command: ${args.join(" ")}`);
  process.exit(1);
}
