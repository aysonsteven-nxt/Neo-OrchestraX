import fs from "node:fs";
import path from "node:path";
import type { PackMetadata } from "./types.js";

export function loadPackRegistry(packsRoot: string): PackMetadata[] {
  if (!fs.existsSync(packsRoot)) return [];

  const result: PackMetadata[] = [];
  for (const entry of fs.readdirSync(packsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const manifest = path.join(packsRoot, entry.name, "pack.json");
    if (!fs.existsSync(manifest)) continue;

    try {
      const metadata = JSON.parse(fs.readFileSync(manifest, "utf8")) as PackMetadata;
      result.push(metadata);
    } catch {
      // Invalid manifests are handled by validation.
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function findPack(packsRoot: string, name: string): PackMetadata | undefined {
  return loadPackRegistry(packsRoot).find(
    p => p.name.toLowerCase() === name.trim().toLowerCase()
  );
}
