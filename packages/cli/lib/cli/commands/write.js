import makeAddressHandler from '../handlers';
export async function action(device, args) {
    const vars = args._
        .slice(1)
        .map(arg => arg.split('=', 2))
        .filter(([name, value]) => name !== '' && value !== '')
        .map(([name, value]) => [device.getName(name), device.getId(name), value]);
    vars.forEach(([name, , value]) => {
        device[name] = value;
    });
    if (vars.length === 0) {
        return [];
    }
    args.quiet || console.info(`Writing to ${Reflect.getMetadata('mib', device)} [${device.address}]`);
    return device.write(...vars.map(([, id]) => id)).then(ids => {
        const names = ids.map(id => device.getName(id));
        if (!args.quiet) {
            names.forEach(name => console.info(` - ${name} = ${JSON.stringify(device[name])}`));
        }
        return names;
    });
}
const writeCommand = {
    command: 'write',
    describe: 'запись переменных в устройство',
    builder: argv => argv
        .demandOption(['mac'])
        .example('$0 write -m ::ab:cd hofs=100 vofs=300 brightness=34', `записать в переменные: hofs<-100, vofs<-300, brightness<-34 на устройстве с адресом ::ab:cd
      mib указывать не обязательно, если у устройства есть firmware_version`),
    handler: makeAddressHandler(action, true),
};
export default writeCommand;
//# sourceMappingURL=write.js.map