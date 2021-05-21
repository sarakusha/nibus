"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nibus/core");
const serviceWrapper_1 = __importDefault(require("./serviceWrapper"));
const session = core_1.getDefaultSession();
const { devices } = session;
function makeAddressHandler(action, breakout = false) {
    return serviceWrapper_1.default(async (args) => {
        let count = (await session.start()) * (process.platform === 'win32' ? 3 : 1);
        return new Promise(resolve => {
            let timeout;
            let hasFound = false;
            const close = (err) => {
                clearTimeout(timeout);
                session.close();
                if (err || !hasFound) {
                    console.error(err || 'Устройство не найдено');
                }
                resolve();
            };
            const mac = new core_1.Address(args.mac);
            if (args.timeout && args.timeout !== (core_1.config.get('timeout') || 1000) * 1000) {
                core_1.config.set('timeout', args.timeout * 1000);
            }
            const perform = async (connection, mibOrType, version) => {
                clearTimeout(timeout);
                const device = typeof mibOrType === 'string'
                    ? devices.create(mac, mibOrType)
                    : devices.create(mac, mibOrType, version);
                device.connection = connection;
                await action(device, args);
                hasFound = true;
            };
            const wait = () => {
                count -= 1;
                if (count > 0) {
                    timeout = setTimeout(wait, core_1.config.get('timeout') || 1000);
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
                        const { version, type } = (await connection.getVersion(mac)) ?? {};
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
            timeout = setTimeout(wait, core_1.config.get('timeout') || 1000);
        });
    });
}
exports.default = makeAddressHandler;
//# sourceMappingURL=handlers.js.map