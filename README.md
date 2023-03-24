# dependabot-changesets

GitHub Action to autogenerate changesets for dependabot pull requests.

Current features & limitiations
- Only create changesets for top-level production dependencies that update the version requirement in `package.json`, creating empty changesets for indirect/transitive/development dependencies.
- Create `patch` level changesets by default for each changed package
- Should support basic monorepo setups but I haven't tested this yet so bugs might be lurking for more complex setups

## Usage
See [action.yml](action.yml)

Using defaults:
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

Configuration:
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
        with:
          github-token: "${{ secrets.GITHUB_PAT }}" # default: "${{ github.token }}"
          commit_message: "docs(changeset) dependabot updates" # default: Add changeset for dependabot updates
          branch: "release" # default: "${{ github.head_ref }}"
          repository: "username/repo" # default: "${{ github.repository }}"
          commit_user_name: "username" # default: github-actions[bot]
          commit_user_email: "xyz@example.com" # default: 41898282+github-actions[bot]@users.noreply.github.com
          default_semver_update_type: "minor" # default: 'patch'
```
