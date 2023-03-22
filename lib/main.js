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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cwd = process.cwd();
            if (!fs_1.default.existsSync(path_1.default.resolve(cwd, ".changeset"))) {
                throw new Error("There is no .changeset folder.\n" +
                    "If this is the first time `changesets` have been used in this project, run `npm changeset init` to get set up.\n" +
                    "If you expected there to be changesets, you should check git history for when the folder was removed to ensure you do not lose any configuration.");
            }
            const metadata = core.getInput('dependabot-metadata');
            const metadataObject = JSON.parse(metadata);
            const type = metadataObject['update-type'].replace('version-update:semver-', '') || 'none';
            const dependencyNames = metadataObject['dependency-names'];
            const previousVersion = metadataObject['previous-version'];
            const releases = dependencyNames.map((name) => ({ name, type }));
            const newVersion = metadataObject['new-version'];
            const summary = `Bump ${dependencyNames.join(', ')} from ${previousVersion} to ${newVersion}`;
            const newChangeset = {
                summary,
                releases
            };
            yield (0, write_1.default)(newChangeset, cwd);
            core.debug(JSON.stringify(newChangeset, null, 2));
            core.debug(metadata);
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
run();
