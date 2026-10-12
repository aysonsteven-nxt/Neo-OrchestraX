import crypto from "node:crypto";
import { addTask, findTask, readTasks, updateTask } from "./store.js";
export function createTask(p, projectId, title, objective) {
    const now = new Date().toISOString();
    const t = { id: crypto.randomUUID(), title, objective, status: "planned", projectId, relevantPacks: [], completedWork: [], inProgressWork: [], openQuestions: [], knownProblems: [], createdAt: now, updatedAt: now };
    addTask(p, t);
    return t;
}
export const listTasks = (p) => readTasks(p);
export const getTask = (p, id) => findTask(p, id);
export const changeTaskStatus = (p, id, status) => updateTask(p, id, { status });
