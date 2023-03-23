import fs from "fs";
import path from "path";
import * as core from "@actions/core";
import { Changeset, Config, PackageJSON, VersionType } from "@changesets/types";
import writeChangeset from "@changesets/write";
import * as git from "@changesets/git";
import { getPackages } from "@manypkg/get-packages";
import getChangesets from "@changesets/read";
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

interface UpdatedDeps {
  dependencyName: string;
  prevVersion: string;
  newVersion: string;
}

async function run(cwd = process.cwd()): Promise<void> {
  try {
    core.debug(`Running in current working directory: ${cwd}`);
    if (!fs.existsSync(path.resolve(cwd, ".changeset"))) {
      throw new Error(
        "There is no .changeset folder.\n" +
        "If this is the first time `changesets` have been used in this project, run `yarn changeset init` to get set up.\n" +
        "If you expected there to be changesets, you should check git history for when the folder was removed to ensure you do not lose any configuration."
      );
    }
    const metadata: string = process.env.DEPENDABOT_METADATA || "";
    const updatedDeps: UpdatedDeps[] = JSON.parse(metadata);
    if (updatedDeps.length === 0) {
      console.log(
        "Found no dependencies that have been updated so no changelog will be generated."
      );
      return;
    }
    core.debug(
      `Generating changelogs for updated dependencies:\n${JSON.stringify(
        updatedDeps
      )}`
    );
    const packages: any = await getPackages(cwd);
    core.debug(`Found local npm packages: ${JSON.stringify(packages)}`);
    if (packages.packages.length === 0) {
      throw new Error(
        `No packages found. You might have ${packages.tool} workspaces configured but no packages yet?`
      );
    }
    const config = await read(cwd, packages);
    core.debug(`Found changesets config: ${JSON.stringify(config)}`);
    const changedChagesets = await getChangesets(cwd, config.baseBranch);
    const changedSummaries = changedChagesets.map(
      (changeset) => changeset.summary
    );
    core.debug(`Detected existing changelogs: ${changedSummaries.join(", ")}`);

    const changedPackages = await git.getChangedPackagesSinceRef({
      cwd,
      ref: config.baseBranch,
      changedFilePatterns: config.changedFilePatterns,
    });
    const listableChanges = changedPackages.filter((pkg) =>
      isListablePackage(config, pkg.packageJson)
    );
    const changedPackagesNames = listableChanges.map(
      (pkg) => pkg.packageJson.name
    );
    if (changedPackagesNames.length === 0) {
      console.log(
        "No packages have changed so no changelog will be generated."
      );
      return;
    }
    core.debug(
      `Detected changed packages (since ref: ${config.baseBranch
      }): ${changedPackagesNames.join(", ")}`
    );

    let summary;
    if (updatedDeps.length === 1) {
      const dep = updatedDeps[0];
      summary = `Bump ${dep["dependencyName"]} from ${dep["prevVersion"]} to ${dep["newVersion"]}`;
    } else {
      const deps = updatedDeps
        .map(({ dependencyName, prevVersion, newVersion }) => {
          return `- ${dependencyName} from ${prevVersion} to ${newVersion}`;
        })
        .join("\n");
      summary = `Bump dependencies:\n${deps}`;
    }
    if (changedSummaries.includes(summary)) {
      console.log(
        `Changelog with summary "${summary}" already exists so no changelog will be generated.`
      );
      return;
    }

    const type = process.env.DEFAULT_SEMVER_UPDATE_TYPE || "patch";
    const releases = changedPackagesNames.map((name: string) => ({
      name,
      type: type as VersionType,
    }));
    const newChangeset: Changeset = {
      summary,
      releases,
    };
    console.log(
      `Writing changelog with summary "${summary}".`
    );
    await writeChangeset(newChangeset, cwd);
    core.debug(JSON.stringify(newChangeset));
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
