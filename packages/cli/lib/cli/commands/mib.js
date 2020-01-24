"use strict";
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
const Either_1 = require("fp-ts/lib/Either");
const PathReporter_1 = require("io-ts/lib/PathReporter");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mib_1 = require("@nibus/core/lib/mib");
const mibCommand = {
    command: 'mib <mibfile>',
    describe: 'добавить mib-файл',
    builder: argv => argv
        .positional('mibfile', {
        describe: 'путь к mib-файлу',
        type: 'string',
    })
        .demandOption('mibfile'),
    handler: ({ mibfile }) => __awaiter(void 0, void 0, void 0, function* () {
        const dest = path_1.default.resolve(__dirname, '../../../../core/mibs');
        const jsonPath = yield mib_1.convert(mibfile, dest);
        const validation = mib_1.MibDeviceV.decode(fs_1.default.readFileSync(jsonPath));
        if (Either_1.isLeft(validation)) {
            throw new Error(`Invalid mib file: ${mibfile}
      ${PathReporter_1.PathReporter.report(validation).join('\n')}`);
        }
    }),
};
exports.default = mibCommand;
//# sourceMappingURL=mib.js.map