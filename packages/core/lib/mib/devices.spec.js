"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const __1 = __importDefault(require(".."));
const mib2json_1 = require("./mib2json");
const { devices } = __1.default;
describe('Device', () => {
    test('one mib - one prototype', () => {
        const device1 = devices.create('::34:56', 'mcdvi');
        const device2 = devices.create('::11:22', 'mcdvi');
        const device3 = devices.create('::66:77', 'siolynx');
        expect(Reflect.getPrototypeOf(device1)).toBe(Reflect.getPrototypeOf(device2));
        expect(Reflect.getPrototypeOf(device1)).not.toBe(Reflect.getPrototypeOf(device3));
    });
    test('has version property', () => {
        const device = devices.create('auto', 'siolynx');
        expect(device.getId('2')).toBe(device.getId('version'));
        expect(device.getId('cdata')).toBe(271);
        expect(device.getId(271)).toBe(271);
        expect(device.getId('10f')).toBe(271);
    });
    test('different properties', () => {
        const device1 = devices.create('::34:56', 'mcdvi');
        const device2 = devices.create('::11:22', 'mcdvi');
        device1.brightness = 100;
        device2.brightness = 50;
        expect(device1).toHaveProperty('brightness', 100);
        expect(device1.getRawValue('brightness')).toBe(255);
        expect(device1.isDirty('brightness')).toBe(true);
        expect(device1.isDirty('version')).toBe(false);
        expect(device2).toHaveProperty('brightness', 50);
    });
    test('mibs', async () => {
        const mibs = await mib2json_1.getMibs();
        expect(mibs.length).toBeGreaterThanOrEqual(43);
    });
});
//# sourceMappingURL=devices.spec.js.map