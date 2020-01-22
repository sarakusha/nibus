import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import path from 'path';
import fs from 'fs';
import { convert, MibDeviceV } from '@nibus/core/lib/mib';
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
        const dest = path.resolve(__dirname, '../../../../core/mibs');
        const jsonPath = await convert(mibfile, dest);
        const validation = MibDeviceV.decode(fs.readFileSync(jsonPath));
        if (isLeft(validation)) {
            throw new Error(`Invalid mib file: ${mibfile}
      ${PathReporter.report(validation).join('\n')}`);
        }
    },
};
export default mibCommand;
//# sourceMappingURL=mib.js.map