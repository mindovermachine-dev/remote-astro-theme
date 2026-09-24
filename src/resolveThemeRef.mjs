import path from "node:path";

const GIT_REF_PATTERN = /^([\w.-]+)\/([\w.-]+)@(.+)$/;

/**
 * Parses a `theme:` value from a content repo's steering config into either
 * a local filesystem path (for side-by-side theme development) or a git
 * coordinate (org/repo@ref) to be fetched.
 */
export function resolveThemeRef(themeSpec, { fromDir }) {
  if (!themeSpec || typeof themeSpec !== "string") {
    throw new Error(
      "Missing or invalid `theme` field in docs/site.config.mjs. Expected \"org/repo@ref\" or a local path.",
    );
  }

  if (themeSpec.startsWith("file:")) {
    return {
      kind: "local",
      path: path.resolve(fromDir, themeSpec.slice("file:".length)),
    };
  }

  if (
    themeSpec.startsWith("./") ||
    themeSpec.startsWith("../") ||
    path.isAbsolute(themeSpec)
  ) {
    return { kind: "local", path: path.resolve(fromDir, themeSpec) };
  }

  const match = themeSpec.match(GIT_REF_PATTERN);
  if (match) {
    const [, org, repo, ref] = match;
    return { kind: "git", org, repo, ref };
  }

  throw new Error(
    `Could not parse theme reference "${themeSpec}". Expected "org/repo@ref" (e.g. "mindovermachine-dev/mom-doc-theme@main") or a local/file: path.`,
  );
}
