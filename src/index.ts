import fs from "node:fs";
import path from "node:path";
import { routeCommand } from "./orchestration/command-router.js";
import { loadPackRegistry } from "./packs/registry.js";
import { validatePack } from "./packs/validator.js";
import { installPack, listInstalled, removePack } from "./packs/installer.js";
import { analyzeProject } from "./analyzer/project-analyzer.js";
import { selectPacks } from "./selector/pack-selector.js";
import { createEntry, listSyntra, searchSyntra, changeSyntraStatus } from "./syntra/manager.js";
import { initSyntra } from "./syntra/store.js";

export interface Project { id: string; name: string; path: string; }
export interface Workspace { root: string; projects: Project[]; }

function isProject(dir: string): boolean {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.some(e => e.isFile() && ["package.json","build.gradle","settings.gradle","pom.xml"].includes(e.name))
    || entries.some(e => e.isDirectory() && [".git",".devkit",".orchestrax"].includes(e.name));
}

export function discoverWorkspace(root: string): Workspace {
  const resolved = path.resolve(root);
  const projects: Project[] = [];
  for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "neo-orchestrax") continue;
    const projectPath = path.join(resolved, entry.name);
    if (isProject(projectPath)) projects.push({ id: entry.name, name: entry.name, path: projectPath });
  }
  return { root: resolved, projects };
}

function help(): void {
  console.log(`
Neo OrchestraX v0.5.0

Workspace:
  neo workspace status
  neo project list

Packs:
  neo pack list
  neo pack installed <project>
  neo pack install <pack> <project>
  neo pack remove <pack> <project>
  neo pack validate <pack>
  neo analyze <project>
  neo pack recommend <project>

Syntra diagnostics:
  neo syntra init <project>
  neo syntra list <project>
  neo syntra search <project> "<query>"
  neo syntra add <project> "<title>" "<content>" <category>
  neo syntra status <project> <entry-id> <status>
`);
}

const args = process.argv.slice(2);
const command = args[0];
if (!command || command === "help" || command === "--help") { help(); process.exit(0); }

const workspace = discoverWorkspace(process.cwd());
const packRoot = path.join(workspace.root, "neo-orchestrax", "packs");

if (command === "status" || args.join(" ") === "workspace status") {
  console.log("Neo OrchestraX v0.5.0");
  console.log(`Workspace: ${workspace.root}`);
  console.log(`Projects: ${workspace.projects.length}`);
  workspace.projects.forEach(p => console.log(`  - ${p.name} (${p.id})`));
} else if (args.join(" ") === "project list") {
  workspace.projects.forEach(p => console.log(`${p.id}\t${p.path}`));
} else if (command === "analyze" || (command === "pack" && args[1] === "recommend")) {
  const projectName = command === "analyze" ? args[1] : args[2];
  const project = workspace.projects.find(p => p.name.toLowerCase() === (projectName ?? "").toLowerCase());
  if (!project) { console.error("Project not found."); process.exit(1); }
  const profile = analyzeProject(project);
  if (command === "analyze") {
    console.log(`Project Analysis: ${project.name}`);
    profile.signals.forEach(s => console.log(`  ✓ ${s.value} [${s.category}] — ${s.evidence}`));
  } else {
    console.log(`Pack Recommendations: ${project.name}`);
    selectPacks(profile, loadPackRegistry(packRoot)).recommendations
      .filter(r => r.score > 0)
      .forEach(r => console.log(`  ${r.pack.name}  ${r.score}%`));
  }
} else if (command === "pack") {
  const sub = args[1];
  if (sub === "list") {
    loadPackRegistry(packRoot).forEach(p => console.log(`${p.name}@${p.version}\t${p.description}`));
  } else if (sub === "installed") {
    const project = workspace.projects.find(p => p.name.toLowerCase() === (args[2] ?? "").toLowerCase());
    if (!project) { console.error("Project not found."); process.exit(1); }
    listInstalled(project.path).forEach(n => console.log(n));
  } else if (sub === "install" || sub === "remove") {
    const pack = args[2];
    const project = workspace.projects.find(p => p.name.toLowerCase() === (args[3] ?? "").toLowerCase());
    if (!pack || !project) { console.error(`Usage: neo pack ${sub} <pack> <project>`); process.exit(1); }
    const result = sub === "install"
      ? installPack(path.join(packRoot, pack), project.path)
      : removePack(project.path, pack);
    console.log(result.message);
    process.exit(result.ok ? 0 : 1);
  } else if (sub === "validate") {
    const result = validatePack(path.join(packRoot, args[2] ?? ""));
    console.log(result.valid ? `Valid: ${args[2]}` : `Invalid: ${result.errors.join("; ")}`);
    process.exit(result.valid ? 0 : 1);
  } else { console.error("Unknown pack command."); process.exit(1); }
} else if (command === "syntra") {
  const sub = args[1];
  const project = workspace.projects.find(p => p.name.toLowerCase() === (args[2] ?? "").toLowerCase());
  if (!project) { console.error("Project not found."); process.exit(1); }

  if (sub === "init") {
    initSyntra(project.path);
    console.log(`Initialized Syntra for ${project.name}`);
  } else if (sub === "list") {
    listSyntra(project.path).forEach(e => console.log(`${e.id} | ${e.status} | ${e.category} | ${e.title}`));
  } else if (sub === "search") {
    searchSyntra(project.path, args.slice(3).join(" ")).forEach(e => {
      console.log(`${e.id} | ${e.status} | ${e.category} | ${e.title}`);
      console.log(`  ${e.content}`);
    });
  } else if (sub === "add") {
    const title = args[3], content = args[4], category = args[5] as any;
    if (!title || !content || !category) {
      console.error('Usage: neo syntra add <project> "<title>" "<content>" <category>');
      process.exit(1);
    }
    console.log(`Created Syntra entry ${createEntry(project.path, { title, content, category }).id}`);
  } else if (sub === "status") {
    const entry = changeSyntraStatus(project.path, args[3], args[4] as any);
    if (!entry) { console.error("Syntra entry not found."); process.exit(1); }
    console.log(`Updated ${entry.id} → ${entry.status}`);
  } else { console.error("Unknown Syntra command."); process.exit(1); }
} else if (command === "command") {
  const input = args.slice(1).join(" ").trim();
  if (!input) { console.error("Missing OrchestraX command."); process.exit(1); }
  const result = routeCommand(input, workspace.projects);
  console.log(result.message);
  result.candidates?.forEach(p => console.log(`  - ${p.name}`));
  process.exit(result.ok ? 0 : 2);
} else {
  console.error(`Unknown CLI command: ${args.join(" ")}`);
  process.exit(1);
}
