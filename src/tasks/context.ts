import type {Project} from "../index.js"; import {resolveContext} from "../context/resolver.js"; import type {Task} from "./types.js";
export function resolveTaskContext(project:Project,task:Task){
 const query=[task.title,task.objective,task.contextQuery??"",...task.openQuestions].filter(Boolean).join(" ");
 return {task,context:resolveContext(project,query)};
}
