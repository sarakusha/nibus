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
const handlers_1 = __importDefault(require("../handlers"));
function action(device, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const idOrName = args.id[0];
        if (idOrName) {
            const id = device.getId(idOrName);
            const value = Object.values(yield device.read(id))[0];
            if (value.error)
                throw new Error(value.error);
            args.quiet || console.info(JSON.stringify(args.raw ? device.getRawValue(id) : value));
        }
    });
}
exports.action = action;
const readCommand = {
    command: 'read',
    describe: 'прочитать значение переменной',
    builder: argv => argv
        .demandOption(['id', 'mac'])
        .check(checkArgv => {
        if (Array.isArray(checkArgv.id) && checkArgv.id.length !== 1) {
            throw new Error('Только одна переменная id за раз');
        }
        return true;
    }),
    handler: handlers_1.default(action, true),
};
exports.default = readCommand;
//# sourceMappingURL=read.js.map