import os from "node:os";
import path from "node:path";
import { cpSync, rmSync } from "node:fs";
import { resolveThemeRef } from "./resolveThemeRef.mjs";
import { fetchGitTheme } from "./fetchGitTheme.mjs";
import { loadSiteConfig } from "./loadSiteConfig.mjs";
import { prepareWorkspace } from "./prepareWorkspace.mjs";
import { runAstro } from "./runAstro.mjs";

/**
 * End-to-end orchestration for `remote-astro-theme dev|build|preview`,
 * run from a content repo's root directory.
 */
export async function run(command, { cwd = process.cwd() } = {}) {
  const { siteConfig, contentRoot, assetsRoot, outDir } = await loadSiteConfig(cwd);

  const ref = resolveThemeRef(siteConfig.theme, { fromDir: cwd });

  let themeRoot;
  if (ref.kind === "local") {
    themeRoot = ref.path;
    console.log(`[remote-astro-theme] Using local theme at ${themeRoot}`);
  } else {
    const cacheRoot = path.join(os.homedir(), ".cache", "remote-astro-theme");
    themeRoot = await fetchGitTheme(ref, { cacheRoot });
  }

  const { themeAstroDir, env } = prepareWorkspace({
    themeRoot,
    siteConfig,
    contentRoot,
    assetsRoot,
  });

  runAstro(command, { themeAstroDir, env });

  if (command === "build" && process.exitCode === 0) {
    const builtDist = path.join(themeAstroDir, ".remote-theme", "dist");
    rmSync(outDir, { recursive: true, force: true });
    cpSync(builtDist, outDir, { recursive: true });
    console.log(`[remote-astro-theme] Copied build output to ${outDir}`);
  }
}
