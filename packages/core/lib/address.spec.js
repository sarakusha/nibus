"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Address_1 = __importStar(require("./Address"));
describe('Address', () => {
    describe('constructor', () => {
        test('should be empty', () => {
            const empty = new Address_1.default();
            expect(empty).toHaveProperty('type', Address_1.AddressType.empty);
            expect(empty.isEmpty).toBe(true);
            expect(new Address_1.default(empty.toString())).toHaveProperty('isEmpty', true);
            expect(new Address_1.default([0, 0, 0, 0, 0, 0])).toHaveProperty('isEmpty', true);
        });
        test('should be net', () => {
            const net = expect(new Address_1.default('FE.56.34'));
            net.toHaveProperty('type', Address_1.AddressType.net);
            net.toHaveProperty('domain', 0xfe);
            net.toHaveProperty('subnet', 0x56);
            net.toHaveProperty('device', 0x34);
        });
        test('should be group', () => {
            const group = expect(new Address_1.default('255.128'));
            group.toHaveProperty('domain', 255);
            group.toHaveProperty('group', 128);
            group.toHaveProperty('type', Address_1.AddressType.group);
        });
        test('should be string mac', () => {
            const address = new Address_1.default('01::FF:23');
            const address2 = new Address_1.default('::45:77');
            const empty = new Address_1.default('::0');
            expect(address).toHaveProperty('type', Address_1.AddressType.mac);
            expect(address.mac && address.mac.equals(Buffer.from([1, 0, 0, 0, 255, 0x23]))).toBe(true);
            expect(address2.mac && address2.mac.equals(Buffer.from([0, 0, 0, 0, 0x45, 0x77]))).toBe(true);
            expect(empty).toHaveProperty('type', Address_1.AddressType.empty);
        });
        test('should be array mac', () => {
            const array = [1, 2, 3, 4, 5, 6];
            const mac = new Uint8Array(array);
            const address = new Address_1.default(mac);
            expect(address.mac && address.mac.equals(mac)).toBe(true);
            expect(address).toHaveProperty('type', Address_1.AddressType.mac);
        });
        test('should be ::8E:14', () => {
            const address = new Address_1.default('0000000000008E14');
            const address1 = new Address_1.default('08E14');
            const address2 = new Address_1.default('::8e:14');
            expect(address.type).toBe(Address_1.AddressType.mac);
            expect(address.equals(address2)).toBeTruthy();
            expect(address1.equals(address2)).toBeTruthy();
        });
    });
    describe('comparison', () => {
        const a = new Address_1.default('::45:78');
        const b = new Address_1.default([0, 0, 0, 0, 0x45, 0x78]);
        const c = new Address_1.default();
        const d = new Address_1.default('::45:79');
        test('should be equal', () => {
            expect(a.equals(b)).toBe(true);
            expect(a.equals(a)).toBe(true);
            expect(c.equals(Address_1.default.empty)).toBe(true);
            expect(a.equals(new Address_1.default(a))).toBe(true);
        });
        test("shouldn't be equal", () => {
            expect(a.equals(c)).toBe(false);
            expect(a.equals(d)).toBe(false);
        });
    });
    test('toString', () => {
        expect(new Address_1.default().toString()).toBe('::0');
        expect(Address_1.default.broadcast.toString()).toBe('FF:FF:FF:FF:FF:FF');
        expect(new Address_1.default('::12:3f').toString()).toBe('::12:3F');
        expect(new Address_1.default([1, 2, 3, 4, 5, 6]).toString()).toBe('01:02:03:04:05:06');
        expect(new Address_1.default('ff.0.1').toString()).toBe('255.0.1');
        expect(new Address_1.default('12.34').toString()).toBe('12.34');
    });
});
//# sourceMappingURL=address.spec.js.map