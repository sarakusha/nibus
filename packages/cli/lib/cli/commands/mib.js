"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Either_1 = require("fp-ts/lib/Either");
const PathReporter_1 = require("io-ts/lib/PathReporter");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const core_1 = require("@nibus/core");
const mibCommand = {
    command: 'mib <mibfile>',
    describe: 'добавить mib-файл',
    builder: argv => argv
        .positional('mibfile', {
        describe: 'путь к mib-файлу',
        type: 'string',
    })
        .demandOption('mibfile'),
    handler: async ({ mibfile }) => {
        const dest = path_1.default.resolve(__dirname, '../../../../core/mibs');
        const jsonPath = await core_1.convert(mibfile, dest);
        const validation = core_1.MibDeviceV.decode(fs_1.default.readFileSync(jsonPath));
        if (Either_1.isLeft(validation)) {
            throw new Error(`Invalid mib file: ${mibfile}
      ${PathReporter_1.PathReporter.report(validation).join('\n')}`);
        }
    },
};
exports.default = mibCommand;
//# sourceMappingURL=mib.js.map