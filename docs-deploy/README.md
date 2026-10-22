Sample use:

```yml
#docs-deploy.yml

name: Deploy docs to GitHub Pages

on:
  workflow_dispatch:

permissions:
  contents: read
  pages: write

concurrency:
  group: docs-pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0 # Fetch full history to ensure we can merge and push

      - uses: mindovermachine-dev/remote-astro-theme/docs-deploy@v1
        # with: #Uncomment if you want to override any of the default inputs
        # node-version: 22 #default is 24
        # docs-path: 'astro' #default is 'docs'
        # version: '^0.1.0' #default is 'latest'
```

