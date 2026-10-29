---
title: How it works
description: The steps the CLI performs, and the contract between CLI and theme.
sidebar:
  order: 3
---

## Steps

1. **Load the steering config** from `<dir>/site.config.mjs`.
2. **Resolve the theme.** A `file:` or path reference is used directly. A git reference is downloaded as a tarball from `codeload.github.com` and extracted into the cache. No git binary is needed.
3. **Find the Astro project** in the theme, using `remote-theme.json` (`astroRoot`, default `astro`), and run `npm install` there if `node_modules` is missing.
4. **Link your files into the theme.** `<dir>/content` is symlinked to the theme's `contentLink`, and `<dir>/assets` to its `assetsLink`. Symlinks keep module resolution anchored inside the theme, so bare imports in your content files resolve against the theme's dependencies.
5. **Write the generated config** to `<astroRoot>/.remote-theme/site-config.generated.mjs`: your steering config without `theme`, plus `contentRoot`.
6. **Run the theme's own `astro` binary** with `REMOTE_THEME_SITE_CONFIG` and `REMOTE_THEME_OUT_DIR` set.
7. For `build`, **copy the output** to `dist/` in your repo. Astro builds next to the theme first because it moves files with `rename()`, which fails across filesystems.

The cached content-layer file (`node_modules/.astro/data-store.json`) is cleared on each run so changed link locations never leave stale paths behind.

## Theme manifest

A theme can declare `remote-theme.json` at its root:

| Key           | Default                 | Meaning                                |
| :------------ | :---------------------- | :------------------------------------- |
| `astroRoot`   | `astro`                 | Astro project folder inside the theme. |
| `contentLink` | `.remote-theme/content` | Where the content folder is symlinked. |
| `assetsLink`  | `src/assets/remote`     | Where the assets folder is symlinked.  |

## What the theme must do

- Read the config at `process.env.REMOTE_THEME_SITE_CONFIG`.
- Use `process.env.REMOTE_THEME_OUT_DIR` as `outDir`.
- Set `vite.resolve.preserveSymlinks: true`.
- Load content from the `contentRoot` given in the generated config.

[mom-doc-theme](https://github.com/mindovermachine-dev/mom-doc-theme) is the reference implementation.

## Trust model

Building a theme runs its code and its dependencies' install scripts. Treat a theme reference like any other dependency: pin a tag or SHA you trust.
