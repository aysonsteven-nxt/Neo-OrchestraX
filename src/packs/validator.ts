import fs from "node:fs";
import path from "node:path";
import type { PackMetadata } from "./types.js";
import { normalizePackMetadata, resolvePackGraph } from "./resolver.js";

export interface PackValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: PackMetadata;
}

function validateDependencyArray(name: string, value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) { errors.push(`${name} must be an array`); return; }
  for (const item of value) {
    if (!item || typeof item !== "object") { errors.push(`Each ${name} item must be an object`); continue; }
    const d = item as Record<string, unknown>;
    if (typeof d.id !== "string" || !d.id.trim()) errors.push(`Each ${name} item requires id`);
    if (typeof d.version !== "string" || !d.version.trim()) errors.push(`Each ${name} item requires version`);
    if (typeof d.required !== "boolean") errors.push(`Each ${name} item requires required=true/false`);
  }
}

export function validatePack(packPath: string, dependencyRoots: string[] = []): PackValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const manifestPath = path.join(packPath, "pack.json");

  if (!fs.existsSync(manifestPath)) return { valid: false, errors: ["Missing pack.json"], warnings };

  let metadata: PackMetadata;
  try { metadata = normalizePackMetadata(JSON.parse(fs.readFileSync(manifestPath, "utf8")) as PackMetadata); }
  catch { return { valid: false, errors: ["Invalid JSON in pack.json"], warnings }; }

  if (!metadata.name?.trim()) errors.push("Missing name");
  if (!metadata.version?.trim()) errors.push("Missing version");
  if (!metadata.description?.trim()) errors.push("Missing description");
  if (!Array.isArray(metadata.capabilities)) errors.push("capabilities must be an array");
  validateDependencyArray("instructions", metadata.instructions, errors);
  validateDependencyArray("agents", metadata.agents, errors);
  validateDependencyArray("skills", metadata.skills, errors);
  validateDependencyArray("dependencies", metadata.dependencies, errors);

  if (errors.length) return { valid: false, errors, warnings, metadata };

  const graph = resolvePackGraph(packPath, dependencyRoots);
  if (!graph) return { valid: false, errors: ["Unable to resolve pack graph"], warnings, metadata };
  errors.push(...graph.issues.filter(i => i.required).map(i => i.message));
  warnings.push(...graph.issues.filter(i => !i.required).map(i => i.message));

  const resourceRoots = dependencyRoots;
  for (const resource of [
    ...metadata.instructions.map(d => ["instruction", d] as const),
    ...metadata.agents.map(d => ["agent", d] as const),
    ...metadata.skills.map(d => ["skill", d] as const)
  ]) {
    if (resource[1].required && resourceRoots.length === 0) warnings.push(`Cannot resolve ${resource[0]} dependency ${resource[1].id} without resource roots.`);
  }

  return { valid: errors.length === 0, errors, warnings, metadata };
}
