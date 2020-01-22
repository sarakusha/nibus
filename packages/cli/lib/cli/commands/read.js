import makeAddressHandler from '../handlers';
export async function action(device, args) {
    const idOrName = args.id[0];
    if (idOrName) {
        const id = device.getId(idOrName);
        const value = Object.values(await device.read(id))[0];
        if (value.error)
            throw new Error(value.error);
        args.quiet || console.info(JSON.stringify(args.raw ? device.getRawValue(id) : value));
    }
}
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
    handler: makeAddressHandler(action, true),
};
export default readCommand;
//# sourceMappingURL=read.js.map