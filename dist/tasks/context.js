import { resolveContext } from "../context/resolver.js";
export function resolveTaskContext(project, task) {
    const query = [task.title, task.objective, task.contextQuery ?? "", ...task.openQuestions].filter(Boolean).join(" ");
    return { task, context: resolveContext(project, query) };
}
