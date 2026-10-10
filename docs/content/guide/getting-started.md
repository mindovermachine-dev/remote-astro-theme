---
title: Getting started
description: Install the CLI and build a site from a content folder.
sidebar:
  order: 1
---

`remote-astro-theme` turns a folder of content into a full Astro site. The Astro project itself (config, components, styles) lives in a separate **theme** repo that is fetched at build time. Your repo has no Astro boilerplate.

## Requirements

- Node.js 20 or newer
- Network access to GitHub when the theme is a git reference

## Install

```sh
npm install --save-dev remote-astro-theme
```

## Layout

Run the CLI from your repo root. It expects one folder (default `docs`):

```txt
docs/
├── site.config.mjs   # required: steering config
├── content/          # required: pages
└── assets/           # optional: images
```

## Steering config

The smallest valid `docs/site.config.mjs`:

```js
export default {
  theme: "mindovermachine-dev/mom-doc-theme@main",
};
```

Everything else in this file is passed to the theme. Which keys exist depends on the theme. See the [mom-doc-theme documentation](https://docs.mindovermachine.dev/mom-doc-theme/guide/steering-config/).

## Scripts

```json
{
  "scripts": {
    "dev": "remote-astro-theme dev",
    "build": "remote-astro-theme build",
    "preview": "remote-astro-theme preview"
  }
}
```

The build output is written to `dist/` in your repo.

## Theme references

| Value                      | Meaning                                                              |
| :------------------------- | :------------------------------------------------------------------- |
| `org/repo@ref`             | GitHub repo at a branch, tag or commit SHA. Downloaded as a tarball. |
| `file:../my-theme`         | Local folder. Used as-is, so edits show up immediately.              |
| `../my-theme`, `/abs/path` | Same as `file:`.                                                     |

Pin tags or full commit SHAs in CI and production. A branch such as `@main` is downloaded again on every run.
