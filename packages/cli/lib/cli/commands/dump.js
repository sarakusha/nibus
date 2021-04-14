"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const lodash_1 = __importDefault(require("lodash"));
const core_1 = require("@nibus/core");
const debug_1 = __importDefault(require("../../debug"));
const serviceWrapper_1 = __importDefault(require("../serviceWrapper"));
const debug = debug_1.default('nibus:dump');
let count = 0;
const session = core_1.getDefaultSession();
const { devices } = session;
async function dumpDevice(address, connection, argv, mib) {
    const { raw, compact } = argv;
    let device;
    if (!mib) {
        const { version, type } = (await connection.getVersion(address)) ?? {};
        device = devices.create(address, type, version);
    }
    else {
        device = devices.create(address, mib);
    }
    device.connection = connection;
    let ids = [];
    if (argv.id) {
        ids = argv.id.map(id => device.getId(id));
    }
    const result = await device.read(...ids);
    const rows = Object.keys(result).map(key => {
        const value = raw ? device.getError(key) || device.getRawValue(key) : result[key];
        return {
            value,
            key,
            displayName: Reflect.getMetadata('displayName', device, key),
        };
    });
    const proto = Reflect.getPrototypeOf(device);
    device.release();
    const categories = lodash_1.default.groupBy(rows, ({ key }) => Reflect.getMetadata('category', proto, key) || '');
    console.info(` Устройство ${Reflect.getMetadata('mib', proto)} [${address.toString()}]`);
    const table = new cli_table3_1.default({
        head: ['Название', 'Значение', 'Имя'],
        style: { compact },
        wordWrap: true,
    });
    const toRow = ({ displayName, value, key }) => {
        let val;
        if (value && value.error) {
            val = chalk_1.default.red(value.error);
        }
        else if (value && value.errcode) {
            val = chalk_1.default.red(`errcode: ${value.errcode}`);
        }
        else {
            val = JSON.stringify(value);
            if (!Reflect.getMetadata('isWritable', proto, key)) {
                val = chalk_1.default.grey(val);
            }
        }
        return [displayName, val, key];
    };
    Object.keys(categories).forEach(category => {
        const rowItems = categories[category];
        if (category) {
            table.push([
                {
                    colSpan: 3,
                    content: chalk_1.default.yellow(category.toUpperCase()),
                },
            ]);
        }
        table.push(...rowItems.map(toRow));
    });
    console.info(table.toString());
}
function findDevices(mib, connection, argv) {
    count += 1;
    const proto = core_1.getMibPrototype(mib);
    const type = Reflect.getMetadata('deviceType', proto);
    connection.findByType(type).catch(e => debug('error while findByType', e.stack));
    connection.on('sarp', datagram => {
        count += 1;
        if (datagram.queryType !== core_1.SarpQueryType.ByType || datagram.deviceType !== type)
            return;
        const address = new core_1.Address(datagram.mac);
        dumpDevice(address, connection, argv, mib).catch(e => console.error('error while dump:', e.message));
    });
}
const dumpCommand = {
    command: 'dump',
    describe: 'Выдать дампы устройств',
    builder: argv => argv.check(checkArgv => {
        if (checkArgv.id && !checkArgv.mac && !checkArgv.mib) {
            throw new Error(`Данный аргумент требует следующий дополнительный аргумент:
 id -> mib или id -> mac`);
        }
        return true;
    }),
    handler: serviceWrapper_1.default(argv => new Promise((resolve, reject) => {
        let timeout;
        const close = (err) => {
            clearTimeout(timeout);
            session.close();
            if (err)
                reject(err);
            else
                resolve();
        };
        const mac = argv.mac && new core_1.Address(argv.mac);
        session.start().then(value => {
            count = value;
            if (process.platform === 'win32') {
                count *= 3;
            }
        });
        session.on('found', async ({ address, connection }) => {
            try {
                if (connection.description.link) {
                    if (mac) {
                        count += 1;
                        await dumpDevice(mac, connection, argv);
                    }
                    else if (argv.mib) {
                        findDevices(argv.mib, connection, argv);
                    }
                }
                if ((!mac || mac.equals(address)) &&
                    (!argv.mib || argv.mib === connection.description.mib)) {
                    await dumpDevice(address, connection, argv, connection.description.mib);
                }
                count -= 1;
                if (count === 0) {
                    clearTimeout(timeout);
                    process.nextTick(close);
                }
            }
            catch (e) {
                close(e.message || e);
            }
        });
        const wait = () => {
            count -= 1;
            if (count > 0) {
                timeout = setTimeout(wait, core_1.config.timeout);
            }
            else {
                close();
            }
        };
        timeout = setTimeout(wait, core_1.config.timeout);
    })),
};
exports.default = dumpCommand;
//# sourceMappingURL=dump.js.map