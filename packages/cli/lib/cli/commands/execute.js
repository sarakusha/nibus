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
        const vars = args._
            .slice(1)
            .map(arg => arg.split('=', 2))
            .filter(([name, value]) => name !== '' && value !== '');
        const opts = vars.reduce((res, [name, value]) => {
            res[name] = value;
            return res;
        }, {});
        yield device.execute(args.program, opts);
    });
}
const executeCommand = {
    command: 'execute <program>',
    describe: 'выполнить подпрограмму',
    builder: argv => argv
        .positional('program', {
        describe: 'название подпрограммы',
        type: 'string',
    })
        .example('$0 execute signal duration=30 source=1 -m 45:33', 'выполнить программу signal с'
        + ' параметрами duration и source')
        .demandOption(['mac', 'program']),
    handler: handlers_1.default(action, true),
};
exports.default = executeCommand;
//# sourceMappingURL=execute.js.map