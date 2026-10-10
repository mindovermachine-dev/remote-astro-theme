import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

/**
 * Loads a content repo's steering config from `docs/site.config.mjs`.
 * Convention for v1: content lives at `docs/content`, assets at
 * `docs/assets`, steering config at `docs/site.config.mjs` — all fixed,
 * relative to the content repo root the CLI is invoked from.
 */
export async function loadSiteConfig(contentRepoRoot, dir = "docs") {
  const configPath = path.join(contentRepoRoot, dir, "site.config.mjs");

  if (!existsSync(configPath)) {
    throw new Error(
      `No steering config found at ${configPath}. Create ${dir}/site.config.mjs with at least a "theme" field (or use --dir <folder>).`,
    );
  }

  const mod = await import(pathToFileURL(configPath).href);
  const siteConfig = mod.default;

  if (!siteConfig || typeof siteConfig !== "object") {
    throw new Error(
      `${dir}/site.config.mjs must have a default export object.`,
    );
  }

  return {
    siteConfig,
    contentRoot: path.join(contentRepoRoot, dir, "content"),
    assetsRoot: path.join(contentRepoRoot, dir, "assets"),
    outDir: path.join(contentRepoRoot, "dist"),
  };
}
