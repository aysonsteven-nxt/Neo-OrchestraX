import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCommands } from "../commands/registry.js";
import { getProvider } from "./adapters.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const commandsRoot = path.join(root, "commands");
const provider = getProvider("copilot");
if (!provider) throw new Error("Copilot provider adapter is not registered.");

const commands = loadCommands(commandsRoot);
const artifacts = provider.generateCommandArtifacts(commands);
const pluginRoot = path.join(root, "providers", "copilot");

fs.rmSync(pluginRoot, { recursive: true, force: true });
fs.mkdirSync(pluginRoot, { recursive: true });

const manifest = {
  $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  name: "neo-orchestrax",
  description: "Neo OrchestraX provider projection for GitHub Copilot.",
  version: "0.14.7",
  author: { name: "NeoQuantum Software Labs" },
  keywords: ["neo-orchestrax", "orchestration", "ai-development"]
};
fs.writeFileSync(path.join(pluginRoot, "plugin.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

for (const artifact of artifacts) {
  const absolute = path.join(root, artifact.relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, artifact.content + "\n", "utf8");
}

console.log(`Copilot plugin projected ${artifacts.length} AI commands → ${path.relative(process.cwd(), pluginRoot)}`);
