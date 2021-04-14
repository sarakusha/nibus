"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.action = void 0;
const handlers_1 = __importDefault(require("../handlers"));
async function action(device, args) {
    const vars = args._.slice(1)
        .map(arg => String(arg).split('=', 2))
        .filter(([name, value]) => name !== '' && value !== '')
        .map(([name, value]) => [device.getName(name), device.getId(name), value]);
    vars.forEach(([name, , value]) => {
        device[name] = value;
    });
    if (vars.length === 0) {
        return [];
    }
    args.quiet ||
        console.info(`Writing to ${Reflect.getMetadata('mib', device)} [${device.address}]`);
    return device.write(...vars.map(([, id]) => id)).then(ids => {
        const names = ids.map(id => device.getName(id));
        if (!args.quiet) {
            names.forEach(name => console.info(` - ${name} = ${JSON.stringify(device[name])}`));
        }
        return names;
    });
}
exports.action = action;
const writeCommand = {
    command: 'write',
    describe: 'запись переменных в устройство',
    builder: argv => argv.demandOption(['mac']).example('$0 write -m ::ab:cd hofs=100 vofs=300 brightness=34', `записать в переменные: hofs<-100, vofs<-300, brightness<-34 на устройстве с адресом ::ab:cd
      mib указывать не обязательно, если у устройства есть firmware_version`),
    handler: handlers_1.default(action, true),
};
exports.default = writeCommand;
//# sourceMappingURL=write.js.map