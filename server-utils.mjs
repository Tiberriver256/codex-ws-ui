import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function normalizeDiffPath(diffPath) {
  if (!diffPath) return "unknown";
  let normalized = String(diffPath).replaceAll("\\", "/");
  normalized = normalized.replace(/^\\.\//, "");
  if (normalized.startsWith("/")) normalized = normalized.slice(1);
  return normalized || "unknown";
}

async function readTextFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function tryGetGitRepoRoot(cwd) {
  try {
    const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
    });
    if (result.status !== 0) return null;
    const root = (result.stdout || "").trim();
    return root || null;
  } catch {
    return null;
  }
}

function tryReadGitHeadFile(repoRoot, absPath) {
  const relative = path.relative(repoRoot, absPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const gitPath = relative.split(path.sep).join("/");
  try {
    const result = spawnSync("git", ["show", `HEAD:${gitPath}`], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (result.status !== 0) return null;
    return result.stdout || null;
  } catch {
    return null;
  }
}

async function makeUnifiedDiff({ beforeText, afterText, displayPath }) {
  const normalizedPath = normalizeDiffPath(displayPath);
  if ((beforeText || "") === (afterText || "")) {
    return `diff --git a/${normalizedPath} b/${normalizedPath}\n(no changes)\n`;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-ws-ui-diff-"));
  const beforeFile = path.join(tempDir, "before");
  const afterFile = path.join(tempDir, "after");
  try {
    await fs.writeFile(beforeFile, beforeText || "", "utf8");
    await fs.writeFile(afterFile, afterText || "", "utf8");

    let diffOutput = "";
    try {
      const result = spawnSync(
        "git",
        ["diff", "--no-index", "--unified=3", "--no-color", "--", beforeFile, afterFile],
        { encoding: "utf8" }
      );
      diffOutput = result.stdout || "";
      if (!diffOutput && result.stderr) {
        diffOutput = String(result.stderr);
      }
    } catch {
      diffOutput = "";
    }

    if (!diffOutput) {
      return `diff --git a/${normalizedPath} b/${normalizedPath}\n(no diff available)\n`;
    }

    diffOutput = diffOutput
      .replaceAll(`a${beforeFile}`, `a/${normalizedPath}`)
      .replaceAll(`b${afterFile}`, `b/${normalizedPath}`);

    const MAX_DIFF_CHARS = 200_000;
    if (diffOutput.length > MAX_DIFF_CHARS) {
      diffOutput = diffOutput.slice(0, MAX_DIFF_CHARS) + "\n… diff truncated …\n";
    }

    return diffOutput;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export { readTextFile, tryGetGitRepoRoot, tryReadGitHeadFile, makeUnifiedDiff };
