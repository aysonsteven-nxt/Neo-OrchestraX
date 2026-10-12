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
import { resolveContext } from "./context/resolver.js";
import { formatContext } from "./context/formatter.js";
import { createTask, listTasks, getTask, changeTaskStatus } from "./tasks/manager.js";
import { resolveTaskContext } from "./tasks/context.js";
import { createHandoff, getHandoff, getLatestHandoff, listHandoffs } from "./handoff/manager.js";
import { formatHandoff } from "./handoff/formatter.js";
import { listProviders, syncProvider, syncAllProviders } from "./providers/manager.js";

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
Neo OrchestraX v0.9.0

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
  neo context <project> [query]
  neo task start <project> "<title>" "<objective>"
  neo task list <project>
  neo task show <project> <task-id>
  neo task status <project> <task-id> <status>
  neo task context <project> <task-id>
  neo handoff create <project> [task-id]
  neo handoff list <project>
  neo handoff show <project> <handoff-id>
  neo handoff latest <project>
  neo resume <project>

Providers:
  neo provider list
  neo provider sync <project> [provider]

Syntra diagnostics:
  neo syntra init <project>
  neo syntra list <project>
  neo syntra search <project> "<query>"
  neo syntra add <project> "<title>" "<content>" <category>
  neo syntra status <project> <entry-id> <status>

AI-facing commands are routed through Neo OrchestraX:
  @handoff
  @handoff for MoneyMap
  @resume
  @resume for MoneyMap
  @provider-sync
  @provider-sync copilot for MoneyMap
`);
}

const args = process.argv.slice(2);
const command = args[0];
if (!command || command === "help" || command === "--help") { help(); process.exit(0); }

const workspace = discoverWorkspace(process.cwd());
const packRoot = path.join(workspace.root, "neo-orchestrax", "packs");

if (command === "status" || args.join(" ") === "workspace status") {
  console.log("Neo OrchestraX v0.9.0");
  console.log(`Workspace: ${workspace.root}`);
  console.log(`Projects: ${workspace.projects.length}`);
  workspace.projects.forEach(p => console.log(`  - ${p.name} (${p.id})`));
} else if (args.join(" ") === "project list") {
  workspace.projects.forEach(p => console.log(`${p.id}\t${p.path}`));
} else if (command === "context") {
  const projectName = args[1];
  const project = workspace.projects.find(p => p.name.toLowerCase() === (projectName ?? "").toLowerCase());
  if (!project) {
    console.error("Project not found.");
    process.exit(1);
  }

  const query = args.slice(2).join(" ").trim() || undefined;
  console.log(formatContext(resolveContext(project, query)));
} else if (command === "task") {
  const sub=args[1], project=workspace.projects.find(p=>p.name.toLowerCase()===(args[2]??"").toLowerCase());
  if(!project){console.error("Project not found.");process.exit(1);}
  if(sub==="start"){const title=args[3],objective=args[4];if(!title||!objective){console.error('Usage: neo task start <project> "<title>" "<objective>"');process.exit(1)}const t=createTask(project.path,project.id,title,objective);console.log(`Created task ${t.id}`)}
  else if(sub==="list"){listTasks(project.path).forEach(t=>console.log(`${t.id} | ${t.status} | ${t.title}`))}
  else if(sub==="show"){const t=getTask(project.path,args[3]);if(!t){console.error("Task not found.");process.exit(1)}console.log(JSON.stringify(t,null,2))}
  else if(sub==="status"){const t=changeTaskStatus(project.path,args[3],args[4] as any);if(!t){console.error("Task not found.");process.exit(1)}console.log(`Updated ${t.id} → ${t.status}`)}
  else if(sub==="context"){const t=getTask(project.path,args[3]);if(!t){console.error("Task not found.");process.exit(1)}console.log(formatContext(resolveTaskContext(project,t).context))}
  else {console.error("Unknown task command.");process.exit(1)}
} else if (command === "handoff") {
  const sub = args[1];
  const project = workspace.projects.find(p => p.name.toLowerCase() === (args[2] ?? "").toLowerCase());
  if (!project) { console.error("Project not found."); process.exit(1); }

  if (sub === "create") {
    const requestedTaskId = args[3];
    const task = requestedTaskId
      ? getTask(project.path, requestedTaskId)
      : listTasks(project.path).filter(t => ["in-progress", "blocked", "planned"].includes(t.status)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (requestedTaskId && !task) { console.error("Task not found."); process.exit(1); }
    const h = createHandoff(project.path, { projectId: project.id, task });
    console.log(formatHandoff(h));
  } else if (sub === "list") {
    listHandoffs(project.path).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).forEach(h =>
      console.log(`${h.id} | ${h.createdAt} | ${h.title}`));
  } else if (sub === "show") {
    const h = getHandoff(project.path, args[3]);
    if (!h) { console.error("Handoff not found."); process.exit(1); }
    console.log(formatHandoff(h));
  } else if (sub === "latest") {
    const h = getLatestHandoff(project.path);
    if (!h) { console.error("No handoff found."); process.exit(1); }
    console.log(formatHandoff(h));
  } else { console.error("Unknown handoff command."); process.exit(1); }
} else if (command === "resume") {
  const project = workspace.projects.find(p => p.name.toLowerCase() === (args[1] ?? "").toLowerCase());
  if (!project) { console.error("Project not found."); process.exit(1); }
  const h = args[2] ? getHandoff(project.path, args[2]) : getLatestHandoff(project.path);
  if (!h) { console.error("No handoff found to resume."); process.exit(1); }
  console.log(`Resume: ${project.name}`);
  console.log(formatHandoff(h));
} else if (command === "provider") {
  const sub = args[1];
  if (sub === "list") {
    listProviders().forEach(p => console.log(`${p.id}\t${p.name}\t${p.description}`));
  } else if (sub === "sync") {
    const project = workspace.projects.find(p => p.name.toLowerCase() === (args[2] ?? "").toLowerCase());
    if (!project) { console.error("Project not found."); process.exit(1); }
    const provider = args[3];
    const results = provider ? [syncProvider(project, provider)] : syncAllProviders(project);
    results.forEach(r => {
      console.log(`${r.provider}: wrote ${r.artifacts.length}, skipped ${r.skipped.length}`);
      r.artifacts.forEach(a => console.log(`  + ${a}`));
      r.skipped.forEach(a => console.log(`  ! ${a} (existing unmanaged file)`));
    });
  } else { console.error("Unknown provider command."); process.exit(1); }
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
  if (!result.ok) {
    console.log(result.message);
    result.candidates?.forEach(p => console.log(`  - ${p.name}`));
    process.exit(2);
  }

  const project = result.project!;
  if (result.command.name === "provider-sync") {
    const provider = result.command.args[0];
    const results = provider ? [syncProvider(project, provider)] : syncAllProviders(project);
    console.log(`Provider sync: ${project.name}`);
    results.forEach(r => {
      console.log(`  ${r.provider}: wrote ${r.artifacts.length}, skipped ${r.skipped.length}`);
      r.artifacts.forEach(a => console.log(`    + ${a}`));
      r.skipped.forEach(a => console.log(`    ! ${a} (existing unmanaged file)`));
    });
  } else if (result.command.name === "handoff") {
    const tasks = listTasks(project.path);
    const task = tasks.filter(t => ["in-progress", "blocked", "planned"].includes(t.status))
      .sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const handoff = createHandoff(project.path, { projectId: project.id, task });
    console.log(formatHandoff(handoff));
  } else if (result.command.name === "resume") {
    const handoff = getLatestHandoff(project.path);
    if (!handoff) { console.error(`No handoff found for ${project.name}.`); process.exit(1); }
    console.log(formatHandoff(handoff));
  } else {
    console.log(result.message);
  }
  process.exit(0);
} else {
  console.error(`Unknown CLI command: ${args.join(" ")}`);
  process.exit(1);
}
