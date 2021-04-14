"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clientEvents_1 = require("./clientEvents");
describe('client messages', () => {
    test('setLogLevel valid', () => {
        const args = ['setLogLevel', 'none'];
        expect(clientEvents_1.SetLogLevelArgsV.is(args)).toBeTruthy();
    });
    test('setLogLevel invalid', () => {
        const args = ['setLogLevel', 'none1'];
        expect(clientEvents_1.SetLogLevelArgsV.is(args)).toBeFalsy();
    });
    test('setLogLevel1', () => {
        const args = ['setLogLevel1', 'none'];
        expect(clientEvents_1.SetLogLevelArgsV.is(args)).toBeFalsy();
    });
});
//# sourceMappingURL=clientEvents.spec.js.map