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
const core = __importStar(require("@actions/core"));
const path_1 = __importDefault(require("path"));
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
            const metadata = process.env.DEPENDABOT_METADATA || "";
            const updatedDeps = JSON.parse(metadata);
            if (updatedDeps.length === 0) {
                console.log("Found no dependencies that have been updated so no changelog will be generated.");
                return;
            }
            const supportedEcosystem = updatedDeps.every((dep) => dep.packageEcosystem === "npm_and_yarn");
            if (!supportedEcosystem) {
                console.log(`Changelogs can only be generated for npm packages. Found: ${updatedDeps[0].packageEcosystem}`);
                return;
            }
            const packages = yield (0, get_packages_1.getPackages)(cwd);
            const packageNames = packages.packages.map((pkg) => pkg.packageJson.name);
            core.debug(`Found local npm packages: ${packageNames.join(", ")}`);
            if (packages.packages.length === 0) {
                throw new Error(`No packages found. You might have ${packages.tool} workspaces configured but no packages yet?`);
            }
            const config = yield (0, config_1.read)(cwd, packages);
            core.debug(`Found changesets config at .changeset/config.json`);
            const baseRef = `origin/${config.baseBranch.replace("origin/", "")}`;
            const changedFiles = yield git.getChangedFilesSince({
                cwd,
                ref: baseRef,
            });
            core.debug(`Detected changed files: ${changedFiles.join(", ")}`);
            const hasDirectProdDeps = updatedDeps.some((dep) => dep.dependencyType === "direct:production");
            const changedPackageJson = changedFiles.some((file) => file.endsWith("package.json"));
            if (!hasDirectProdDeps || !changedPackageJson) {
                if (!hasDirectProdDeps) {
                    console.log("No top-level production dependencies where updated, so an empty changelog will be generated.");
                }
                else if (!changedPackageJson) {
                    console.log("No package.json files where changed, so an empty changelog will be generated.");
                }
                const emptyChangeset = {
                    summary: "",
                    releases: [],
                };
                yield (0, write_1.default)(emptyChangeset, cwd);
                return;
            }
            const updatedDepNames = updatedDeps.map((dep) => dep.dependencyName);
            core.debug(`Generating changelogs for updated dependencies: ${updatedDepNames.join(", ")}`);
            const changedChagesets = yield (0, read_1.default)(cwd, baseRef);
            const changedSummaries = changedChagesets.map((changeset) => changeset.summary);
            if (changedSummaries.length > 0) {
                core.debug(`Found existing changelogs: ${changedSummaries.join(", ")}`);
            }
            const changedPackages = yield git.getChangedPackagesSinceRef({
                cwd,
                ref: baseRef,
                changedFilePatterns: config.changedFilePatterns,
            });
            const listableChanges = changedPackages.filter((pkg) => isListablePackage(config, pkg.packageJson));
            const changedPackagesNames = listableChanges.map((pkg) => pkg.packageJson.name);
            if (changedPackagesNames.length === 0) {
                console.log("No packages have changed so no changelog will be generated.");
                return;
            }
            core.debug(`Detected changed packages (since ref: ${config.baseBranch}): ${changedPackagesNames.join(", ")}`);
            const type = process.env.DEFAULT_SEMVER_UPDATE_TYPE || "patch";
            yield Promise.all(listableChanges.map((pkg) => __awaiter(this, void 0, void 0, function* () {
                const relativePkgDir = path_1.default.relative(cwd, pkg.dir);
                const packageDeps = updatedDeps.filter((dep) => dep.directory === `/${relativePkgDir}`);
                if (packageDeps.length === 0) {
                    console.log(`No dependencies where updated for package ${pkg.packageJson.name} so no changelog will be generated.`);
                    return;
                }
                const packageDepNames = packageDeps.map((dep) => dep.dependencyName);
                core.debug(`Detected updated package dependencies for package ${pkg.packageJson.name}: ${packageDepNames.join(", ")}`);
                let summary;
                if (packageDeps.length === 1) {
                    const dep = packageDeps[0];
                    summary = `Bump ${dep["dependencyName"]} from ${dep["prevVersion"]} to ${dep["newVersion"]}`;
                }
                else {
                    const depsSummary = packageDeps
                        .map(({ dependencyName, prevVersion, newVersion }) => {
                        return `- ${dependencyName} from ${prevVersion} to ${newVersion}`;
                    })
                        .join("\n");
                    summary = `Bump dependencies:\n${depsSummary}`;
                }
                if (!changedSummaries.includes(summary)) {
                    const newChangeset = {
                        summary,
                        releases: [
                            {
                                name: pkg.packageJson.name,
                                type: type,
                            },
                        ],
                    };
                    console.log(`Creating changelog for package ${pkg.packageJson.name} with summary "${summary}".`);
                    yield (0, write_1.default)(newChangeset, cwd);
                    core.debug(JSON.stringify(newChangeset));
                }
                else {
                    console.log(`Changelog already exists for package ${pkg.packageJson.name} with summary "${summary}".`);
                }
            })));
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
run();
