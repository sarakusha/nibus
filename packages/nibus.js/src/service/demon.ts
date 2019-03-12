import debugFactory from 'debug';
import { Socket } from 'net';
import Configstore from 'configstore';
import { SerialTee, Server } from '../ipc';
import { SerialLogger } from '../ipc/SerialTee';
import { Direction } from '../ipc/Server';
import { NibusDatagram, NibusDecoder } from '../nibus';
import { printBuffer } from '../nibus/helper';
import { PATH } from './const';
import detector from './detector';
import { IKnownPort } from './KnownPorts';
import pkg from '../../package.json';

const conf = new Configstore(pkg.name, { logLevel: 'none' });

debugFactory.enable('nibus:detector,nibus.service');
const debug = debugFactory('nibus:service');

const noop = () => {};

if (process.platform === 'win32') {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
}

type LogLevel = 'none' | 'hex' | 'nibus';
type Fields = string[] | undefined;

const direction = (dir: Direction) => dir === Direction.in ? '<<<' : '>>>';
const decoderIn = new NibusDecoder();
decoderIn.on('data', (datagram: NibusDatagram) => {
  debug(`${direction(Direction.in)} ${datagram.toString({
    pick: conf.get('pick') as Fields,
    omit: conf.get('omit') as Fields,
  })}`);
});
const decoderOut = new NibusDecoder();
decoderOut.on('data', (datagram: NibusDatagram) => {
  debug(`${direction(Direction.out)} ${datagram.toString({
    pick: conf.get('pick') as Fields,
    omit: conf.get('omit') as Fields,
  })}`);
});

const loggers = {
  none: null,
  hex: (data: Buffer, dir: Direction) => {
    debug(`${direction(dir)} ${printBuffer(data)}`);
  },
  nibus: (data: Buffer, dir: Direction) => {
    switch (dir) {
      case Direction.in:
        decoderIn.write(data);
        break;
      case Direction.out:
        decoderOut.write(data);
        break;
    }
  },
};

class NibusService {
  private readonly server: Server;
  private isStarted = false;
  private connections: SerialTee[] = [];

  constructor() {
    this.server = new Server(PATH);
    this.server.on('connection', this.connectionHandler);
    this.server.on('client:setLogLevel', this.logLevelHandler);
  }

  updateLogger(connection?: SerialTee) {
    const logger: SerialLogger | null = loggers[conf.get('logLevel') as LogLevel];
    const connections = connection ? [connection] : this.connections;
    connections.forEach(con => con.setLogger(logger));
  }

  private logLevelHandler = (
    client: Socket,
    logLevel: LogLevel | undefined,
    pickFields: Fields,
    omitFields: Fields) => {
    logLevel && conf.set('logLevel', logLevel);
    pickFields || conf.set('pick', pickFields);
    omitFields || conf.set('omit', omitFields);
    this.updateLogger();
  };

  private connectionHandler = (socket: Socket) => {
    const { server, connections } = this;
    server
      .send(socket, 'ports', connections.map(connection => connection.toJSON()))
      .catch((err) => {
        debug('<error>', err.stack);
      });
  };

  private addHandler = (portInfo: IKnownPort) => {
    const { category } = portInfo;
    const mibCategory = detector.detection!.mibCategories[category!];
    if (mibCategory) {
      // debug('connection added', mibCategory);
      const connection = new SerialTee(portInfo, mibCategory);
      connection.on('close', (comName: string) => this.removeHandler({ comName }));
      this.connections.push(connection);
      this.server.broadcast('add', connection.toJSON()).catch(noop);
      this.updateLogger(connection);
      // this.find(connection);
    }
  };

  private removeHandler = ({ comName }: { comName: string }) => {
    const index = this.connections.findIndex(({ portInfo: { comName: port } }) => port === comName);
    if (index !== -1) {
      const [connection] = this.connections.splice(index, 1);
      // debug(`nibus-connection was closed ${connection.description.category}`);
      connection.close();
      this.server.broadcast('remove', connection.toJSON()).catch(noop);
    }
  };

  public start() {
    if (this.isStarted) return;
    this.isStarted = true;
    const { detection } = detector;
    if (detection == null) throw new Error('detection is N/A');
    detector.on('add', this.addHandler);
    detector.on('remove', this.removeHandler);
    detector.getPorts().catch((err) => {
      console.error('error while get ports', err.stack);
    });

    detector.start();
    process.once('SIGINT', () => this.stop());
    process.once('SIGTERM', () => this.stop());
    /**
     * @event NibusService#start
     */
    debug('started');
  }

  public stop() {
    if (!this.isStarted) return;
    const connections = this.connections.splice(0, this.connections.length);
    if (connections.length) {
      // Хак, нужен чтобы успеть закрыть все соединения, иначе не успевает их закрыть и выходит
      setTimeout(() => {
        connections.forEach(connection => connection.close());
      }, 0);
    }
    detector.removeListener('add', this.addHandler);
    detector.removeListener('remove', this.removeHandler);
    // detector.stop();
    this.isStarted = false;
    debug('stopped');
  }

  get path() {
    return this.server.path;
  }
}

const service = new NibusService();

service.start();