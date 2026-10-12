import fs from "node:fs"; import path from "node:path"; import type {Task} from "./types.js";
const root=(p:string)=>path.join(p,".orchestrax","tasks"), file=(p:string)=>path.join(root(p),"tasks.json");
function ensure(p:string){fs.mkdirSync(root(p),{recursive:true});if(!fs.existsSync(file(p)))fs.writeFileSync(file(p),"[]\n")}
export function readTasks(p:string):Task[]{ensure(p);try{return JSON.parse(fs.readFileSync(file(p),"utf8")) as Task[]}catch{return[]}}
export function writeTasks(p:string,t:Task[]){ensure(p);fs.writeFileSync(file(p),JSON.stringify(t,null,2)+"\n")}
export function addTask(p:string,t:Task){writeTasks(p,[...readTasks(p),t])}
export function findTask(p:string,id:string){return readTasks(p).find(t=>t.id===id)}
export function updateTask(p:string,id:string,patch:Partial<Task>){const t=readTasks(p),i=t.findIndex(x=>x.id===id);if(i<0)return; t[i]={...t[i],...patch,updatedAt:new Date().toISOString()};writeTasks(p,t);return t[i]}
