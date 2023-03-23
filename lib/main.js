"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const core = __importStar(require("@actions/core"));
const write_1 = __importDefault(require("@changesets/write"));
const git = __importStar(require("@changesets/git"));
const get_packages_1 = require("@manypkg/get-packages");
const read_1 = __importDefault(require("@changesets/read"));
const config_1 = require("@changesets/config");
function isListablePackage(config, packageJson) {
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
function run(cwd = process.cwd()) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.debug(`Running in current working directory: ${cwd}`);
            if (!fs_1.default.existsSync(path_1.default.resolve(cwd, ".changeset"))) {
                throw new Error("There is no .changeset folder.\n" +
                    "If this is the first time `changesets` have been used in this project, run `yarn changeset init` to get set up.\n" +
                    "If you expected there to be changesets, you should check git history for when the folder was removed to ensure you do not lose any configuration.");
            }
            const metadata = process.env.DEPENDABOT_METADATA || "";
            const updatedDeps = JSON.parse(metadata);
            if (updatedDeps.length === 0) {
                console.log("Found no dependencies that have been updated so no changelog will be generated.");
                return;
            }
            core.debug(`Generating changelogs for updated dependencies:\n${JSON.stringify(updatedDeps)}`);
            const packages = yield (0, get_packages_1.getPackages)(cwd);
            core.debug(`Found local npm packages: ${JSON.stringify(packages)}`);
            if (packages.packages.length === 0) {
                throw new Error(`No packages found. You might have ${packages.tool} workspaces configured but no packages yet?`);
            }
            const config = yield (0, config_1.read)(cwd, packages);
            core.debug(`Found changesets config: ${JSON.stringify(config)}`);
            const changedChagesets = yield (0, read_1.default)(cwd, `origin/${config.baseBranch.replace('origin/', '')}`);
            const changedSummaries = changedChagesets.map((changeset) => changeset.summary);
            core.debug(`Detected existing changelogs: ${changedSummaries.join(", ")}`);
            const changedPackages = yield git.getChangedPackagesSinceRef({
                cwd,
                ref: `origin/${config.baseBranch.replace('origin/', '')}`,
                changedFilePatterns: config.changedFilePatterns,
            });
            const listableChanges = changedPackages.filter((pkg) => isListablePackage(config, pkg.packageJson));
            const changedPackagesNames = listableChanges.map((pkg) => pkg.packageJson.name);
            if (changedPackagesNames.length === 0) {
                console.log("No packages have changed so no changelog will be generated.");
                return;
            }
            core.debug(`Detected changed packages (since ref: ${config.baseBranch}): ${changedPackagesNames.join(", ")}`);
            let summary;
            if (updatedDeps.length === 1) {
                const dep = updatedDeps[0];
                summary = `Bump ${dep["dependencyName"]} from ${dep["prevVersion"]} to ${dep["newVersion"]}`;
            }
            else {
                const deps = updatedDeps
                    .map(({ dependencyName, prevVersion, newVersion }) => {
                    return `- ${dependencyName} from ${prevVersion} to ${newVersion}`;
                })
                    .join("\n");
                summary = `Bump dependencies:\n${deps}`;
            }
            if (changedSummaries.includes(summary)) {
                console.log(`Changelog with summary "${summary}" already exists so no changelog will be generated.`);
                return;
            }
            const type = process.env.DEFAULT_SEMVER_UPDATE_TYPE || "patch";
            const releases = changedPackagesNames.map((name) => ({
                name,
                type: type,
            }));
            const newChangeset = {
                summary,
                releases,
            };
            console.log(`Writing changelog with summary "${summary}".`);
            yield (0, write_1.default)(newChangeset, cwd);
            core.debug(JSON.stringify(newChangeset));
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
run();
