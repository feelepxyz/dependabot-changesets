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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cwd = process.env.cwd || process.cwd();
            if (!fs_1.default.existsSync(path_1.default.resolve(cwd, ".changeset"))) {
                throw new Error("There is no .changeset folder.\n" +
                    "If this is the first time `changesets` have been used in this project, run `yarn changeset init` to get set up.\n" +
                    "If you expected there to be changesets, you should check git history for when the folder was removed to ensure you do not lose any configuration.");
            }
            const metadata = process.env.DEPENDABOT_METADATA || '';
            core.debug(metadata);
            const updatedDeps = JSON.parse(metadata);
            const packages = yield (0, get_packages_1.getPackages)(cwd);
            if (packages.packages.length === 0) {
                throw new Error(`No packages found. You might have ${packages.tool} workspaces configured but no packages yet?`);
            }
            const config = yield (0, config_1.read)(cwd, packages);
            const changedPackages = yield git.getChangedPackagesSinceRef({
                cwd,
                ref: config.baseBranch,
                changedFilePatterns: config.changedFilePatterns,
            });
            const changedPackagesNames = changedPackages
                .filter((pkg) => isListablePackage(config, pkg.packageJson))
                .map((pkg) => pkg.packageJson.name);
            // TODO: handle multiple dependencies
            const updatedDep = updatedDeps[0];
            const type = updatedDep['updateType'].replace('version-update:semver-', '') || 'none';
            const dependencyNames = updatedDep['dependencyName'];
            const previousVersion = updatedDep['prevVersion'];
            const newVersion = updatedDep['newVersion'];
            const summary = `Bump ${dependencyNames.join(', ')} from ${previousVersion} to ${newVersion}`;
            const releases = changedPackagesNames.map((name) => ({ name, type }));
            const newChangeset = {
                summary,
                releases
            };
            yield (0, write_1.default)(newChangeset, cwd);
            core.debug(JSON.stringify(newChangeset, null, 2));
            core.setOutput('time', new Date().toTimeString());
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
run();
