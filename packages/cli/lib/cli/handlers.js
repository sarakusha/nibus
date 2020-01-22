import session, { devices, Address, config, } from '@nibus/core';
export default function makeAddressHandler(action, breakout = false) {
    return (args) => new Promise((resolve, reject) => {
        let timeout;
        let count = 0;
        let hasFound = false;
        session.start().then(value => { count = value; });
        const close = (err) => {
            clearTimeout(timeout);
            session.close();
            if (err || !hasFound) {
                reject(err || 'Устройство не найдено');
                return;
            }
            resolve();
        };
        const mac = new Address(args.mac);
        if (args.timeout && args.timeout !== config.timeout * 1000) {
            config.timeout = args.timeout * 1000;
        }
        if (process.platform === 'win32') {
            count *= 3;
        }
        const perform = async (connection, mibOrType, version) => {
            clearTimeout(timeout);
            const device = devices.create(mac, mibOrType, version);
            device.connection = connection;
            await action(device, args);
            hasFound = true;
        };
        const wait = () => {
            count -= 1;
            if (count > 0) {
                timeout = setTimeout(wait, config.timeout);
            }
            else {
                close();
            }
        };
        session.on('found', async ({ address, connection }) => {
            try {
                if (address.equals(mac) && connection.description.mib) {
                    if (!args.mib || args.mib === connection.description.mib) {
                        await perform(connection, connection.description.mib);
                        if (breakout) {
                            close();
                            return;
                        }
                        wait();
                    }
                }
                if ((address.equals(mac) && connection.description.type) || connection.description.link) {
                    count += 1;
                    const [version, type] = await connection.getVersion(mac);
                    if (type) {
                        await perform(connection, type, version);
                        if (breakout) {
                            close();
                            return;
                        }
                        wait();
                    }
                }
            }
            catch (e) {
                close(e.message || e);
            }
            count -= 1;
            if (count === 0) {
                clearTimeout(timeout);
                process.nextTick(close);
            }
        });
        timeout = setTimeout(wait, config.timeout);
    });
}
//# sourceMappingURL=handlers.js.map