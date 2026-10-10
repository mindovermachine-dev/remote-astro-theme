---
title: Development setup
description: Work on the CLI and a theme side by side.
sidebar:
  order: 1
---

There is no build step. The CLI is plain ES modules (`bin/cli.mjs`, `src/*.mjs`).

## Set up

```sh
git clone https://github.com/mindovermachine-dev/remote-astro-theme
cd remote-astro-theme
npm install
```

## Try your changes in a content repo

Link the working copy into the repo that uses it:

```sh
# in remote-astro-theme
npm link

# in the content repo
npm link remote-astro-theme
```

Edits are live on the next run. A later `npm install` in the content repo replaces the link, so link again afterwards.

## Develop against a local theme

In the content repo's steering config, point at the theme folder:

```js
theme: "file:../my-theme",
```

Change it back to a git reference before committing.

## This documentation

These docs are built by the CLI itself:

```sh
npm run docs:dev
npm run docs:build
```

They use [mom-doc-theme](https://github.com/mindovermachine-dev/mom-doc-theme) from its `main` branch. To test against a local copy, temporarily set `theme: "file:../mom-doc-theme"` in `docs/site.config.mjs`.

## Checks

```sh
npm run check
```

This syntax-checks every source file.
