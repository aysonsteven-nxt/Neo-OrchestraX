import fs from "node:fs";
import path from "node:path";
import type { PackMetadata } from "./types.js";

export interface PackValidation {
  valid: boolean;
  errors: string[];
  metadata?: PackMetadata;
}

export function validatePack(packPath: string): PackValidation {
  const errors: string[] = [];
  const manifestPath = path.join(packPath, "pack.json");

  if (!fs.existsSync(manifestPath)) {
    return { valid: false, errors: ["Missing pack.json"] };
  }

  let metadata: PackMetadata;
  try {
    metadata = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return { valid: false, errors: ["Invalid JSON in pack.json"] };
  }

  if (!metadata.name?.trim()) errors.push("Missing name");
  if (!metadata.version?.trim()) errors.push("Missing version");
  if (!metadata.description?.trim()) errors.push("Missing description");
  if (!Array.isArray(metadata.capabilities)) errors.push("capabilities must be an array");
  if (!Array.isArray(metadata.agents)) errors.push("agents must be an array");
  if (!Array.isArray(metadata.skills)) errors.push("skills must be an array");

  return { valid: errors.length === 0, errors, metadata };
}
