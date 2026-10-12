import fs from "node:fs";
import path from "node:path";
import type { Project } from "./workspace/types.js";
import { projectHubPath } from "./project-hub/manager.js";
import { resolveAgents } from "./agents/resolver.js";
import { resolveInstructions } from "./instructions/resolver.js";
import { resolveSkills } from "./skills/resolver.js";

export interface ProjectComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectStory {
  id: string;
  epicId?: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: string;
  priority: string;
  subtasks: string[];
  comments: ProjectComment[];
  [key: string]: unknown;
}

export interface ProjectEpic {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  userStories: string[];
  comments?: ProjectComment[];
  [key: string]: unknown;
}

export interface ProjectSubtask {
  id: string;
  storyId: string;
  title: string;
  description?: string;
  status: string;
  completed: boolean;
  comments?: ProjectComment[];
  [key: string]: unknown;
}

function readJson<T>(file: string): T | undefined {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return undefined; }
}

function filesIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry: { isFile(): boolean; name: string }) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry: { name: string }) => path.join(dir, entry.name));
}

export function getProjectHubRoot(workspaceRoot: string, project: Pick<Project, "path" | "id">): string {
  return projectHubPath(workspaceRoot, project);
}

export function listProjectEpics(workspaceRoot: string, project: Pick<Project, "path" | "id">): ProjectEpic[] {
  return filesIn(path.join(getProjectHubRoot(workspaceRoot, project), "board", "epics"))
    .map(file => readJson<ProjectEpic>(file)).filter((value): value is ProjectEpic => !!value);
}

export function listProjectStories(workspaceRoot: string, project: Pick<Project, "path" | "id">): ProjectStory[] {
  return filesIn(path.join(getProjectHubRoot(workspaceRoot, project), "board", "stories"))
    .map(file => readJson<ProjectStory>(file)).filter((value): value is ProjectStory => !!value);
}

export function listProjectSubtasks(workspaceRoot: string, project: Pick<Project, "path" | "id">): ProjectSubtask[] {
  return filesIn(path.join(getProjectHubRoot(workspaceRoot, project), "board", "subtasks"))
    .map(file => readJson<ProjectSubtask>(file)).filter((value): value is ProjectSubtask => !!value);
}

export function getProjectStory(workspaceRoot: string, project: Pick<Project, "path" | "id">, storyId: string): ProjectStory | undefined {
  return listProjectStories(workspaceRoot, project).find(story => story.id.toLowerCase() === storyId.toLowerCase());
}

export function resolveProjectStoryContext(workspaceRoot: string, project: Project, storyId: string): Record<string, unknown> | undefined {
  const story = getProjectStory(workspaceRoot, project, storyId);
  if (!story) return undefined;
  const epics = listProjectEpics(workspaceRoot, project);
  const subtasks = listProjectSubtasks(workspaceRoot, project).filter(item => item.storyId.toLowerCase() === story.id.toLowerCase());
  const epic = story.epicId ? epics.find(item => item.id.toLowerCase() === story.epicId?.toLowerCase()) : undefined;
  const agents = resolveAgents(projectHubOrchestraxRoot(project), workspaceRoot, project);
  const instructions = resolveInstructions(projectHubOrchestraxRoot(project), workspaceRoot, project);
  const skills = resolveSkills(projectHubOrchestraxRoot(project), workspaceRoot, project);

  return {
    project: { id: project.id, name: project.name },
    story,
    epic,
    subtasks,
    collaboration: {
      comments: story.comments ?? [],
      availableAgents: agents.agents.map(agent => ({ id: agent.id, version: agent.version, role: agent.role, capabilities: agent.capabilities })),
      effectiveInstructions: instructions.instructions.map(item => ({ id: item.id, version: item.version, required: item.required })),
      effectiveSkills: skills.skills.map(item => ({ id: item.id, version: item.version, category: item.category }))
    }
  };
}

// The project Hub is data owned by the workspace; the effective agent/skill resolvers
// need OrchestraX's installation root. This is filled by the caller before context
// resolution through a lightweight runtime override.
let runtimeOrchestraxRoot: string | undefined;
export function setProjectContextOrchestraxRoot(root: string): void { runtimeOrchestraxRoot = root; }
function projectHubOrchestraxRoot(_project: Project): string {
  if (!runtimeOrchestraxRoot) throw new Error("Neo OrchestraX installation root is not initialized.");
  return runtimeOrchestraxRoot;
}

export function addStoryComment(workspaceRoot: string, project: Project, storyId: string, author: string, content: string): ProjectComment | undefined {
  const story = getProjectStory(workspaceRoot, project, storyId);
  if (!story) return undefined;
  const dir = path.join(getProjectHubRoot(workspaceRoot, project), "board", "stories");
  const files = filesIn(dir);
  const target = files.find(file => readJson<ProjectStory>(file)?.id?.toLowerCase() === storyId.toLowerCase());
  if (!target) return undefined;
  const now = new Date().toISOString();
  const comment: ProjectComment = { id: `C-${Date.now().toString(36)}`, author, content, createdAt: now };
  story.comments = [...(story.comments ?? []), comment];
  fs.writeFileSync(target, JSON.stringify(story, null, 2) + "\n", "utf8");
  return comment;
}

export function buildProjectAiContext(workspaceRoot: string, project: Project): Record<string, unknown> {
  const hubRoot = getProjectHubRoot(workspaceRoot, project);
  const hub = readJson<Record<string, unknown>>(path.join(hubRoot, "hub.json"));
  const board = readJson<Record<string, unknown>>(path.join(hubRoot, "board", "board.json"));
  const epics = listProjectEpics(workspaceRoot, project);
  const stories = listProjectStories(workspaceRoot, project);
  const subtasks = listProjectSubtasks(workspaceRoot, project);
  const agents = resolveAgents(projectHubOrchestraxRoot(project), workspaceRoot, project);
  const instructions = resolveInstructions(projectHubOrchestraxRoot(project), workspaceRoot, project);
  const skills = resolveSkills(projectHubOrchestraxRoot(project), workspaceRoot, project);

  return {
    schema: "neo-orchestrax/project-context@1",
    project: { id: project.id, name: project.name, path: project.path },
    hub,
    board,
    epics,
    stories,
    subtasks,
    collaboration: {
      comments: stories.flatMap(story => (story.comments ?? []).map(comment => ({ storyId: story.id, ...comment }))),
      agents: agents.agents.map(agent => ({ id: agent.id, version: agent.version, role: agent.role, capabilities: agent.capabilities })),
      instructions: instructions.instructions.map(item => ({ id: item.id, version: item.version, required: item.required })),
      skills: skills.skills.map(item => ({ id: item.id, version: item.version, category: item.category }))
    }
  };
}
