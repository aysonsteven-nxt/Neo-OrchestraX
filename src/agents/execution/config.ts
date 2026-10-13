import fs from "node:fs";
import path from "node:path";
import type { AgentExecutorConfiguration, CommandAgentExecutorDefinition } from "./types.js";

export const EXECUTOR_CONFIG_RELATIVE_PATH = path.join(".orchestrax", "agent-executors.json");

export function executorConfigPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, EXECUTOR_CONFIG_RELATIVE_PATH);
}

export function exampleExecutorConfiguration(): AgentExecutorConfiguration {
  return {
    schema: "neo-orchestrax/agent-executors@1",
    defaultExecutor: "local-readonly-agent",
    executors: [{
      id: "local-readonly-agent",
      kind: "command",
      description: "Replace this example with a CLI that has verified OS-enforced read-only isolation.",
      command: "C:/path/to/your/agent-cli.exe",
      args: ["--prompt-stdin"],
      inputMode: "stdin",
      readOnlyVerified: false,
      timeoutMs: 120000,
      maxOutputBytes: 1048576
    }]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function validateExecutorConfiguration(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["Configuration must be a JSON object."];
  if (value.schema !== "neo-orchestrax/agent-executors@1") errors.push('schema must be "neo-orchestrax/agent-executors@1".');
  if (!Array.isArray(value.executors)) errors.push("executors must be an array.");
  if (value.defaultExecutor !== undefined && (typeof value.defaultExecutor !== "string" || !value.defaultExecutor.trim())) errors.push("defaultExecutor must be a non-empty string when provided.");
  if (!Array.isArray(value.executors)) return errors;

  const ids = new Set<string>();
  value.executors.forEach((item, index) => {
    const label = `executors[${index}]`;
    if (!isRecord(item)) { errors.push(`${label} must be an object.`); return; }
    if (typeof item.id !== "string" || !item.id.trim()) errors.push(`${label}.id must be a non-empty string.`);
    else {
      const key = item.id.toLowerCase();
      if (ids.has(key)) errors.push(`Duplicate executor id: ${item.id}.`);
      ids.add(key);
    }
    if (item.kind !== "command") errors.push(`${label}.kind must be "command".`);
    if (typeof item.command !== "string" || !item.command.trim()) errors.push(`${label}.command must be a non-empty executable path/name.`);
    if (!Array.isArray(item.args) || item.args.some(arg => typeof arg !== "string")) errors.push(`${label}.args must be an array of strings.`);
    if (item.inputMode !== "stdin" && item.inputMode !== "argument") errors.push(`${label}.inputMode must be "stdin" or "argument".`);
    if (typeof item.readOnlyVerified !== "boolean") errors.push(`${label}.readOnlyVerified must be a boolean.`);
    if (item.timeoutMs !== undefined && (!Number.isInteger(item.timeoutMs) || (item.timeoutMs as number) < 1000 || (item.timeoutMs as number) > 600000)) errors.push(`${label}.timeoutMs must be an integer from 1000 to 600000.`);
    if (item.maxOutputBytes !== undefined && (!Number.isInteger(item.maxOutputBytes) || (item.maxOutputBytes as number) < 1024 || (item.maxOutputBytes as number) > 10485760)) errors.push(`${label}.maxOutputBytes must be an integer from 1024 to 10485760.`);
    if (item.env !== undefined && (!isRecord(item.env) || Object.values(item.env).some(entry => typeof entry !== "string"))) errors.push(`${label}.env must be an object containing string values.`);
    if (item.inputMode === "argument" && Array.isArray(item.args) && item.args.filter(arg => arg === "{prompt}").length !== 1) errors.push(`${label}.args must contain exactly one {prompt} placeholder when inputMode is "argument".`);
  });
  const defaultExecutor = typeof value.defaultExecutor === "string" ? value.defaultExecutor : undefined;
  if (defaultExecutor && Array.isArray(value.executors) && !value.executors.some(item => isRecord(item) && typeof item.id === "string" && item.id.toLowerCase() === defaultExecutor.toLowerCase())) {
    errors.push(`defaultExecutor "${defaultExecutor}" does not match an executor id.`);
  }
  return errors;
}

export function loadExecutorConfiguration(workspaceRoot: string): AgentExecutorConfiguration | undefined {
  const file = executorConfigPath(workspaceRoot);
  if (!fs.existsSync(file)) return undefined;
  let parsed: unknown;
  try { parsed = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`Cannot parse ${file}: ${error instanceof Error ? error.message : String(error)}`); }
  const errors = validateExecutorConfiguration(parsed);
  if (errors.length) throw new Error(`Invalid agent executor configuration at ${file}:\n${errors.map(error => `- ${error}`).join("\n")}`);
  return parsed as AgentExecutorConfiguration;
}

export function findExecutor(configuration: AgentExecutorConfiguration, id?: string): CommandAgentExecutorDefinition | undefined {
  const selected = id ?? configuration.defaultExecutor;
  if (!selected) return undefined;
  return configuration.executors.find(executor => executor.id.toLowerCase() === selected.toLowerCase());
}
