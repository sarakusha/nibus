"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.action = void 0;
const handlers_1 = __importDefault(require("../handlers"));
async function action(device, args) {
    const idOrName = args.id[0];
    if (idOrName) {
        const id = device.getId(idOrName);
        const value = Object.values(await device.read(id))[0];
        if (value.error)
            throw new Error(value.error);
        args.quiet || console.info(JSON.stringify(args.raw ? device.getRawValue(id) : value));
    }
}
exports.action = action;
const readCommand = {
    command: 'read',
    describe: 'прочитать значение переменной',
    builder: argv => argv.demandOption(['id', 'mac']).check(checkArgv => {
        if (Array.isArray(checkArgv.id) && checkArgv.id.length !== 1) {
            throw new Error('Только одна переменная id за раз');
        }
        return true;
    }),
    handler: handlers_1.default(action, true),
};
exports.default = readCommand;
//# sourceMappingURL=read.js.map