import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { AgentExecutionRequest, AgentExecutionResult, AgentExecutor, CommandAgentExecutorDefinition } from "./types.js";

const PLACEHOLDERS: Record<string, (request: AgentExecutionRequest) => string> = {
  "{agentId}": request => request.agent.id,
  "{projectId}": request => request.project.id,
  "{projectName}": request => request.project.name,
  "{projectPath}": request => request.project.path,
  "{storyId}": request => request.storyId,
  "{workspaceRoot}": request => request.workspaceRoot,
  "{prompt}": request => request.prompt
};

function expandArgument(argument: string, request: AgentExecutionRequest): string {
  return Object.entries(PLACEHOLDERS).reduce((value, [token, resolve]) => value.split(token).join(resolve(request)), argument);
}

export class CommandAgentExecutor implements AgentExecutor {
  readonly id: string;
  private readonly definition: CommandAgentExecutorDefinition;

  constructor(definition: CommandAgentExecutorDefinition) {
    this.id = definition.id;
    this.definition = definition;
  }

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    if (!this.definition.readOnlyVerified) {
      return { ok: false, error: `Executor "${this.id}" is blocked: readOnlyVerified is not true. Verify OS-enforced read-only isolation before enabling this executor.` };
    }
    const args = this.definition.args.map(argument => expandArgument(argument, request));
    const startedAt = Date.now();
    const timeoutMs = this.definition.timeoutMs ?? 120000;
    const maxOutputBytes = this.definition.maxOutputBytes ?? 1048576;

    return await new Promise<AgentExecutionResult>(resolve => {
      let settled = false;
      let stdout = "";
      let stderr = "";
      let totalBytes = 0;
      let timedOut = false;
      let outputLimitExceeded = false;
      const finish = (result: AgentExecutionResult): void => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        resolve({ ...result, durationMs: Date.now() - startedAt });
      };

      let child: ChildProcessWithoutNullStreams;
      let timeout: NodeJS.Timeout | undefined;
      try {
        child = spawn(this.definition.command, args, {
          cwd: request.project.path,
          shell: false,
          windowsHide: true,
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, ...(this.definition.env ?? {}) }
        });
      } catch (error) {
        finish({ ok: false, error: `Unable to start executor "${this.id}": ${error instanceof Error ? error.message : String(error)}` });
        return;
      }

      timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);

      const append = (target: "stdout" | "stderr", chunk: Buffer | string): void => {
        const text = chunk.toString();
        totalBytes += Buffer.byteLength(text, "utf8");
        if (totalBytes > maxOutputBytes) {
          outputLimitExceeded = true;
          child.kill();
          return;
        }
        if (target === "stdout") stdout += text;
        else stderr += text;
      };

      child.stdout.on("data", (chunk: Buffer | string) => append("stdout", chunk));
      child.stderr.on("data", (chunk: Buffer | string) => append("stderr", chunk));
      child.on("error", error => finish({ ok: false, error: `Unable to start executor "${this.id}": ${error.message}` }));
      child.on("close", code => {
        if (timedOut) return finish({ ok: false, error: `Executor "${this.id}" timed out after ${timeoutMs} ms.`, exitCode: code });
        if (outputLimitExceeded) return finish({ ok: false, error: `Executor "${this.id}" exceeded the ${maxOutputBytes}-byte output limit.`, exitCode: code });
        if (code !== 0) return finish({ ok: false, error: stderr.trim() || `Executor "${this.id}" exited with code ${String(code)}.`, exitCode: code });
        const response = stdout.trim();
        if (!response) return finish({ ok: false, error: stderr.trim() || `Executor "${this.id}" returned an empty response.`, exitCode: code });
        finish({ ok: true, response, exitCode: code });
      });

      if (this.definition.inputMode === "stdin") child.stdin.end(request.prompt, "utf8");
      else child.stdin.end();
    });
  }
}
