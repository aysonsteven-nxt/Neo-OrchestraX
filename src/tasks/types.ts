export type TaskStatus = "planned"|"in-progress"|"blocked"|"completed"|"cancelled";
export interface Task {
 id:string; title:string; objective:string; status:TaskStatus; projectId:string;
 relevantPacks:string[]; contextQuery?:string; completedWork:string[];
 inProgressWork:string[]; openQuestions:string[]; knownProblems:string[];
 nextAction?:string; createdAt:string; updatedAt:string;
}
