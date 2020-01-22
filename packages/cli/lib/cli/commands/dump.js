import chalk from 'chalk';
import Table from 'cli-table3';
import _ from 'lodash';
import debugFactory from 'debug';
import session, { Address, devices, SarpQueryType, config, getMibPrototype, } from '@nibus/core';
const debug = debugFactory('nibus:dump');
let count = 0;
async function dumpDevice(address, connection, argv, mib) {
    const { raw, compact } = argv;
    let device;
    if (!mib) {
        const [version, type] = await connection.getVersion(address);
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
    const rows = Object.keys(result)
        .map(key => {
        const value = raw ? device.getError(key) || device.getRawValue(key) : result[key];
        return {
            value,
            key,
            displayName: Reflect.getMetadata('displayName', device, key),
        };
    });
    const proto = Reflect.getPrototypeOf(device);
    device.release();
    const categories = _.groupBy(rows, ({ key }) => Reflect.getMetadata('category', proto, key) || '');
    console.info(` Устройство ${Reflect.getMetadata('mib', proto)} [${address.toString()}]`);
    const table = new Table({
        head: ['Название', 'Значение', 'Имя'],
        style: { compact },
        wordWrap: true,
    });
    const toRow = ({ displayName, value, key }) => {
        let val;
        if (value && value.error) {
            val = chalk.red(value.error);
        }
        else if (value && value.errcode) {
            val = chalk.red(`errcode: ${value.errcode}`);
        }
        else {
            val = JSON.stringify(value);
            if (!Reflect.getMetadata('isWritable', proto, key)) {
                val = chalk.grey(val);
            }
        }
        return [displayName, val, key];
    };
    Object.keys(categories).forEach(category => {
        const rowItems = categories[category];
        if (category) {
            table.push([{
                    colSpan: 3,
                    content: chalk.yellow(category.toUpperCase()),
                }]);
        }
        table.push(...rowItems.map(toRow));
    });
    console.info(table.toString());
}
function findDevices(mib, connection, argv) {
    count += 1;
    const proto = getMibPrototype(mib);
    const type = Reflect.getMetadata('deviceType', proto);
    connection.findByType(type).catch(e => debug('error while findByType', e.stack));
    connection.on('sarp', datagram => {
        count += 1;
        if (datagram.queryType !== SarpQueryType.ByType || datagram.deviceType !== type)
            return;
        const address = new Address(datagram.mac);
        dumpDevice(address, connection, argv, mib).catch(e => console.error('error while dump:', e.message));
    });
}
const dumpCommand = {
    command: 'dump',
    describe: 'Выдать дампы устройств',
    builder: argv => argv
        .check(checkArgv => {
        if (checkArgv.id && (!checkArgv.mac && !checkArgv.mib)) {
            throw new Error(`Данный аргумент требует следующий дополнительный аргумент:
 id -> mib или id -> mac`);
        }
        return true;
    }),
    handler: argv => new Promise((resolve, reject) => {
        let timeout;
        const close = (err) => {
            clearTimeout(timeout);
            session.close();
            if (err)
                reject(err);
            else
                resolve();
        };
        const mac = argv.mac && new Address(argv.mac);
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
                if ((!mac || mac.equals(address))
                    && (!argv.mib || argv.mib === connection.description.mib)) {
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
                timeout = setTimeout(wait, config.timeout);
            }
            else {
                close();
            }
        };
        timeout = setTimeout(wait, config.timeout);
    }),
};
export default dumpCommand;
//# sourceMappingURL=dump.js.map