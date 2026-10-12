import crypto from "node:crypto";
import { addHandoff, findHandoff, latestHandoff, readHandoffs } from "./store.js";
export function createHandoff(projectPath, input) {
    const now = new Date().toISOString();
    const task = input.task;
    const handoff = {
        id: crypto.randomUUID(),
        projectId: input.projectId,
        taskId: task?.id,
        title: task?.title ?? "Workspace session",
        objective: task?.objective ?? "Continue the current project work.",
        taskStatus: task?.status,
        completedWork: [...(task?.completedWork ?? [])],
        inProgressWork: [...(task?.inProgressWork ?? [])],
        openQuestions: [...(task?.openQuestions ?? [])],
        knownProblems: [...(task?.knownProblems ?? [])],
        nextAction: task?.nextAction,
        activeFiles: [...(input.activeFiles ?? [])],
        recentChanges: [...(input.recentChanges ?? [])],
        decisions: [...(input.decisions ?? [])],
        constraints: [...(input.constraints ?? [])],
        provider: input.provider,
        agent: input.agent,
        session: input.session,
        createdAt: now
    };
    addHandoff(projectPath, handoff);
    return handoff;
}
export const getLatestHandoff = (projectPath) => latestHandoff(projectPath);
export const getHandoff = (projectPath, id) => findHandoff(projectPath, id);
export const listHandoffs = (projectPath) => readHandoffs(projectPath);
