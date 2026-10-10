#!/usr/bin/env node
import { run } from "../src/run.mjs";

const [, , command, ...args] = process.argv;
const VALID_COMMANDS = new Set(["dev", "build", "preview"]);

if (!VALID_COMMANDS.has(command)) {
  console.error(
    `Usage: remote-astro-theme <dev|build|preview> [--dir <folder>] [astro args...]\n\nRun from a content repo's root directory. <folder> (default: docs) holds site.config.mjs, content/ and assets/.`,
  );
  process.exit(1);
}

// --dir is ours; everything else is forwarded to Astro.
let dir = process.env.REMOTE_THEME_DIR || "docs";
const extraArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dir") {
    dir = args[++i];
  } else if (args[i].startsWith("--dir=")) {
    dir = args[i].slice("--dir=".length);
  } else {
    extraArgs.push(args[i]);
  }
}

try {
  if (!dir) throw new Error("--dir requires a folder name.");
  await run(command, { extraArgs, dir });
} catch (error) {
  console.error(`[remote-astro-theme] ${error.message}`);
  process.exitCode = 1;
}
