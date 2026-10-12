import fs from "node:fs";
import path from "node:path";
import type { Handoff } from "./types.js";

const root = (p: string) => path.join(p, ".orchestrax", "handoff");
const file = (p: string) => path.join(root(p), "handoffs.json");

function ensure(p: string) {
  fs.mkdirSync(root(p), { recursive: true });
  if (!fs.existsSync(file(p))) fs.writeFileSync(file(p), "[]\n");
}

export function readHandoffs(p: string): Handoff[] {
  ensure(p);
  try { return JSON.parse(fs.readFileSync(file(p), "utf8")) as Handoff[]; }
  catch { return []; }
}

export function writeHandoffs(p: string, handoffs: Handoff[]) {
  ensure(p);
  fs.writeFileSync(file(p), JSON.stringify(handoffs, null, 2) + "\n");
}

export function addHandoff(p: string, handoff: Handoff) {
  writeHandoffs(p, [...readHandoffs(p), handoff]);
}

export function latestHandoff(p: string): Handoff | undefined {
  return [...readHandoffs(p)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function findHandoff(p: string, id: string): Handoff | undefined {
  return readHandoffs(p).find(h => h.id === id);
}
