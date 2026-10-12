import path from "node:path";
import type { Workspace } from "../workspace/types.js";
import { analyzeProject } from "../analyzer/project-analyzer.js";
import { loadPackRegistry } from "../packs/registry.js";
import { installPack, listInstalled, removePack } from "../packs/installer.js";
import { validatePack } from "../packs/validator.js";
import { composePack } from "../packs/composition.js";
import { resolvePackGraph } from "../packs/resolver.js";
import { selectPacks } from "../selector/pack-selector.js";
import { formatContext } from "../context/formatter.js";
import { resolveContext } from "../context/resolver.js";
import { changeTaskStatus, createTask, getTask, listTasks } from "../tasks/manager.js";
import { resolveTaskContext } from "../tasks/context.js";
import { createHandoff, getLatestHandoff, getHandoff, listHandoffs } from "../handoff/manager.js";
import { formatHandoff } from "../handoff/formatter.js";
import { listProviders, syncAllProviders, syncProvider } from "../providers/manager.js";
import { findInstruction, resolveInstructions } from "../instructions/resolver.js";
import { findAgent, resolveAgents } from "../agents/resolver.js";
import { findSkill, resolveAllSkills, resolveSkills } from "../skills/resolver.js";
import { routeCommand, type CommandResult } from "./command-router.js";

export interface AiCommandServiceResult {
  ok: boolean;
  output: string;
  warning?: string;
}

function joinLines(lines: string[]): string {
  return lines.filter(line => line !== "").join("\n");
}

function packRoot(workspace: Workspace): string {
  return path.join(workspace.orchestraxRoot, "packs");
}

function orchestraxRoot(workspace: Workspace): string {
  return workspace.orchestraxRoot;
}

export function executeAiCommand(input: string, workspace: Workspace): AiCommandServiceResult {
  const routed: CommandResult = routeCommand(input, workspace.projects, path.join(orchestraxRoot(workspace), "commands"), workspace.root);
  if (!routed.ok || !routed.definition) {
    return {
      ok: false,
      output: joinLines([routed.message, ...(routed.candidates ?? []).map(project => `  - ${project.name}`)]),
      warning: routed.warning
    };
  }

  const project = routed.project;
  const { command } = routed;
  const projectRequired = routed.definition.target === "required" || (routed.definition.handler === "pack" && command.args[0] === "compose");
  if (projectRequired && !project) {
    return { ok: false, output: "This OrchestraX AI command requires a target project. Specify: for <project>", warning: routed.warning };
  }

  const roots = [packRoot(workspace), ...(project ? [path.join(project.path, ".orchestrax", "packs")] : [])];

  let output: string;
  try {
    switch (routed.definition.handler) {
      case "package-selector": {
        if (!project) return { ok: false, output: "Project target required. Use: /package-selector for <project>", warning: routed.warning };
        const profile = analyzeProject(project);
        const result = selectPacks(profile, loadPackRegistry(packRoot(workspace)));
        const lines = [`Pack recommendations: ${project.name}`];
        for (const recommendation of result.recommendations.filter(item => item.score > 0).slice(0, 10)) {
          lines.push(`- ${recommendation.pack.name}@${recommendation.pack.version} — ${recommendation.score}% technical relevance`);
          if (recommendation.matchedCapabilities.length) lines.push(`  capabilities: ${recommendation.matchedCapabilities.join(", ")}`);
          if (recommendation.evidence.length) recommendation.evidence.slice(0, 5).forEach(evidence => lines.push(`  evidence: ${evidence}`));
        }
        output = lines.join("\n");
        break;
      }
      case "package-install": {
        if (!project) return { ok: false, output: "Project target required. Use: /package-install <pack> for <project>", warning: routed.warning };
        const pack = command.args[0];
        if (!pack) return { ok: false, output: "Usage: /package-install <pack> for <project>", warning: routed.warning };
        const source = path.join(packRoot(workspace), pack);
        const result = installPack(source, project.path, roots);
        output = result.message;
        if (result.installed?.length) output += `\nInstalled:\n${result.installed.map(item => `- ${item}`).join("\n")}`;
        if (!result.ok) return { ok: false, output, warning: routed.warning };
        break;
      }
      case "package-list": {
        const packs = loadPackRegistry(packRoot(workspace));
        output = packs.length
          ? `Available OrchestraX packs:\n${packs.map(pack => `- ${pack.name}@${pack.version} — ${pack.description}`).join("\n")}`
          : "No OrchestraX packs are available.";
        break;
      }
      case "package-installed": {
        if (!project) return { ok: false, output: "Project target required. Use: /package-installed for <project>", warning: routed.warning };
        const installed = listInstalled(project.path);
        output = installed.length
          ? `Installed OrchestraX packs: ${project.name}\n${installed.map(item => `- ${item}`).join("\n")}`
          : `No OrchestraX packs are installed for ${project.name}.`;
        break;
      }
      case "package-remove": {
        if (!project) return { ok: false, output: "Project target required. Use: /package-remove <pack> for <project>", warning: routed.warning };
        const pack = command.args[0];
        if (!pack) return { ok: false, output: "Usage: /package-remove <pack> for <project>", warning: routed.warning };
        const result = removePack(project.path, pack);
        output = result.message;
        if (!result.ok) return { ok: false, output, warning: routed.warning };
        break;
      }
      case "package-validate": {
        const pack = command.args[0];
        if (!pack) return { ok: false, output: "Usage: /package-validate <pack>", warning: routed.warning };
        const validation = validatePack(path.join(packRoot(workspace), pack), roots);
        output = validation.valid
          ? `Valid OrchestraX pack: ${pack}\n${validation.metadata?.version ? `Version: ${validation.metadata.version}` : ""}${validation.warnings.length ? `\nWarnings:\n${validation.warnings.map(w => `- ${w}`).join("\n")}` : ""}`
          : `Invalid OrchestraX pack: ${pack}\n${validation.errors.map(error => `- ${error}`).join("\n")}`;
        if (!validation.valid) return { ok: false, output, warning: routed.warning };
        break;
      }
      case "context": {
        if (!project) return { ok: false, output: "Project target required. Use: /context for <project>", warning: routed.warning };
        output = formatContext(resolveContext(project, command.args.join(" ").trim() || undefined));
        break;
      }
      case "task": {
        if (!project) return { ok: false, output: "Project target required. Use: /task ... for <project>", warning: routed.warning };
        const action = command.args[0] ?? "list";
        if (action === "start") {
          const title = command.args[1];
          const objective = command.args.slice(2).join(" ");
          if (!title || !objective) return { ok: false, output: "Usage: /task start \"<title>\" \"<objective>\" for <project>", warning: routed.warning };
          const task = createTask(project.path, project.id, title, objective);
          output = `Created task ${task.id}\nTitle: ${task.title}\nStatus: ${task.status}`;
        } else if (action === "list") {
          const tasks = listTasks(project.path);
          output = tasks.length ? `Tasks: ${project.name}\n${tasks.map(task => `- ${task.id} | ${task.status} | ${task.title}`).join("\n")}` : `No tasks for ${project.name}.`;
        } else if (action === "show") {
          const task = getTask(project.path, command.args[1]);
          if (!task) return { ok: false, output: "Task not found.", warning: routed.warning };
          output = JSON.stringify(task, null, 2);
        } else if (action === "status") {
          const task = changeTaskStatus(project.path, command.args[1], command.args[2] as any);
          if (!task) return { ok: false, output: "Task not found.", warning: routed.warning };
          output = `Updated ${task.id} → ${task.status}`;
        } else if (action === "context") {
          const task = getTask(project.path, command.args[1]);
          if (!task) return { ok: false, output: "Task not found.", warning: routed.warning };
          output = formatContext(resolveTaskContext(project, task).context);
        } else {
          return { ok: false, output: `Unknown /task action: ${action}`, warning: routed.warning };
        }
        break;
      }
      case "handoff": {
        if (!project) return { ok: false, output: "Project target required. Use: /handoff for <project>", warning: routed.warning };
        const task = listTasks(project.path)
          .filter(task => ["in-progress", "blocked", "planned"].includes(task.status))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        const handoff = command.args[0] === "show" && command.args[1]
          ? getHandoff(project.path, command.args[1])
          : createHandoff(project.path, { projectId: project.id, task });
        if (!handoff) return { ok: false, output: "Handoff not found.", warning: routed.warning };
        output = formatHandoff(handoff);
        break;
      }
      case "resume": {
        if (!project) return { ok: false, output: "Project target required. Use: /resume for <project>", warning: routed.warning };
        const handoff = command.args[0] && command.args[0] !== "latest"
          ? getHandoff(project.path, command.args[0])
          : getLatestHandoff(project.path);
        if (!handoff) return { ok: false, output: `No handoff found for ${project.name}.`, warning: routed.warning };
        output = formatHandoff(handoff);
        break;
      }
      case "instructions": {
        if (!project) return { ok: false, output: "Project target required. Use: /instructions for <project>", warning: routed.warning };
        const resolution = resolveInstructions(orchestraxRoot(workspace), workspace.root, project);
        const requestedId = command.args[0];
        if (requestedId) {
          const instruction = findInstruction(resolution, requestedId);
          if (!instruction) return { ok: false, output: `Instruction not found: ${requestedId}`, warning: routed.warning };
          output = [`# ${instruction.id}`, `Version: ${instruction.version}`, `Source: ${instruction.source}`, "", instruction.content].join("\n");
        } else {
          output = joinLines([
            `Effective OrchestraX Rails: ${project.name}`,
            ...resolution.instructions.map(item => `- ${item.id}@${item.version} [${item.source}${item.required ? ", required" : ""}]${item.overrideable ? "" : " [immutable]"}`),
            ...resolution.conflicts.map(conflict => `! ${conflict}`)
          ]);
        }
        break;
      }
      case "agents":
      case "agent": {
        if (!project) return { ok: false, output: "Project target required. Use: /agents for <project>", warning: routed.warning };
        const resolution = resolveAgents(orchestraxRoot(workspace), workspace.root, project);
        const requestedId = command.args[0];
        if (requestedId && routed.definition.handler === "agent") {
          const agent = findAgent(resolution, requestedId);
          if (!agent) return { ok: false, output: `Agent not found: ${requestedId}`, warning: routed.warning };
          output = joinLines([
            `# ${agent.id}`,
            `Version: ${agent.version}`,
            `Role: ${agent.role}`,
            `Source: ${agent.source}`,
            `Capabilities: ${agent.capabilities.join(", ") || "none"}`,
            "",
            agent.content,
            "",
            "Instruction dependencies:",
            ...agent.resolvedInstructions.map(dep => `- ${dep.id}@${dep.version} | ${dep.required ? "required" : "optional"} | ${dep.available ? `available (${dep.source})` : "missing"}`),
            "",
            "Skill dependencies:",
            ...agent.resolvedSkills.map(dep => `- ${dep.id}@${dep.version} | ${dep.required ? "required" : "optional"} | ${dep.available ? `available (${dep.source})` : "missing"}`)
          ]);
        } else {
          output = joinLines([
            `Applicable OrchestraX Agents: ${project.name}`,
            ...resolution.agents.map(agent => `- ${agent.id}@${agent.version} [${agent.source}] — ${agent.role}`),
            ...resolution.conflicts.map(conflict => `! ${conflict}`)
          ]);
        }
        break;
      }
      case "skills":
      case "skill": {
        if (!project) return { ok: false, output: "Project target required. Use: /skills for <project>", warning: routed.warning };
        const resolution = resolveSkills(orchestraxRoot(workspace), workspace.root, project, routed.definition.handler === "skills" ? command.args[0] : undefined);
        const requestedId = routed.definition.handler === "skill" ? command.args[0] : undefined;
        if (requestedId) {
          const skill = findSkill(resolveAllSkills(orchestraxRoot(workspace), workspace.root, project), requestedId);
          if (!skill) return { ok: false, output: `Skill not found: ${requestedId}`, warning: routed.warning };
          output = [`# ${skill.id}`, `Version: ${skill.version}`, `Source: ${skill.source}`, `Category: ${skill.category}`, `Mapped agents: ${skill.appliesToAgents.join(", ") || "all"}`, "", skill.content].join("\n");
        } else {
          output = joinLines([
            `Effective OrchestraX Skills: ${project.name}`,
            ...resolution.skills.map(skill => `- ${skill.id}@${skill.version} [${skill.source}] — ${skill.description}`),
            ...resolution.conflicts.map(conflict => `! ${conflict}`)
          ]);
        }
        break;
      }
      case "pack": {
        const first = command.args[0];
        const isCompose = first === "compose";
        const packName = isCompose ? command.args[1] : first;
        if (!packName) return { ok: false, output: "Usage: /pack <pack> [compose] for <project>", warning: routed.warning };
        if (isCompose) {
          if (!project) return { ok: false, output: "Project target required. Use: /pack compose <pack> for <project>", warning: routed.warning };
          const composition = composePack(project, packName, orchestraxRoot(workspace), workspace.root);
          if (!composition) return { ok: false, output: `Pack not found or invalid: ${packName}`, warning: routed.warning };
          output = joinLines([
            `Pack Composition: ${packName} → ${project.name}`,
            "",
            "Resolved packs:",
            ...composition.order.map(item => `- ${item.pack.name}@${item.pack.version}`),
            "",
            `Compatibility: ${composition.compatibility.length ? "failed" : "ok"}`,
            ...composition.compatibility.map(item => `! ${item}`),
            ...composition.issues.map(issue => `${issue.required ? "!" : "~"} ${issue.message}`)
          ]);
          if (composition.issues.some(issue => issue.required) || composition.compatibility.length) return { ok: false, output, warning: routed.warning };
        } else {
          const graph = resolvePackGraph(path.join(packRoot(workspace), packName), roots);
          if (!graph) return { ok: false, output: `Pack not found or invalid: ${packName}`, warning: routed.warning };
          output = joinLines([
            `# ${graph.root.pack.name}`,
            `Version: ${graph.root.pack.version}`,
            `Description: ${graph.root.pack.description}`,
            "Pack dependencies:",
            ...graph.root.pack.dependencies.map(dep => `- ${dep.id}@${dep.version} | ${dep.required ? "required" : "optional"}`),
            "Resolved graph:",
            ...graph.order.map(item => `- ${item.pack.name}@${item.pack.version}`),
            ...graph.issues.map(issue => `${issue.required ? "!" : "~"} ${issue.message}`)
          ]);
        }
        break;
      }
      case "provider-sync": {
        if (!project) return { ok: false, output: "Project target required. Use: /provider-sync [provider] for <project>", warning: routed.warning };
        const provider = command.args[0];
        const results = provider ? [syncProvider(project, provider)] : syncAllProviders(project);
        output = joinLines([
          `Provider sync: ${project.name}`,
          ...results.flatMap(result => [
            `  ${result.provider}: wrote ${result.artifacts.length}, skipped ${result.skipped.length}`,
            ...result.artifacts.map(artifact => `    + ${artifact}`),
            ...result.skipped.map(artifact => `    ! ${artifact} (existing unmanaged file)`)
          ])
        ]);
        break;
      }
      default:
        return { ok: false, output: `Unsupported OrchestraX AI command handler: ${routed.definition.handler}`, warning: routed.warning };
    }
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error), warning: routed.warning };
  }

  return { ok: true, output, warning: routed.warning };
}
