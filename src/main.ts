import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import { Changeset, Config, PackageJSON } from "@changesets/types";
import writeChangeset from "@changesets/write";
import * as git from "@changesets/git";
import { getPackages } from "@manypkg/get-packages";
import { read } from "@changesets/config";

function isListablePackage(config: Config, packageJson: PackageJSON) {
  const packageIgnoredInConfig = config.ignore.includes(packageJson.name);

  if (packageIgnoredInConfig) {
    return false;
  }

  if (!config.privatePackages.version && packageJson.private) {
    return false;
  }

  const hasVersionField = !!packageJson.version;
  return hasVersionField;
}

async function run(): Promise<void> {
  try {
    const cwd = process.cwd()
    if (!fs.existsSync(path.resolve(cwd, ".changeset"))) {
      throw new Error("There is no .changeset folder.\n" +
        "If this is the first time `changesets` have been used in this project, run `yarn changeset init` to get set up.\n" +
        "If you expected there to be changesets, you should check git history for when the folder was removed to ensure you do not lose any configuration."
      );
    }
    const metadata: string = core.getInput('dependabot-metadata')
    const metadataObject = JSON.parse(metadata)
    const packages: any = await getPackages(cwd);
    if (packages.packages.length === 0) {
      throw new Error(
        `No packages found. You might have ${packages.tool} workspaces configured but no packages yet?`
      );
    }
    const config: Config = await read(cwd, packages);
    const changedPackages = await git.getChangedPackagesSinceRef({
      cwd,
      ref: config.baseBranch,
      changedFilePatterns: config.changedFilePatterns,
    })

    const changedPackagesNames = changedPackages
      .filter((pkg) => isListablePackage(config, pkg.packageJson))
      .map((pkg) => pkg.packageJson.name);

    const type = metadataObject['update-type'].replace('version-update:semver-', '') || 'none'
    const dependencyNames = metadataObject['dependency-names']
    const previousVersion = metadataObject['previous-version']
    const newVersion = metadataObject['new-version']
    const summary = `Bump ${dependencyNames.join(', ')} from ${previousVersion} to ${newVersion}`
    const releases = changedPackagesNames.map((name: string) => ({ name, type }))
    const newChangeset: Changeset = {
      summary,
      releases
    }
    await writeChangeset(newChangeset, cwd);
    core.debug(JSON.stringify(newChangeset, null, 2)))
    core.debug(metadata)
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
