# Spec: Remote Astro Theme — CLI-orchestrated theme/content split

## STATUS: v1 implemented and working end-to-end (2026-09-24)

All three repos are pushed to GitHub and a real, working pipeline exists:

- **`mom-doc-theme`** (public, `mindovermachine-dev/mom-doc-theme`): refactored
  to accept an injected site config (`astro/src/config/site-config.mjs` +
  `astro/site.config.default.mjs` for its own standalone demo), a
  `remote-theme.json` manifest (`{ "astroRoot": "astro" }`), symlink-friendly
  content loading (`vite.resolve.preserveSymlinks: true` + `glob()`-based
  `docs` collection reading from `.remote-theme/content`), a
  `src/assets/remote` convention for content-repo assets, softened the
  hard-fail-if-no-giscus check to a warning, and derives redirect/PDF
  locale-prefix scanning from the injected `locales` instead of hardcoding
  `["da","en"]`.
- **`remote-astro-theme`** (public, `mindovermachine-dev/remote-astro-theme`):
  a working CLI (`bin/cli.mjs` + `src/*.mjs`) implementing theme ref parsing
  (git coordinate vs local/`file:` path), tarball fetch+cache for git refs
  (`src/fetchGitTheme.mjs`), steering-config loading
  (`src/loadSiteConfig.mjs`), workspace prep — symlinking content/assets,
  `npm install`-ing the theme if needed, writing the generated config
  (`src/prepareWorkspace.mjs`) — and invoking Astro's own CLI binary inside
  the prepared theme dir (`src/runAstro.mjs`), orchestrated end-to-end by
  `src/run.mjs`.
- **`use-theme-sample`** (public, `lakruzz/use-theme-sample`): genuinely
  content-only — `docs/content/**`, `docs/assets/`, one new file
  `docs/site.config.mjs` (steering config, `theme:
"mindovermachine-dev/mom-doc-theme@main"`), and a `package.json` with a
  single `devDependency` on `remote-astro-theme` (`github:...#main`) plus
  `dev`/`build`/`preview` npm scripts.

**Validated**: `npm install && npm run build` from a clean `use-theme-sample`
checkout fetches the theme from its live GitHub ref, symlinks in the sample's
own content/assets, resolves its own title/sidebar/locales (English as
unprefixed root locale + Danish, different structure than the theme's own
demo), builds 30 pages, and copies the result into `use-theme-sample/dist/`.
Also validated `preview` (serves correctly) and **local-path theme
resolution** (`theme: "file:../mom-doc-theme"`) for the side-by-side
theme-development workflow — same build succeeds without any git fetch.

**Real bugs found + fixed during implementation** (useful signal for anyone
picking this up):

1. A bare `glob()` loader with an external absolute `base` broke Vite's
   resolution of bare npm imports (`@astrojs/starlight/components`) in
   content files — fixed by always symlinking content into a path _inside_
   the theme's own tree, combined with `preserveSymlinks: true` (§2 below).
2. Astro's internal build step uses `fs.rename()` to move assets into
   `outDir`, which throws `EXDEV` when the theme's build temp dir and the
   content repo's `dist/` are on different filesystems/mounts (common when
   the theme is fetched into a `~/.cache` dir outside the content repo's own
   mount, as happened here). Fixed by always building into a dir _alongside_
   the theme, then `fs.cpSync`-ing (not renaming) the result into the content
   repo's real `dist/` only for the `build` command.
3. (Process error, not a design flaw) The CLI's own source code wasn't
   actually committed/pushed on the first attempt — `npm install` of a
   `github:` dependency clones with `git`, not a tarball, so an empty/wrong
   remote repo fails loudly (`ENOENT ... package.json`). Worth remembering:
   always verify `git log`/`git push` actually happened, not just that a
   local build/test passed.
4. **`defaultLocale: "root"` broke every link on the site.** Starlight's own
   docs say to *omit* `defaultLocale` when the root locale is your default —
   passing the literal string `"root"` instead made Starlight generate every
   sidebar/nav link with the wrong `/en/` prefix (the root locale's `lang`
   code), so every link 404'd except the homepage's own hardcoded content.
   This is exactly what "the dev server renders nothing" turned out to be —
   the homepage itself rendered fine (it's a `template: splash` page with no
   sidebar by design), but every navigable link was broken. Fixed in the
   theme's `astro.config.mjs`: pass `undefined` instead of `"root"`.
5. **Two independent layers of stale caching**, both defeating attempts to
   pick up a freshly pushed fix:
   - The CLI's own theme-fetch cache (`~/.cache/remote-astro-theme/...`)
     reused an already-fetched copy of a *floating* ref (`@main`) forever,
     with no way to detect the remote had moved. Fixed: only cache when the
     ref is a full 40-char commit SHA (immutable); anything else (branch,
     tag) is deleted and re-fetched fresh on every invocation. Correctness
     over speed for now — see open question on a proper lockfile.
   - Independently, **`npm install` of a `github:...#branch` dependency does
     not reliably refresh** even after deleting `node_modules` and
     `package-lock.json` — npm's own git/pacote cache can keep serving an
     old resolved commit. Had to run `npm cache clean --force` to actually
     get the latest CLI code installed. Worth remembering when iterating on
     `remote-astro-theme` itself during development.
6. **Concurrency hazard (found, not fixed)**: since fix #5 makes every
   invocation delete-and-recreate the shared theme cache directory, running
   two CLI invocations against the same floating ref at the same time (e.g.
   `dev` in one terminal, `build` in another) corrupts the running one out
   from under it (`ENOENT` on `content.config.ts`, `404.astro`, etc., inside
   a live `astro dev` process). Not expected in normal single-command usage,
   but worth documenting: don't run two `remote-astro-theme` commands
   concurrently against the same content repo yet.

**Known gaps / not yet done** (see also §5's open questions, still valid):

- No lockfile (`docs/remote-theme.lock.json`) yet. Floating refs are now
  always freshly re-fetched (see bug #5 above) rather than silently stale,
  which is more correct but slower (full `npm install` of the theme's deps
  on every `dev`/`build`). A lockfile + `update` command to get back some
  speed via safe caching is still a real open item.
- No private-repo auth path for the tarball fetch.
- `giscus`/PDF settings are not yet threaded through the generated site
  config (still theme's own hardcoded `src/config/giscus.mjs`); only the
  hard failure was softened.
- No automated equivalence diff against `docs.mindovermachine`'s baseline
  build (§4 step 1) was done — this prototype validated the mechanism using
  `use-theme-sample`'s real (different) content instead.

## 0. Current concrete scaffolding (already created)

Four sibling repos exist locally under `mindovermachine-dev/`:

- **`docs.mindovermachine`** — the original, monolithic repo. **Left untouched**,
  used only as the reference baseline: build it once, keep its `astro/dist/`
  output to diff against later for equivalence-checking.
- **`mom-doc-theme`** — a copy containing the theme-relevant stuff: the full
  `astro/` app (`astro.config.mjs`, `package.json`, `src/{assets,components,
config,content,styles}`, `content.config.ts`, `env.d.ts`). This becomes the
  **theme package**.
- **`use-theme-sample`** — an arbitrary sample content repo: no `astro/` app
  at all, just `docs/` (content `.mdx` files, `assets/`, `favicon.svg`,
  `CNAME`, `linkinator.config.json`, `.cspell.jsonc`, `.markdownlint-cli2.jsonc`)
  plus repo scaffolding (`.insitu.yml`, `.githooks/`, etc., currently copied
  from the old repo and needs trimming). This is the target shape for a
  **content-only repo**.
- **`remote-astro-theme`** — currently empty (only a `tmp/` scratch folder,
  holding this spec). This becomes the **CLI / business-logic package** that
  a content repo installs to actually build/serve using a theme.

**Current experimental state (from the §4 step 2 spike, not yet cleaned up):**
`mom-doc-theme/astro/src/content.config.ts` now reads the `docs` collection
via `glob()` (instead of `docsLoader()`), `mom-doc-theme/astro/src/content/docs`
is a **symlink** to `use-theme-sample/docs/content` (original content moved
to `mom-doc-theme/astro/src/content/docs.original`), `node_modules/` has been
installed, and `astro.config.mjs` has `vite.resolve.preserveSymlinks: true`
added. Safe to leave as-is for the next prototype step, or revert by deleting
the `docs` symlink and renaming `docs.original` back to `docs`.

## 1. Goal

`use-theme-sample` should be able to declare its theme the way Jekyll's
`remote_theme:` works — a plain git coordinate, no npm packaging or
`package.json` dependency entry for the theme itself required:

```jsonc
// docs/site.config.mjs (or .yml/.json — TBD, see §5)
export default {
  theme: "mindovermachine-dev/mom-doc-theme@main", // org/repo@ref (branch, tag, or commit SHA)
  title: { da: "Mind over Machine", en: "Mind over machine" },
  // ...sidebar, locales, social, redirects, giscus, pdf settings
};
```

`use-theme-sample` only needs `remote-astro-theme` itself as a `devDependency`
(the CLI/toolchain, versioned like any normal npm package). Running
`npx remote-astro-theme dev` / `build` / `preview` then **fetches the theme
from its git ref itself** (no `npm install` of the theme required) and
produces a working Starlight site from `use-theme-sample`'s `docs/` content —
with zero Astro boilerplate committed to the content repo, and zero npm
publishing/packaging work for the theme author.

## 2. The key technical unlock: content never needs to move (with a caveat, confirmed by spike)

Astro's build-time `glob()` loader (`astro/loaders`) accepts **any filesystem
path** as its `base` — "fetches entries from directories of Markdown, MDX,
Markdoc, JSON, YAML, or TOML files **from anywhere on the filesystem**"
(confirmed in Astro's content-collections docs). It is not restricted to
paths under `src/`.

**Spike result (see §4 step 2, already run):** a bare `glob({ base: <absolute
path outside the project> })` **does not work** once content files `import`
anything from an npm package. Rollup/Vite resolves bare imports (e.g.
`@astrojs/starlight/components`, used throughout `use-theme-sample`'s `.mdx`
files) by walking up from the _importing file's real location_ — and since
`use-theme-sample` has no `node_modules` of its own, that resolution fails:

```
[vite]: Rollup failed to resolve import "@astrojs/starlight/components" from
".../use-theme-sample/docs/content/about/join.mdx".
```

**Fix, confirmed working**: instead of a bare external path, **symlink** the
content directory into the theme's conventional location (e.g.
`mom-doc-theme/astro/src/content/docs` → symlink →
`use-theme-sample/docs/content`) and set `vite.resolve.preserveSymlinks:
true` in the theme's `astro.config.mjs`. This keeps Vite's module resolution
anchored to the symlink's _apparent_ location (inside the theme, next to its
`node_modules`) while the actual files still live only in the content repo —
still zero copying, just one symlink instead of a raw path reference. With
this in place, a full build of `use-theme-sample`'s real content through
`mom-doc-theme` **succeeded**: 43 pages built, correct sidebar/locales/theme
styling, Starlight components resolved correctly from the theme's
`node_modules`.

**Consequence**: we don't need Option A's clone-and-overlay, and we don't
even need Option B's "thin shell app that imports the theme." We can go
further: the _entire_ Astro project (config, components, styles, plugins)
can physically live inside `mom-doc-theme` (installed into
`use-theme-sample/node_modules/mom-doc-theme`, or fetched by git ref per
§3.5), and the CLI just needs to:

1. Point Astro's `root`/config at the theme's Astro project.
2. **Symlink** the content repo's content/assets directories into the
   theme's conventional locations (not just pass a path) and set
   `preserveSymlinks: true`, so bare npm imports in content files resolve.
3. Tell it where to write output (back into `use-theme-sample/dist/`, not into
   `node_modules`).
4. Feed it the site-specific data (sidebar, locales, title, redirects,
   giscus, pdf settings) that today is hardcoded in `mom-doc-theme`'s
   `astro.config.mjs`.

**New open item from this spike**: asset references inside content
frontmatter (e.g. Starlight's hero `image.file: /src/assets/mom-coin.png`)
resolve relative to the _theme's_ `src/assets`, not the content repo's own
`docs/assets` — the spike build only "worked" because both repos happened to
contain an identically-named file. Content-repo assets need the same
symlink treatment (e.g. symlink `docs/assets` → theme's
`src/assets/<content-repo-name>/` or similar) — added to §5 open questions.

No file copying, no shallow git cloning at build time (that already happened
once via `npm install` resolving the `github:` dependency), no scratch-merge
step to invent a contract for.

## 3. Architecture

### `mom-doc-theme` (theme repo — plain git repo, not an npm package)

- Stays a real, runnable Astro/Starlight project (useful for the theme's own
  dev/preview/testing in isolation, and it's _all_ that's required of it —
  no `exports`/`main` fields, no npm publish step). Refactored so that:
  - `src/content.config.ts`'s `docs` collection stays at the conventional
    `./src/content/docs` path — the CLI **symlinks** the content repo's
    content directory there (see spike result in §2) rather than pointing
    the loader at an external path directly.
  - `astro.config.mjs` sets `vite.resolve.preserveSymlinks: true` (confirmed
    necessary in the spike) and has its `starlight()` call restructured so
    the site-specific data currently hardcoded — `title`, `sidebar`,
    `locales`, `social`, `favicon`, `logo` — is read from an injected config
    file instead of literals. The plugin wiring (remark/rehype, giscus
    check, PDF integration, redirect scanning) stays theme-owned/mechanism.
  - Similarly, content-repo assets get symlinked into a theme-conventional
    location (exact target path TBD — see §5) instead of path-referenced.
  - Optionally includes a tiny `remote-theme.json` manifest at the repo root
    (e.g. `{ "astroRoot": "astro" }`) telling the CLI where the Astro project
    lives inside the repo, if not at a conventional location. This manifest
    _is_ the theme-side half of the "contract" — deliberately minimal.
- **No git dependency in any `package.json` at all.** Referenced purely by
  git coordinates (`org/repo@ref`) from the content repo's steering config.
  Versioning = tags/branches/commits on the theme's own git history, same as
  Jekyll's `remote_theme:`.

### `use-theme-sample` (content-only repo)

- Keeps exactly what it has now: `docs/content/**` (`.mdx`), `docs/assets/`,
  `docs/favicon.svg`, `docs/CNAME`, lint configs.
- Adds one new file: the **steering config** — e.g. `docs/site.config.mjs`
  (or `.yml`/`.json` — TBD) containing `theme: "org/repo@ref"` plus the
  site-specific data that used to live in `mom-doc-theme`'s `astro.config.mjs`:
  title(s), locales, sidebar tree, social links, redirect/giscus/pdf toggles,
  favicon/logo asset paths (resolved relative to `docs/`).
- Adds a `package.json` with a single `devDependency` on `remote-astro-theme`
  (the CLI). No dependency entry for the theme at all — that's the whole
  point.

### `remote-astro-theme` (CLI package)

Responsibilities:

1. **Load the steering config** from the content repo's `docs/` folder;
   read its `theme: "org/repo@ref"` field.
2. **Resolve + fetch the theme** per §3.5 (tarball download, cached).
3. **Locate the Astro project** inside the fetched theme (convention or its
   `remote-theme.json` manifest), then `npm install` there (or reuse a
   cached `node_modules` keyed by the theme's lockfile hash, to avoid
   reinstalling on every build).
4. **Resolve paths and symlink**: absolute path to the content repo's
   `docs/content` (content root) and `docs/assets`; **symlink both into the
   theme's conventional locations** (`src/content/docs`, and an assets
   location per §5) rather than passing bare paths to the loader — required
   per the §2 spike finding. Resolve output directory (e.g. `<repo>/dist`).
5. **Inject config into the fetched theme copy**: since the CLI owns this
   ephemeral copy (it's cache, not the theme author's working tree), it can
   freely write a generated file (e.g.
   `<fetched-theme>/astro/.remote-theme/site-config.generated.mjs`) containing
   the site config + resolved content-root path, which the theme's
   `astro.config.mjs`/`content.config.ts` are written (per the contract) to
   import if present.
6. **Invoke Astro** with `root` = the fetched theme's Astro project directory,
   `outDir` = an absolute path back into the content repo. Prefer Astro's
   **programmatic Node API** (`import { dev, build, preview } from 'astro'`)
   over shelling out to the `astro` CLI binary.
7. **Expose subcommands**: `remote-astro-theme dev|build|preview`, plus
   `remote-astro-theme update` to explicitly re-resolve a floating branch ref
   and refresh the lockfile (see §3.5).

## 3.5 Theme reference resolution (git-ref fetch, Jekyll-parity)

This is the mechanism that makes the Jekyll-like UX possible without
requiring the theme to be an installable npm package.

- **Reference formats**: `theme:` accepts either:
  - A **git coordinate**: `org/repo@ref` (branch, tag, or full commit SHA).
  - A **local filesystem path**: `file:../mom-doc-theme` (or a bare relative/
    absolute path — detected by leading `./`, `../`, `/`, or a `file:`
    prefix, vs. the `org/repo@ref` pattern). This is the primary **theme
    development workflow**: when working on the theme and content side by
    side (as in this local `mindovermachine-dev/` checkout right now), point
    straight at the theme's working directory. No fetch, no cache, no
    lockfile — the CLI uses the path directly, so edits to the theme are
    picked up immediately (including through Astro's own dev-server HMR,
    since `root` just _is_ that directory while `dev` is running). This is
    materially better DevX than Jekyll offers (Jekyll's `remote_theme` has
    no local-path escape hatch at all; you'd have to fork/vendor a theme
    gem to iterate on it locally).
  - Local-path resolution reuses the exact same "theme-side contract" below
    (locate the Astro project, `npm install` if needed, inject config) — it's
    the same code path as the git-ref fetch, just skipping the
    download/cache/lock step and pointing straight at the given directory.
- **Fetch mechanism** (git-coordinate refs only): download a tarball rather
  than a full git clone —
  e.g. GitHub's `https://codeload.github.com/{org}/{repo}/tar.gz/{ref}`
  (works uniformly for branches, tags, and commit SHAs; no git binary
  dependency in the fetch logic itself, faster than cloning history). Needs
  a fallback path for non-GitHub git remotes (self-hosted, GitLab, etc.) —
  likely a `git archive`-based fetch or shallow `git clone --depth=1` for
  those, since they don't all expose a tarball-by-ref HTTP endpoint.
- **Caching** (git-coordinate refs only): extract into a gitignored cache directory, e.g.
  `<content-repo>/node_modules/.cache/remote-astro-theme/<org>__<repo>__<ref>/`.
  - Tag or commit-SHA refs are immutable → cache indefinitely, content-addressed.
  - Branch refs (e.g. `@main`) are floating → resolve to a commit SHA at
    fetch time and **write a lockfile** (e.g. `docs/remote-theme.lock.json`,
    committed to the content repo) recording `{ ref, resolvedSha, fetchedAt }`.
    By default, builds reuse the locked SHA (reproducible, no surprise
    upstream changes mid-CI-run); `remote-astro-theme update` explicitly
    re-resolves the branch to its current HEAD and rewrites the lockfile —
    conceptually the same role as `package-lock.json`/`Gemfile.lock` play for
    git dependencies elsewhere in this repo's own toolchain. Local-path
    references skip locking entirely (no upstream to drift from).
- **The theme-side contract** (deliberately thin, lives partly as CLI
  business logic and partly as a documented convention theme authors follow):
  1. Where the Astro project lives in the repo (convention, e.g. `astro/` at
     the repo root, or declared in an optional `remote-theme.json` manifest).
  2. That its `astro.config.mjs`/`content.config.ts` import an optional
     generated config file (a fixed, documented path/name) if present, for
     site data + content-root override — this is the only real "API" a theme
     author must implement, and it's a documented convention, not a package
     export.
- **Security note**: fetching + `npm install`-ing + building an arbitrary git
  ref is code execution, same trust model as any git/npm dependency already
  in use elsewhere (not a new risk category) — but worth calling out
  explicitly that content-repo authors should pin to tags/SHAs they trust in
  CI/production, not track someone else's `@main` unpinned.
- **Alternative resolution path (optional, not required for v1)**: nothing
  above precludes _also_ supporting `theme: "npm:mom-doc-theme"` for authors
  who'd rather get theme versioning via a real `package.json` dependency and
  `package-lock.json` instead of the CLI's own fetch+lock mechanism — but the
  git-ref path is the primary, Jekyll-parity UX this spec is optimizing for.

## 4. Prototype plan (do this before finalizing the contract)

Work entirely inside the four existing sibling repos; nothing here touches
`docs.mindovermachine`. None of these repos are git-initialized/pushed yet —
that's **not a blocker**: steps 1–4 and 6–7 below only need local-path theme
resolution (§3.5), which needs no git hosting at all. Only step 5 (the
git-ref tarball fetch) needs `mom-doc-theme` to actually exist on GitHub —
defer git init/push until we reach that step.

1. **Baseline**: build `docs.mindovermachine` as-is; keep `astro/dist/` as
   the reference output. _(Not yet done — still pending.)_
2. ✅ **DONE.** Spiked the content-loader indirection inside `mom-doc-theme`
   alone (no CLI yet). First attempt (bare `glob({ base:
process.env.REMOTE_THEME_CONTENT_ROOT, ... })` pointed straight at
   `use-theme-sample/docs/content`) **failed**: Vite couldn't resolve
   `@astrojs/starlight/components` imports from `.mdx` files living outside
   the theme's `node_modules` tree. **Fixed** by symlinking
   `mom-doc-theme/astro/src/content/docs` → `use-theme-sample/docs/content`
   and setting `vite.resolve.preserveSymlinks: true`. Rebuilt: **43 pages
   built successfully**, correct sidebar/locale/theme rendering, confirming
   §2's revised (symlink-based) mechanism. One follow-up issue found: hero
   image asset paths in frontmatter resolve against the theme's own
   `src/assets`, not the content repo's `docs/assets` — needs the same
   symlink treatment (§5).
3. **Extract site config** out of `mom-doc-theme`'s `astro.config.mjs`
   (sidebar/locales/title/social) into a parameter, sourced (for this step)
   from a hardcoded object matching what would live in
   `use-theme-sample/docs/site.config.mjs`. Confirm the resulting build
   still renders correctly end-to-end for the sample content.
4. **Decide the Starlight-plugin-vs-factory-function question** (§3) with a
   small spike against Starlight's plugin API before committing to one
   approach in the real theme code.
5. **Build the `remote-astro-theme` CLI's theme-fetch layer** in isolation:
   given `org/repo@ref`, download+extract the tarball into the cache dir,
   resolve/lock a branch ref to a SHA, and re-use the cache on a second run
   without re-fetching. **Needs `mom-doc-theme` pushed to GitHub first** —
   do this step after git-initializing/pushing the repo, once steps 2–4 and
   6–7 (local-path mode) are already proven out.
6. **Wire the rest of the CLI**: locate the Astro project inside the fetched
   copy, `npm install` there, generate the injected config, invoke Astro's
   programmatic API, support `dev`/`build`/`preview`.
7. **Validate equivalence**: run `remote-astro-theme build` from
   `use-theme-sample`, diff its `dist/` output against the Step 1 baseline
   (`docs.mindovermachine`'s content is a superset/different content set than
   `use-theme-sample`'s, so this is a structural/mechanism check — page
   layout, sidebar, styles, redirects, giscus — rather than a byte-for-byte
   content diff).
8. Confirm the whole flow works from a **clean clone** of `use-theme-sample`
   with only `docs/site.config.mjs` (referencing the pushed theme repo by
   ref) and `remote-astro-theme` as a `devDependency` — no local path
   shortcuts, no theme entry in `package.json` at all.

## 5. Open questions to confirm before/while prototyping

0. **Asset symlink target** (new, from the §4 step 2 spike): where should
   the content repo's `docs/assets` be symlinked to inside the theme so
   frontmatter-referenced images (e.g. Starlight hero `image.file:`) resolve
   correctly? Options: a fixed conventional path the theme documents (e.g.
   `src/assets/content/`) that content authors must reference explicitly, or
   symlinking directly over the theme's own `src/assets` (riskier — clobbers
   theme-owned assets like the logo/favicon referenced from `astro.config.mjs`
   itself). Needs a follow-up spike before finalizing.
1. **Steering config format**: `.mjs` (JS, most flexible, matches today's
   `astro.config.mjs` style) vs `.yml`/`.json` (safer, no arbitrary code
   execution, easier for non-devs to edit). Given the content repo is meant
   to be lightweight/non-technical-friendly, YAML/JSON leans more
   appropriate — but sidebar trees with `autogenerate` entries etc. mirror
   Starlight's own JS-object shape closely, so `.mjs` avoids inventing a
   parallel schema. Leaning `.mjs` for v1, revisit if non-technical authors
   need to edit it directly.
2. **Multi-theme / theme selection**: does `remote-astro-theme` support only
   one theme per content repo (simplest — a single `theme:` field in the
   steering config), or must it support switching between multiple fetched
   themes? Assume single-theme-per-repo for v1.
3. **Injection mechanism**: env vars (simplest, but stringly-typed and awkward
   for structured sidebar data) vs. writing a small generated temp file (e.g.
   `<theme>/astro/.remote-theme/site-config.generated.mjs`) that the theme's
   `astro.config.mjs` imports, deleted after build — this avoids
   JSON-stringifying complex config through env vars. Leaning toward the
   generated-file approach; env vars only for simple scalars (content root
   path, output dir).
4. **Where does Astro actually run from?** Running `root` = the fetched
   theme's extracted cache directory (under
   `node_modules/.cache/remote-astro-theme/...` or similar) is a bit unusual
   (dev servers/build tools sometimes assume `root` is the project being
   worked on, e.g. for `.gitignore`-relative paths, cache dirs). Confirm
   during the CLI spike whether Astro's Vite-based tooling tolerates `root`
   living inside a nested cache dir cleanly, or whether it needs to be a
   plain top-level directory instead (e.g.
   `use-theme-sample/.remote-theme-cache/<ref>/`, still gitignored, still
   ephemeral, just not nested under `node_modules`).
5. **PDF export & giscus config**: these currently depend on repo-specific
   values (giscus repo id, PDF browser executable path) — confirm these
   move into the steering config too, not left hardcoded in the theme.
6. **Versioning/CI for the theme and CLI repos**: `remote-astro-theme` itself
   still needs normal npm versioning (it's a real devDependency); does it
   need its own `trunk-worthy`-equivalent CI? `mom-doc-theme` no longer needs
   any npm-publish step at all (it's fetched by git ref), but still benefits
   from CI that just runs its own `npm run build` to catch breakage before
   content repos pick up a new commit/tag.
7. **`use-theme-sample`'s leftover boilerplate**: it currently still carries
   `.insitu.yml`, `.githooks/`, etc. copied from the old repo — confirm these
   get trimmed down to whatever a genuinely content-only repo actually needs
   (probably just enough to invoke `remote-astro-theme` + lint the content),
   as part of finalizing the prototype.
8. **Lockfile mechanics**: does `docs/remote-theme.lock.json` get committed
   (reproducibility, reviewable diffs on theme upgrades — recommended,
   mirrors `package-lock.json`) or left gitignored/regenerated per-build
   (simpler, but reintroduces the "floating ref" non-reproducibility Jekyll
   itself has)? Leaning committed.
9. **Private theme repos**: GitHub's tarball-by-ref endpoint needs auth for
   private repos (can't just anonymously curl `codeload.github.com`) — if
   `mom-doc-theme` (or future themes) might be private, the CLI needs a
   token-based fetch path (e.g. via the `gh` CLI already available in this
   environment, or a `GITHUB_TOKEN` env var) in addition to the anonymous
   tarball path for public repos.

## 6. Next step

Still nothing executed. Once §5's open questions (especially #1 config
format and #3 injection mechanism) are confirmed, start with prototype step
2 in §4 — the content-loader indirection spike inside `mom-doc-theme` alone
— since it validates the single riskiest assumption before any CLI code is
written.

## Appendix: earlier analysis (superseded by §0–§6 above)

### Why this is harder than Jekyll's `remote_theme`

Jekyll's model works because:

- Jekyll themes are **gems** with a fixed, narrow contract: `_layouts/`,
  `_includes/`, `_sass/`, `assets/`. Content (`_config.yml`, pages, `_data`)
  is a **disjoint** set of directories from what the theme provides.
- Precedence is built into Jekyll's file resolution: site files silently
  shadow theme files of the same relative path. No copying/overwriting
  step is needed — it's resolved per-request at build time.
- GitHub Pages resolves `remote_theme` server-side; locally, `bundle`
  fetches the theme gem. Either way there's no "merge two trees" step.

Astro/Starlight has **no equivalent contract**:

- `astro.config.mjs` is not just "theme code" — it also encodes
  site-specific things that must live in the same file: the sidebar tree,
  locales, redirects scanning, social links, title. In _this_ repo, sidebar
  structure, frontmatter-redirect scanning, and giscus config are all
  interleaved with genuinely reusable plugin wiring in one file.
- There's no file-resolution precedence system like Jekyll's — Vite/Astro
  resolves modules from `src/` as one tree. "Copy content over theme's
  `src/`, overwrite on clash" is destructive and clash-prone (e.g. both
  trees might want `src/content.config.ts`, `src/styles/custom.scss`).
- Astro **does** have a real extension mechanism (integrations, component
  overrides via Starlight's `components:` config, content collections),
  but it requires the theme to be designed as an installable package, not
  a folder to `cp -r` over.

This analysis originally led to a two-shallow-copies-of-one-repo,
"file: dependency" prototype plan (Option B). §0–§6 above supersede that
plan now that the repos have actually been split three ways and the
glob-loader external-`base` mechanism was confirmed — kept here only for
historical context on _why_ naive copy-based approaches were rejected.
