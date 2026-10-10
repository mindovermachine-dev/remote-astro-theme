# remote-astro-theme

Like Jekyll's `remote_theme`, for Astro: build a full site from a repo that contains only content and one config file. The Astro project (the _theme_) is fetched from git, or from a local folder, at build time.

```sh
npm install --save-dev remote-astro-theme
npx remote-astro-theme build
```

Your repo needs:

```txt
docs/
├── site.config.mjs   # export default { theme: "org/repo@ref", ... }
├── content/          # pages
└── assets/           # optional
```

Commands: `dev`, `build` (output in `dist/`), `preview`. Use `--dir <folder>` if your folder is not called `docs`; other arguments are passed to Astro.

Full documentation is in [`docs/`](./docs/content), published at https://docs.mindovermachine.dev/remote-astro-theme/. A ready-made theme is [mom-doc-theme](https://github.com/mindovermachine-dev/mom-doc-theme).

Requires Node.js 20 or newer.
