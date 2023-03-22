import fs from "fs";
import path from "path";
import * as core from "@actions/core";
import { Changeset } from "@changesets/types";
import writeChangeset from "@changesets/write";

async function run(): Promise<void> {
  try {
    const cwd = process.cwd();
    if (!fs.existsSync(path.resolve(cwd, ".changeset"))) {
      throw new Error(
        "There is no .changeset folder.\n" +
          "If this is the first time `changesets` have been used in this project, run `npm changeset init` to get set up.\n" +
          "If you expected there to be changesets, you should check git history for when the folder was removed to ensure you do not lose any configuration."
      );
    }

    const metadata: string = core.getInput("dependabot-metadata");
    const metadataObject = JSON.parse(metadata);
    const type =
      metadataObject["update-type"].replace("version-update:semver-", "") ||
      "none";
    const dependencyNames = metadataObject["dependency-names"];
    const previousVersion = metadataObject["previous-version"];
    const releases = dependencyNames.map((name: string) => ({ name, type }));
    const newVersion = metadataObject["new-version"];
    const summary = `Bump ${dependencyNames.join(
      ", "
    )} from ${previousVersion} to ${newVersion}`;
    const newChangeset: Changeset = {
      summary,
      releases,
    };
    await writeChangeset(newChangeset, cwd);
    core.debug(JSON.stringify(newChangeset, null, 2));
    core.debug(metadata);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
