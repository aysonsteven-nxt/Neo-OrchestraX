import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { InstructionDefinition, InstructionSource } from "./types.js";

const sources: InstructionSource[] = ["default", "user", "workspace", "project"];

function readInstructionDirectory(root: string, source: InstructionSource): InstructionDefinition[] {
  if (!fs.existsSync(root)) return [];
  const result: InstructionDefinition[] = [];

  function visit(dir: string): void {
    const manifest = path.join(dir, "instruction.json");
    const contentFile = path.join(dir, "instruction.md");
    if (fs.existsSync(manifest) || fs.existsSync(contentFile)) {
      if (!fs.existsSync(manifest) || !fs.existsSync(contentFile)) return;
      try {
        const metadata = JSON.parse(fs.readFileSync(manifest, "utf8")) as Partial<InstructionDefinition>;
        result.push({
          id: metadata.id ?? path.basename(dir),
          version: metadata.version ?? "0.0.0",
          description: metadata.description ?? "",
          category: metadata.category ?? "general",
          appliesTo: Array.isArray(metadata.appliesTo) ? metadata.appliesTo : ["*"],
          required: metadata.required ?? false,
          overrideable: metadata.overrideable ?? true,
          priority: typeof metadata.priority === "number" ? metadata.priority : 0,
          source,
          content: fs.readFileSync(contentFile, "utf8").trim(),
          sourcePath: dir
        });
      } catch {
        // Invalid instruction definitions are reported by validation rather than crashing discovery.
      }
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) visit(path.join(dir, entry.name));
    }
  }

  visit(root);
  return result;
}

export function defaultInstructionsRoot(orchestraxRoot: string): string {
  return path.join(orchestraxRoot, "defaults", "instructions");
}

export function userInstructionsRoot(): string {
  return path.join(os.homedir(), ".orchestrax", "instructions");
}

export function workspaceInstructionsRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".orchestrax", "instructions");
}

export function projectInstructionsRoot(projectPath: string): string {
  return path.join(projectPath, ".orchestrax", "instructions");
}

export function loadInstructions(orchestraxRoot: string, workspaceRoot: string, projectPath: string): InstructionDefinition[] {
  const roots: Array<[InstructionSource, string]> = [
    ["default", defaultInstructionsRoot(orchestraxRoot)],
    ["user", userInstructionsRoot()],
    ["workspace", workspaceInstructionsRoot(workspaceRoot)],
    ["project", projectInstructionsRoot(projectPath)]
  ];
  return roots.flatMap(([source, root]) => readInstructionDirectory(root, source));
}

export function validateInstructionDirectory(dir: string): string[] {
  const errors: string[] = [];
  const manifest = path.join(dir, "instruction.json");
  const content = path.join(dir, "instruction.md");
  if (!fs.existsSync(manifest)) errors.push("Missing instruction.json");
  if (!fs.existsSync(content)) errors.push("Missing instruction.md");
  if (errors.length) return errors;

  try {
    const metadata = JSON.parse(fs.readFileSync(manifest, "utf8")) as Record<string, unknown>;
    for (const key of ["id", "version", "description", "category"]) {
      if (typeof metadata[key] !== "string" || !(metadata[key] as string).trim()) errors.push(`Missing ${key}`);
    }
    if (metadata.appliesTo !== undefined && !Array.isArray(metadata.appliesTo)) errors.push("appliesTo must be an array");
    if (metadata.required !== undefined && typeof metadata.required !== "boolean") errors.push("required must be boolean");
    if (metadata.overrideable !== undefined && typeof metadata.overrideable !== "boolean") errors.push("overrideable must be boolean");
    if (metadata.priority !== undefined && typeof metadata.priority !== "number") errors.push("priority must be a number");
  } catch {
    errors.push("Invalid JSON in instruction.json");
  }
  return errors;
}

export function listInstructionDirectories(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const result: string[] = [];
  function visit(dir: string): void {
    if (fs.existsSync(path.join(dir, "instruction.json"))) result.push(dir);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) visit(path.join(dir, entry.name));
    }
  }
  visit(root);
  return result.sort();
}

export function sourceOrder(source: InstructionSource): number {
  return sources.indexOf(source);
}
