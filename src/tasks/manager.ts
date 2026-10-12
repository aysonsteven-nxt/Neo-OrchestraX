import crypto from "node:crypto"; import type {Task,TaskStatus} from "./types.js"; import {addTask,findTask,readTasks,updateTask} from "./store.js";
export function createTask(p:string,projectId:string,title:string,objective:string):Task{
 const now=new Date().toISOString();const t:Task={id:crypto.randomUUID(),title,objective,status:"planned",projectId,relevantPacks:[],completedWork:[],inProgressWork:[],openQuestions:[],knownProblems:[],createdAt:now,updatedAt:now};addTask(p,t);return t}
export const listTasks=(p:string)=>readTasks(p); export const getTask=(p:string,id:string)=>findTask(p,id);
export const changeTaskStatus=(p:string,id:string,status:TaskStatus)=>updateTask(p,id,{status});
