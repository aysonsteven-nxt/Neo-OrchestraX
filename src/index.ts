#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeAiCommand } from "./orchestration/ai-command-service.js";
import { loadPackRegistry } from "./packs/registry.js";
import { validatePack } from "./packs/validator.js";
import { installPack, installProjectPack, installWorkspacePack, listInstalled, listWorkspaceInstalled, removeProjectPack, removeWorkspacePack } from "./packs/installer.js";
import { composePack } from "./packs/composition.js";
import { resolvePackGraph } from "./packs/resolver.js";
import { analyzeProject } from "./analyzer/project-analyzer.js";
import { selectPacks } from "./selector/pack-selector.js";
import { createEntry, createWorkspaceEntry, listSyntra, listWorkspaceSyntra, searchSyntra, searchWorkspaceSyntra, changeSyntraStatus, changeWorkspaceSyntraStatus } from "./syntra/manager.js";
import { initSyntra } from "./syntra/store.js";
import { resolveContext } from "./context/resolver.js";
import { formatContext } from "./context/formatter.js";
import { createTask, listTasks, getTask, changeTaskStatus } from "./tasks/manager.js";
import { resolveTaskContext } from "./tasks/context.js";
import { createHandoff, getHandoff, getLatestHandoff, listHandoffs } from "./handoff/manager.js";
import { formatHandoff } from "./handoff/formatter.js";
import { listProviders, syncProvider, syncAllProviders } from "./providers/manager.js";
import { defaultInstructionsRoot, userInstructionsRoot, workspaceInstructionsRoot, projectInstructionsRoot, listInstructionDirectories, validateInstructionDirectory } from "./instructions/registry.js";
import { findInstruction, resolveInstructions } from "./instructions/resolver.js";
import { findAgent, resolveAgents } from "./agents/resolver.js";
import { validateAgentDirectory } from "./agents/registry.js";
import { findSkill, resolveSkills, resolveAllSkills } from "./skills/resolver.js";
import { validateSkillDirectory } from "./skills/registry.js";

import type { Project, Workspace } from "./workspace/types.js";
import { isOrchestraXDirectory, isProjectDirectory, locateOrchestraX } from "./workspace/discovery.js";
import { initWorkspace, initProject, workspaceConfigPath, projectConfigPath, readWorkspaceConfig } from "./workspace/config.js";
import { ensureProjectHub, listHubInstalled, projectHubPath } from "./project-hub/manager.js";
export type { Project, Workspace } from "./workspace/types.js";

const installationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageMetadata = JSON.parse(fs.readFileSync(path.join(installationRoot, "package.json"), "utf8")) as { version?: string };
const CLI_VERSION = packageMetadata.version ?? "0.0.0";

interface DirectoryEntry {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}


export function discoverWorkspace(root: string, installationRoot: string = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")): Workspace {
  const located = locateOrchestraX(root, installationRoot);
  const resolved = located.workspaceRoot;
  const orchestraxRoot = located.orchestraxRoot;
  const configured = readWorkspaceConfig(resolved);
  const configuredProjectsRoot = configured ? path.join(resolved, configured.projectsDirectory) : undefined;
  // Include the invocation directory as a project candidate. This matters for
  // nested project layouts (for example workspace/projects/product/fe/app)
  // where the actual repository root is deeper than the configured projects
  // directory. It also lets explicit CLI targets resolve the project from the
  // current working directory without requiring the project to be a direct
  // child of the workspace.
  const invocationRoot = path.resolve(root);
  const candidateRoots = [...(located.folderRoots ?? []), ...(configuredProjectsRoot ? [configuredProjectsRoot] : []), invocationRoot, resolved].filter((value, index, all) => all.indexOf(value) === index);
  const projects: Project[] = [];
  const seen = new Set<string>();

  for (const candidateRoot of candidateRoots) {
    const projectPath = path.resolve(candidateRoot);
    if (seen.has(projectPath) || !fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) continue;
    seen.add(projectPath);
    if (isOrchestraXDirectory(projectPath)) continue;
    if (isProjectDirectory(projectPath)) {
      const id = path.basename(projectPath);
      projects.push({ id, name: id, path: projectPath });
      continue;
    }

    try {
      for (const entry of fs.readdirSync(projectPath, { withFileTypes: true }) as DirectoryEntry[]) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        const nestedProjectPath = path.join(projectPath, entry.name);
        if (seen.has(nestedProjectPath) || isOrchestraXDirectory(nestedProjectPath)) continue;
        if (isProjectDirectory(nestedProjectPath)) {
          seen.add(nestedProjectPath);
          projects.push({ id: entry.name, name: entry.name, path: nestedProjectPath });
        }
      }
    } catch {
      // Ignore unreadable workspace folders.
    }
  }

  return { root: resolved, orchestraxRoot, installationRoot: located.installationRoot, configPath: located.configPath, initialized: located.initialized, scope: located.scope, projects, folderRoots: located.folderRoots, workspaceFile: located.workspaceFile };
}

function help(): void {
  console.log(`
Neo OrchestraX v${CLI_VERSION}

Workspace:
  neo workspace init [path]
  neo workspace status
  neo project list
  neo project init [path]
  neo hub status <project>
  neo hub path <project>

Packs:
  neo pack list
  neo pack installed <project>
  neo pack install <pack> <project>
  neo pack install <pack> --workspace
  neo pack installed <project>
  neo pack installed --workspace
  neo pack remove <pack> <project>
  neo pack remove <pack> --workspace
  neo pack validate <pack>
  neo pack show <pack> [project]
  neo pack graph <pack> [project]
  neo pack compose <pack> <project>
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

Instructions / Rails:
  neo instruction list <project>
  neo instruction show <project> <instruction-id>
  neo instruction effective <project>
  neo instruction validate <path>

Agents:
  neo agent list <project>
  neo agent show <project> <agent-id>
  neo agent effective <project>
  neo agent validate <path>

Skills:
  neo skill list <project> [agent-id]
  neo skill show <project> <skill-id>
  neo skill effective <project> [agent-id]
  neo skill validate <path>

Syntra diagnostics:
  neo syntra workspace list
  neo syntra workspace search "<query>"
  neo syntra workspace add "<title>" "<content>" <category>
  neo syntra init <project>
  neo syntra list <project>
  neo syntra search <project> "<query>"
  neo syntra add <project> "<title>" "<content>" <category>
  neo syntra status <project> <entry-id> <status>

Legacy AI Command Compatibility (frozen; no new AI commands):
  /package-selector
  /package-install android-kotlin-dev for MoneyMap
  /context for MoneyMap
  /task start "Transaction history" "Track transaction history" for MoneyMap
  /handoff for MoneyMap
  /resume for MoneyMap
  /instructions for MoneyMap
  /agents for MoneyMap
  /agent android-dev for MoneyMap
  /skills for MoneyMap
  /skill compose-development for MoneyMap
  /provider-sync copilot for MoneyMap

AI Command Compatibility:
  neo command "/package-selector for MoneyMap"

  The neo command bridge executes the canonical /... OrchestraX AI command
  language through the same AI Command Engine used by provider integrations.

  Examples:
    neo command "/package-selector for MoneyMap"
    neo command "/package-install android-kotlin-dev for MoneyMap"
    neo command "/context for MoneyMap"
    neo command "/task start \"Transaction history\" \"Track transaction history\" for MoneyMap"
    neo command "/handoff for MoneyMap"
    neo command "/resume for MoneyMap"
    neo command "/instructions for MoneyMap"
    neo command "/agents for MoneyMap"
    neo command "/agent android-dev for MoneyMap"
    neo command "/skills for MoneyMap"
    neo command "/skill compose-development for MoneyMap"
    neo command "/provider-sync copilot for MoneyMap"

  Native neo ... commands remain the direct CLI interface; the compatibility
  bridge is provided when the canonical AI command syntax is preferred.
`);
}

const args = process.argv.slice(2);
const command = args[0];
if (command === "--version" || command === "-v" || command === "version") {
  console.log(`Neo OrchestraX v${CLI_VERSION}`);
  process.exit(0);
}
if (!command || command === "help" || command === "--help" || command === "-h") { help(); process.exit(0); }

const workspace = discoverWorkspace(process.cwd(), installationRoot);
const packRoot = path.join(workspace.orchestraxRoot, "packs");
const workspacePackRoot = path.join(workspace.root, ".orchestrax", "packs");
const availablePackRoots = [packRoot, workspacePackRoot].filter((value, index, all) => all.indexOf(value) === index);

function projectHubPackRoot(project: Project): string { return path.join(projectHubPath(workspace.root, project), "packs"); }
function projectAvailablePackRoots(project: Project): string[] { return [...availablePackRoots, path.join(project.path, ".orchestrax", "packs"), projectHubPackRoot(project)].filter((value, index, all) => all.indexOf(value) === index); }

if (command === "workspace" && args[1] === "init") {
  const target = path.resolve(args[2] ?? process.cwd());
  if (fs.existsSync(workspaceConfigPath(target))) { console.error(`Workspace already initialized: ${target}`); process.exit(1); }
  initWorkspace(target);
  console.log(`Initialized Neo OrchestraX workspace: ${target}`);
  console.log("Created: projects/, documentation/, context/syntra/, .orchestrax/");
} else if (command === "project" && args[1] === "init") {
  const target = path.resolve(args[2] ?? process.cwd());
  if (fs.existsSync(projectConfigPath(target))) { console.error(`Project already initialized: ${target}`); process.exit(1); }
  initProject(target);
  console.log(`Initialized Neo OrchestraX project: ${target}`);
  console.log("Created: .orchestrax/packs/, .orchestrax/syntra/");
} else if (command === "hub") {
  const sub = args[1];
  const project = workspace.projects.find(p => p.name.toLowerCase() === (args[2] ?? "").toLowerCase());
  if (!project) { console.error("Project not found."); process.exit(1); }
  if (sub === "path") {
    console.log(projectHubPath(workspace.root, project));
  } else if (sub === "status") {
    const root = projectHubPath(workspace.root, project);
    if (!fs.existsSync(path.join(root, "hub.json"))) { console.log(`Project Hub: not initialized for ${project.name}`); process.exit(0); }
    const manifest = ensureProjectHub(workspace.root, project);
    console.log(`Project Hub: ${project.name}`);
    console.log(`Path: ${root}`);
    console.log(`Packs: ${manifest.packs.map(p => `${p.id}@${p.version}`).join(", ") || "none"}`);
    console.log(`Board: ${fs.existsSync(path.join(root, "board", "board.json")) ? "ready" : "missing"}`);
  } else { console.error("Usage: neo hub status <project> | neo hub path <project>"); process.exit(1); }
} else if (command === "status" || args.join(" ") === "workspace status") {
  console.log(`Neo OrchestraX v${CLI_VERSION}`);
  console.log(`Workspace: ${workspace.root}`);
  console.log(`OrchestraX installation: ${workspace.installationRoot}`);
  console.log(`Scope: ${workspace.scope}`);
  console.log(`Workspace initialized: ${workspace.initialized}`);
  if (workspace.workspaceFile) console.log(`Workspace file: ${workspace.workspaceFile}`);
  if (workspace.folderRoots?.length) {
    console.log(`Workspace folders: ${workspace.folderRoots.length}`);
    workspace.folderRoots.forEach(folder => console.log(`  * ${folder}`));
  }
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
  console.log(formatContext(resolveContext(project, query, workspace.root)));
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
    listProviders().forEach(p => {
      const capabilityFlags = Object.entries(p.capabilities).map(([key, value]) => `${key}=${value}`).join(", ");
      console.log(`${p.id}\t${p.name}\t${p.description}\t${capabilityFlags}`);
    });
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
    if (args[2] === "--workspace") {
      if (workspace.scope !== "workspace") { console.error("Workspace scope is not available. Initialize a workspace with: neo workspace init [path]"); process.exit(1); }
      listWorkspaceInstalled(workspace.root).forEach(n => console.log(`${n}\tworkspace`));
    } else {
      const project = workspace.projects.find(p => p.name.toLowerCase() === (args[2] ?? "").toLowerCase());
      if (!project) { console.error("Project not found."); process.exit(1); }
      listWorkspaceInstalled(workspace.root).forEach(n => console.log(`${n}\tworkspace`));
      listInstalled(project.path, workspace.root, project).forEach(n => console.log(`${n}\tproject`));
    }
  } else if (sub === "install" || sub === "remove") {
    const pack = args[2];
    const workspaceScope = args[3] === "--workspace";
    if (workspaceScope && workspace.scope !== "workspace") { console.error("Workspace scope is not available. Initialize a workspace with: neo workspace init [path]"); process.exit(1); }
    const project = workspaceScope ? undefined : workspace.projects.find(p => p.name.toLowerCase() === (args[3] ?? "").toLowerCase());
    if (!pack || (!workspaceScope && !project)) { console.error(`Usage: neo pack ${sub} <pack> <project> | neo pack ${sub} <pack> --workspace`); process.exit(1); }
    const result = sub === "install"
      ? (workspaceScope ? installWorkspacePack(path.join(packRoot, pack), workspace.root, availablePackRoots) : installProjectPack(path.join(packRoot, pack), project!, workspace.root, projectAvailablePackRoots(project!), workspace.workspaceFile))
      : (workspaceScope ? removeWorkspacePack(workspace.root, pack) : removeProjectPack(project!, workspace.root, pack));
    console.log(result.message);
    process.exit(result.ok ? 0 : 1);
  } else if (sub === "validate") {
    const target = path.join(packRoot, args[2] ?? "");
    const result = validatePack(target, availablePackRoots);
    console.log(result.valid ? `Valid: ${args[2]}` : `Invalid: ${result.errors.join("; ")}`);
    result.warnings.forEach(w => console.log(`! ${w}`));
    process.exit(result.valid ? 0 : 1);
  } else if (sub === "show" || sub === "graph") {
    const packName = args[2];
    if (!packName) { console.error(`Usage: neo pack ${sub} <pack> [project]`); process.exit(1); }
    const project = args[3] ? workspace.projects.find(p => p.name.toLowerCase() === args[3].toLowerCase()) : undefined;
    if (args[3] && !project) { console.error("Project not found."); process.exit(1); }
    const projectHubPack = project ? path.join(projectHubPackRoot(project), packName) : undefined;
    const projectPack = project ? path.join(project.path, ".orchestrax", "packs", packName) : undefined;
    const target = projectHubPack && fs.existsSync(projectHubPack) ? projectHubPack : projectPack && fs.existsSync(projectPack) ? projectPack : path.join(packRoot, packName);
    const graph = resolvePackGraph(target, project ? projectAvailablePackRoots(project) : availablePackRoots);
    if (!graph) { console.error(`Pack not found or invalid: ${packName}`); process.exit(1); }
    if (sub === "show") {
      const p = graph.root.pack;
      console.log(`# ${p.name}`);
      console.log(`Version: ${p.version}`);
      console.log(`Description: ${p.description}`);
      console.log(`Capabilities: ${p.capabilities.join(", ") || "none"}`);
      console.log("\nInstructions:"); p.instructions.forEach(d => console.log(`- ${d.id} @ ${d.version} | ${d.required ? "required" : "optional"}`));
      console.log("Agents:"); p.agents.forEach(d => console.log(`- ${d.id} @ ${d.version} | ${d.required ? "required" : "optional"}`));
      console.log("Skills:"); p.skills.forEach(d => console.log(`- ${d.id} @ ${d.version} | ${d.required ? "required" : "optional"}`));
      console.log("Pack dependencies:"); p.dependencies.forEach(d => console.log(`- ${d.id} @ ${d.version} | ${d.required ? "required" : "optional"}`));
    } else {
      console.log(`Pack Dependency Graph: ${packName}`);
      graph.order.forEach((node, index) => console.log(`${index + 1}. ${node.pack.name}@${node.pack.version}`));
      graph.issues.forEach(i => console.log(`${i.required ? "!" : "~"} ${i.message}`));
    }
  } else if (sub === "compose") {
    const packName = args[2]; const project = workspace.projects.find(p => p.name.toLowerCase() === (args[3] ?? "").toLowerCase());
    if (!packName || !project) { console.error("Usage: neo pack compose <pack> <project>"); process.exit(1); }
    const composition = composePack(project, packName, workspace.orchestraxRoot, workspace.root);
    if (!composition) { console.error(`Pack not found or invalid: ${packName}`); process.exit(1); }
    console.log(`Pack Composition: ${packName} → ${project.name}`);
    console.log("\nResolved packs:"); composition.order.forEach(p => console.log(`- ${p.pack.name}@${p.pack.version}`));
    console.log(`\nCompatibility: ${composition.compatibility.length ? "failed" : "ok"}`);
    composition.compatibility.forEach(e => console.log(`! ${e}`));
    composition.issues.forEach(i => console.log(`${i.required ? "!" : "~"} ${i.message}`));
    process.exit(composition.issues.some(i => i.required) || composition.compatibility.length > 0 ? 1 : 0);
  } else { console.error("Unknown pack command."); process.exit(1); }
} else if (command === "instruction") {
  const sub = args[1];
  if (sub === "validate") {
    const target = path.resolve(args[2] ?? "");
    const errors = validateInstructionDirectory(target);
    console.log(errors.length ? `Invalid: ${errors.join("; ")}` : `Valid instruction: ${target}`);
    process.exit(errors.length ? 1 : 0);
  }

  const project = workspace.projects.find(p => p.name.toLowerCase() === (args[2] ?? "").toLowerCase());
  if (!project) { console.error("Project not found."); process.exit(1); }
  const orchestraxRoot = workspace.orchestraxRoot;
  const resolution = resolveInstructions(orchestraxRoot, workspace.root, project);

  if (sub === "list" || sub === "effective") {
    console.log(`Effective OrchestraX Rails: ${project.name}`);
    resolution.instructions.forEach(i => console.log(`${i.id}@${i.version} | ${i.source} | ${i.required ? "required" : "optional"} | ${i.description}`));
    if (resolution.conflicts.length) {
      console.log("\nResolution notes:");
      resolution.conflicts.forEach(c => console.log(`  ! ${c}`));
    }
  } else if (sub === "show") {
    const id = args[3];
    if (!id) { console.error("Usage: neo instruction show <project> <instruction-id>"); process.exit(1); }
    const instruction = findInstruction(resolution, id);
    if (!instruction) { console.error(`Instruction not found: ${id}`); process.exit(1); }
    console.log(`# ${instruction.id}`);
    console.log(`Version: ${instruction.version}`);
    console.log(`Source: ${instruction.source}`);
    console.log(`Category: ${instruction.category}`);
    console.log(`Required: ${instruction.required}`);
    console.log(`Overrideable: ${instruction.overrideable}`);
    console.log(`\n${instruction.content}`);
  } else {
    console.error("Unknown instruction command."); process.exit(1);
  }
} else if (command === "agent") {
  const sub=args[1];
  if(sub==="validate"){const target=path.resolve(args[2]??"");const errors=validateAgentDirectory(target);console.log(errors.length?`Invalid: ${errors.join("; ")}`:`Valid agent: ${target}`);process.exit(errors.length?1:0);}
  const project=workspace.projects.find(p=>p.name.toLowerCase()===(args[2]??"").toLowerCase()); if(!project){console.error("Project not found.");process.exit(1);}
  const resolution=resolveAgents(workspace.orchestraxRoot,workspace.root,project);
  if(sub==="list"||sub==="effective"){console.log(`Applicable OrchestraX Agents: ${project.name}`);resolution.agents.forEach(a=>console.log(`${a.id}@${a.version} | ${a.source} | ${a.role} | ${a.capabilities.join(", ")}`));if(resolution.conflicts.length){console.log("\nResolution notes:");resolution.conflicts.forEach(c=>console.log(`  ! ${c}`));}}
  else if(sub==="show"){const id=args[3];if(!id){console.error("Usage: neo agent show <project> <agent-id>");process.exit(1);}const agent=findAgent(resolution,id);if(!agent){console.error(`Agent not found: ${id}`);process.exit(1);}console.log(`# ${agent.id}`);console.log(`Version: ${agent.version}`);console.log(`Source: ${agent.source}`);console.log(`Role: ${agent.role}`);console.log(`Capabilities: ${agent.capabilities.join(", ")||"none"}`);console.log("\nInstruction dependencies:");agent.resolvedInstructions.forEach(d=>console.log(`- ${d.id} @ ${d.version} | ${d.required?"required":"optional"} | ${d.available?`available (${d.source})`:"missing"}`));console.log("\nSkill dependencies:");agent.resolvedSkills.forEach(d=>console.log(`- ${d.id} @ ${d.version} | ${d.required?"required":"optional"} | ${d.available?`available (${d.source})`:"missing"}`));console.log(`\n${agent.content}`);}
  else {console.error("Unknown agent command.");process.exit(1);}
} else if (command === "skill") {
  const sub=args[1];
  if(sub==="validate"){const target=path.resolve(args[2]??"");const errors=validateSkillDirectory(target);console.log(errors.length?`Invalid: ${errors.join("; ")}`:`Valid skill: ${target}`);process.exit(errors.length?1:0);}
  const project=workspace.projects.find(p=>p.name.toLowerCase()===(args[2]??"").toLowerCase()); if(!project){console.error("Project not found.");process.exit(1);}
  const resolution=resolveSkills(workspace.orchestraxRoot,workspace.root,project,args[3]);
  if(sub==="list"||sub==="effective"){console.log(`Effective OrchestraX Skills: ${project.name}${args[3]?` [${args[3]}]`:""}`);resolution.skills.forEach(s=>console.log(`${s.id}@${s.version} | ${s.source} | ${s.category} | ${s.capabilities.join(", ")}`));if(resolution.conflicts.length){console.log("\nResolution notes:");resolution.conflicts.forEach(c=>console.log(`  ! ${c}`));}}
  else if(sub==="show"){const id=args[3];if(!id){console.error("Usage: neo skill show <project> <skill-id>");process.exit(1);}const skill=findSkill(resolveAllSkills(workspace.orchestraxRoot,workspace.root,project),id);if(!skill){console.error(`Skill not found: ${id}`);process.exit(1);}console.log(`# ${skill.id}`);console.log(`Version: ${skill.version}`);console.log(`Source: ${skill.source}`);console.log(`Category: ${skill.category}`);console.log(`Mapped agents: ${skill.appliesToAgents.join(", ")||"all"}`);console.log(`\n${skill.content}`);}
  else {console.error("Unknown skill command.");process.exit(1);}
} else if (command === "syntra") {
  const sub = args[1];
  if (sub === "workspace") {
    if (workspace.scope !== "workspace") { console.error("Workspace scope is not available. Initialize a workspace first."); process.exit(1); }
    const action = args[2];
    if (action === "list") listWorkspaceSyntra(workspace.root).forEach(e => console.log(`${e.id} | ${e.status} | ${e.category} | ${e.title}`));
    else if (action === "search") searchWorkspaceSyntra(workspace.root, args.slice(3).join(" ")).forEach(e => console.log(`${e.id} | ${e.status} | ${e.category} | ${e.title}\n  ${e.content}`));
    else if (action === "add") { const title=args[3], content=args[4], category=args[5] as any; if(!title||!content||!category){console.error('Usage: neo syntra workspace add "<title>" "<content>" <category>');process.exit(1);} console.log(`Created workspace Syntra entry ${createWorkspaceEntry(workspace.root,{title,content,category}).id}`); }
    else if (action === "status") { const entry=changeWorkspaceSyntraStatus(workspace.root,args[3],args[4] as any); if(!entry){console.error("Workspace Syntra entry not found.");process.exit(1);} console.log(`Updated ${entry.id} → ${entry.status}`); }
    else { console.error("Unknown workspace Syntra command."); process.exit(1); }
  } else {
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
  }
} else if (command === "command") {
  // Secondary diagnostic bridge for exercising the PRIMARY AI command router from a terminal.
  // The command language itself is not a CLI language.
  const input = args.slice(1).join(" ").trim();
  if (!input) { console.error('Usage: neo command "/package-selector for <project>"'); process.exit(1); }
  const result = executeAiCommand(input, workspace);
  if (result.warning) console.warn(`! ${result.warning}`);
  console.log(result.output);
  process.exit(result.ok ? 0 : 2);
} else {
  console.error(`Unknown CLI command: ${args.join(" ")}`);
  process.exit(1);
}
