import _ from 'lodash';
import Table from 'table-layout';
import { PATH, Client } from '@nibus/core';
const listCommand = {
    command: 'list',
    describe: 'Показать список доступных устройств',
    builder: {},
    handler: async () => new Promise((resolve, reject) => {
        const socket = Client.connect(PATH);
        let resolved = false;
        let error;
        socket.once('close', () => {
            resolved ? resolve() : reject(error && error.message);
        });
        socket.on('ports', (ports) => {
            const rows = _.sortBy(ports, [_.property('description.category')])
                .map(({ portInfo: { manufacturer, category, device, comName, }, }) => ({
                manufacturer,
                category,
                device,
                comName,
            }));
            const table = new Table(rows, {
                maxWidth: 80,
            });
            console.info(table.toString());
            resolved = true;
            socket.destroy();
        });
        socket.on('error', err => {
            if (err?.code === 'ENOENT') {
                error = new Error('Сервис не запущен');
            }
            else {
                error = err;
            }
        });
    }),
};
export default listCommand;
//# sourceMappingURL=list.js.map