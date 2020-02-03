"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pm2_1 = __importDefault(require("pm2"));
const debug_1 = __importDefault(require("../../debug"));
const start_1 = require("./start");
const debug = debug_1.default('nibus:start');
const stopCommand = {
    command: 'stop',
    describe: 'остановить службу NiBUS',
    builder: {},
    handler: () => {
        pm2_1.default.connect(err => {
            if (err) {
                console.error('error while connect pm2', err.stack);
                pm2_1.default.disconnect();
                process.exit(2);
            }
            debug('pm2 is connected');
            pm2_1.default.delete(start_1.startOptions.name, error => {
                if (error && error.message !== 'process name not found') {
                    console.error('не удалось остановить сервис', error.message);
                }
                else {
                    console.info('nibus.service остановлен');
                }
                pm2_1.default.disconnect();
            });
        });
    },
};
exports.default = stopCommand;
//# sourceMappingURL=stop.js.map