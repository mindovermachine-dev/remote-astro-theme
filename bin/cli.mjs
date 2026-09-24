#!/usr/bin/env node
import { run } from "../src/run.mjs";

const [, , command] = process.argv;
const VALID_COMMANDS = new Set(["dev", "build", "preview"]);

if (!VALID_COMMANDS.has(command)) {
  console.error(
    `Usage: remote-astro-theme <dev|build|preview>\n\nRun from a content repo's root directory (the one with docs/site.config.mjs).`,
  );
  process.exit(1);
}

try {
  await run(command);
} catch (error) {
  console.error(`[remote-astro-theme] ${error.message}`);
  process.exitCode = 1;
}
