import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as tar from "tar";

/**
 * Downloads and extracts a theme's git ref as a tarball (no git binary
 * required, works uniformly for branches/tags/commit SHAs), caching the
 * extracted result so repeat builds don't re-fetch.
 */
export async function fetchGitTheme({ org, repo, ref }, { cacheRoot }) {
  const key = `${org}__${repo}__${ref}`.replace(/[^\w.-]/g, "_");
  const targetDir = path.join(cacheRoot, key);

  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    console.log(`[remote-astro-theme] Using cached theme at ${targetDir}`);
    return targetDir;
  }

  mkdirSync(targetDir, { recursive: true });

  const url = `https://codeload.github.com/${org}/${repo}/tar.gz/${ref}`;
  console.log(`[remote-astro-theme] Fetching theme: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch theme tarball from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const tmpTarball = path.join(cacheRoot, `${key}.tar.gz`);
  writeFileSync(tmpTarball, Buffer.from(arrayBuffer));

  try {
    // GitHub tarballs wrap everything in a single top-level `repo-ref/`
    // directory; strip it so targetDir *is* the theme's repo root.
    await tar.x({ file: tmpTarball, cwd: targetDir, strip: 1 });
  } finally {
    rmSync(tmpTarball, { force: true });
  }

  if (readdirSync(targetDir).length === 0) {
    throw new Error(
      `Theme tarball for ${org}/${repo}@${ref} extracted empty (bad ref?).`,
    );
  }

  return targetDir;
}
