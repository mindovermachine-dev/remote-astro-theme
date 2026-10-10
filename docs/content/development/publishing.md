---
title: Publishing to npm
description: Release the CLI so it installs with a plain npm install.
sidebar:
  order: 2
---

## One-time

1. Log in with an account that may publish the package: `npm login`.
2. Confirm the name is yours: `npm view @mindovermachine-dev/remote-astro-theme`.
3. Enable two-factor authentication on the account.

## Each release

1. Make sure the working tree is clean and `npm run check` passes.
2. Bump the version, which also creates a git tag: `npm version patch` (or `minor` / `major`).
3. Check what will be published: `npm pack --dry-run`. Only `bin/`, `src/`, `README.md` and `package.json` should be listed.
4. Publish: `npm publish`. The `publishConfig` in `package.json` already sets public access.
5. Push the commit and the tag: `git push --follow-tags`.

Content repos then depend on it as a normal package:

```json
{ "devDependencies": { "@mindovermachine-dev/remote-astro-theme": "^0.1.0" } }
```

## Notes

- `prepublishOnly` runs the checks, so a broken file blocks the publish.
- The `license` field is not set yet. Add one before the first public release.
