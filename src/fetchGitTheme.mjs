import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import * as tar from "tar";

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

/**
 * Downloads and extracts a theme's git ref as a tarball (no git binary
 * required, works uniformly for branches/tags/commit SHAs).
 *
 * MVP simplification: only a full 40-char commit SHA is treated as
 * immutable and cached. Anything else (a branch like "main", a tag) is
 * re-fetched fresh on every invocation — floating refs silently serving a
 * stale cached copy forever was a real, confusing bug; correctness over
 * speed for now. Revisit with a proper lockfile (see spec) later.
 */
export async function fetchGitTheme({ org, repo, ref }, { cacheRoot }) {
  const key = `${org}__${repo}__${ref}`.replace(/[^\w.-]/g, "_");
  const targetDir = path.join(cacheRoot, key);
  const isPinned = FULL_SHA_PATTERN.test(ref);

  if (isPinned && existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    console.log(`[remote-astro-theme] Using cached theme at ${targetDir}`);
    return targetDir;
  }

  rmSync(targetDir, { recursive: true, force: true });
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
