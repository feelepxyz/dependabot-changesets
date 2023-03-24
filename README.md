# dependabot-changesets

GitHub Action to autogenerate changesets for dependabot pull requests.

Current features & limitiations
- 

## Usage
See [action.yml](action.yml)

```
name: "Dependabot Changesets"

on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  changesets:
    runs-on: ubuntu-latest
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - name: Dependabot Changesets
        uses: feelepxyz/dependabot-changesets@v1
```
