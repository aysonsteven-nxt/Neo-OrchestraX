import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentExecutor } from "../src/agents/execution/types.js";
import { CommandAgentExecutor } from "../src/agents/execution/command-executor.js";
import { prepareStoryCollaboration, collaborateOnStory } from "../src/agents/execution/story-collaboration.js";
import { setProjectContextOrchestraxRoot } from "../src/project-context.js";
import type { Project, Workspace } from "../src/workspace/types.js";

interface Fixture {
  root: string;
  workspace: Workspace;
  project: Project;
  storyFile: string;
  cleanup(): void;
}

function fixture(): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neo-orchestrax-v019-"));
  const workspaceRoot = path.join(root, "workspace");
  const projectPath = path.join(root, "project");
  const orchestraxRoot = path.join(root, "orchestrax");
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.mkdirSync(projectPath, { recursive: true });
  const agentDir = path.join(orchestraxRoot, "defaults", "agents", "story-reviewer");
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, "agent.json"), JSON.stringify({
    id: "story-reviewer", version: "1.0.0", description: "Reviews story quality", role: "Reviewer",
    capabilities: ["story-analysis"], appliesTo: ["*"], requiredInstructions: [], skills: [], overrideable: true, priority: 0
  }, null, 2));
  fs.writeFileSync(path.join(agentDir, "agent.md"), "Review the story for ambiguity and acceptance-criteria gaps.");

  const project: Project = { id: "sample-project", name: "Sample Project", path: projectPath };
  const workspace: Workspace = {
    root: workspaceRoot, orchestraxRoot, installationRoot: orchestraxRoot,
    initialized: true, scope: "workspace", projects: [project]
  };
  setProjectContextOrchestraxRoot(orchestraxRoot);
  const storyDir = path.join(workspaceRoot, "sample-project-docs", "board", "stories");
  fs.mkdirSync(storyDir, { recursive: true });
  const storyFile = path.join(storyDir, "US-1.json");
  fs.writeFileSync(storyFile, JSON.stringify({
    id: "US-1", title: "Track a transaction", description: "As a user, I can track a transaction.",
    acceptanceCriteria: ["The transaction is saved"], status: "todo", priority: "medium", subtasks: [], comments: []
  }, null, 2));
  return { root, workspace, project, storyFile, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test("prepares an analysis prompt with story, agent instructions, and read-only constraints", () => {
  const f = fixture();
  try {
    const prepared = prepareStoryCollaboration(f.workspace, f.project, "US-1", "story-reviewer");
    assert.equal(prepared.payload.schema, "neo-orchestrax/story-analysis@1");
    assert.equal(prepared.payload.storyId, "US-1");
    assert.match(prepared.prompt, /Track a transaction/);
    assert.match(prepared.prompt, /Review the story for ambiguity/);
    assert.match(prepared.prompt, /Do not create, edit, delete, or execute project files/);
  } finally { f.cleanup(); }
});

test("persists a successful executor response as one attributed story comment", async () => {
  const f = fixture();
  try {
    const executor: AgentExecutor = {
      id: "fake-readonly",
      async execute(request) {
        assert.equal(request.storyId, "US-1");
        return { ok: true, response: "The acceptance criteria do not define duplicate handling.", durationMs: 7 };
      }
    };
    const result = await collaborateOnStory(f.workspace, f.project, "US-1", "story-reviewer", executor);
    assert.match(result.comment.author, /agent:story-reviewer via fake-readonly/);
    const story = JSON.parse(fs.readFileSync(f.storyFile, "utf8")) as { comments: Array<{ author: string; content: string }> };
    assert.equal(story.comments.length, 1);
    assert.match(story.comments[0].content, /duplicate handling/);
    assert.match(story.comments[0].content, /Executor: fake-readonly/);
  } finally { f.cleanup(); }
});

test("does not write a comment when the executor fails", async () => {
  const f = fixture();
  try {
    const executor: AgentExecutor = { id: "failing", async execute() { return { ok: false, error: "model unavailable" }; } };
    await assert.rejects(() => collaborateOnStory(f.workspace, f.project, "US-1", "story-reviewer", executor), /model unavailable/);
    const story = JSON.parse(fs.readFileSync(f.storyFile, "utf8")) as { comments: unknown[] };
    assert.equal(story.comments.length, 0);
  } finally { f.cleanup(); }
});

test("blocks command execution unless read-only isolation was verified", async () => {
  const f = fixture();
  try {
    const prepared = prepareStoryCollaboration(f.workspace, f.project, "US-1", "story-reviewer");
    const executor = new CommandAgentExecutor({
      id: "unverified", kind: "command", command: process.execPath,
      args: ["-e", "process.stdout.write('must not run')"], inputMode: "stdin", readOnlyVerified: false
    });
    const result = await executor.execute(prepared.request);
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /read-only isolation/);
  } finally { f.cleanup(); }
});

test("command executor sends the prompt over stdin and returns stdout", async () => {
  const f = fixture();
  try {
    const prepared = prepareStoryCollaboration(f.workspace, f.project, "US-1", "story-reviewer");
    const executor = new CommandAgentExecutor({
      id: "test-process", kind: "command", command: process.execPath,
      args: ["-e", "let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>process.stdout.write(s.includes('US-1')?'story-received':'story-missing'))"],
      inputMode: "stdin", readOnlyVerified: true, timeoutMs: 5000
    });
    const result = await executor.execute(prepared.request);
    assert.equal(result.ok, true);
    assert.equal(result.response, "story-received");
  } finally { f.cleanup(); }
});
