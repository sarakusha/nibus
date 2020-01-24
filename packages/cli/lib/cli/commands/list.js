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
const lodash_1 = __importDefault(require("lodash"));
const table_layout_1 = __importDefault(require("table-layout"));
const core_1 = require("@nibus/core");
const listCommand = {
    command: 'list',
    describe: 'Показать список доступных устройств',
    builder: {},
    handler: () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const socket = core_1.Client.connect(core_1.PATH);
            let resolved = false;
            let error;
            socket.once('close', () => {
                resolved ? resolve() : reject(error && error.message);
            });
            socket.on('ports', (ports) => {
                const rows = lodash_1.default.sortBy(ports, [lodash_1.default.property('description.category')])
                    .map(({ portInfo: { manufacturer, category, device, path, }, }) => ({
                    manufacturer,
                    category,
                    device,
                    path,
                }));
                const table = new table_layout_1.default(rows, {
                    maxWidth: 80,
                });
                console.info(table.toString());
                resolved = true;
                socket.destroy();
            });
            socket.on('error', err => {
                var _a;
                if (((_a = err) === null || _a === void 0 ? void 0 : _a.code) === 'ENOENT') {
                    error = new Error('Сервис не запущен');
                }
                else {
                    error = err;
                }
            });
        });
    }),
};
exports.default = listCommand;
//# sourceMappingURL=list.js.map