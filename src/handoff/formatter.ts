import type { Handoff } from "./types.js";

function section(title: string, items: string[]) {
  if (!items.length) return "";
  return `\n${title}:\n${items.map(i => `  - ${i}`).join("\n")}`;
}

export function formatHandoff(h: Handoff): string {
  const lines = [
    `Handoff: ${h.id}`,
    `Project: ${h.projectId}`,
    `Task: ${h.title}${h.taskId ? ` (${h.taskId})` : ""}`,
    `Objective: ${h.objective}`,
    h.taskStatus ? `Task status: ${h.taskStatus}` : "",
    h.nextAction ? `Next action: ${h.nextAction}` : "",
    h.provider ? `Provider: ${h.provider}` : "",
    h.agent ? `Agent: ${h.agent}` : "",
    h.session ? `Session: ${h.session}` : "",
    section("Completed work", h.completedWork),
    section("In-progress work", h.inProgressWork),
    section("Active files", h.activeFiles),
    section("Recent changes", h.recentChanges),
    section("Decisions", h.decisions),
    section("Constraints", h.constraints),
    section("Open questions", h.openQuestions),
    section("Known problems", h.knownProblems),
    `Created: ${h.createdAt}`
  ].filter(Boolean);
  return lines.join("\n");
}
