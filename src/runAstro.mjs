import { spawnSync } from "node:child_process";
import path from "node:path";

const VALID_COMMANDS = new Set(["dev", "build", "preview"]);

/**
 * Invokes Astro's own CLI inside the prepared theme workspace (using the
 * theme's own locally-installed `astro` binary), forwarding the generated
 * config + content-repo output dir via env vars.
 */
export function runAstro(command, { themeAstroDir, env, extraArgs = [] }) {
  if (!VALID_COMMANDS.has(command)) {
    throw new Error(`Unknown command "${command}". Expected one of: dev, build, preview.`);
  }

  const astroBin = path.join(themeAstroDir, "node_modules", ".bin", "astro");

  const result = spawnSync(astroBin, [command, ...extraArgs], {
    cwd: themeAstroDir,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 0;
}
