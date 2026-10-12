import crypto from "node:crypto";
import type { Task } from "../tasks/types.js";
import type { Handoff } from "./types.js";
import { addHandoff, findHandoff, latestHandoff, readHandoffs } from "./store.js";

export interface HandoffInput {
  projectId: string;
  task?: Task;
  activeFiles?: string[];
  recentChanges?: string[];
  decisions?: string[];
  constraints?: string[];
  provider?: string;
  agent?: string;
  session?: string;
}

export function createHandoff(projectPath: string, input: HandoffInput): Handoff {
  const now = new Date().toISOString();
  const task = input.task;
  const handoff: Handoff = {
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

export const getLatestHandoff = (projectPath: string) => latestHandoff(projectPath);
export const getHandoff = (projectPath: string, id: string) => findHandoff(projectPath, id);
export const listHandoffs = (projectPath: string) => readHandoffs(projectPath);
