---
title: Commands
description: CLI commands, options and environment variables.
sidebar:
  order: 2
---

```sh
remote-astro-theme <dev|build|preview> [--dir <folder>] [astro args...]
```

| Command   | Action                                                                  |
| :-------- | :---------------------------------------------------------------------- |
| `dev`     | Start the Astro dev server.                                             |
| `build`   | Build the site and copy the result to `dist/` in the current directory. |
| `preview` | Serve the existing `dist/`. Run `build` first.                          |

## Options

- `--dir <folder>`: content folder, relative to the current directory. Default `docs`. Also settable with the `REMOTE_THEME_DIR` environment variable.
- Any other argument is passed to Astro unchanged, for example `--port 4400` or `--host 0.0.0.0`.

:::note
In a container, the dev server must listen on all interfaces. Either pass `--host 0.0.0.0`, or set `astro: { server: { host: true } }` in the steering config if the theme merges it.
:::

## Cache and files

- Fetched themes: `~/.cache/remote-astro-theme/`
- Inside the theme: `.remote-theme/` holds the generated config and a scratch build folder. Content and assets are symlinked into the theme, so nothing is copied.

## Errors

| Message                                 | Cause                                                      |
| :-------------------------------------- | :--------------------------------------------------------- |
| No steering config found                | `<dir>/site.config.mjs` is missing. Check `--dir`.         |
| must set "theme"                        | The `theme` key is missing or empty.                       |
| Content directory not found             | `<dir>/content` is missing.                                |
| Refusing to replace non-empty directory | The theme ships content where the CLI needs to link yours. |

## Known limitations

- Do not run two commands against the same floating theme reference at the same time. Each run replaces the shared cache folder.
- There is no lockfile yet and no private-repo authentication for theme downloads.
