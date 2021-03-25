"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('slip', () => {
    test('decode', () => {
        const res = index_1.trySlipDecode([0xc0, 5, 0, 0x41]);
        expect(res).toEqual({
            fn: 5,
        });
    });
});
//# sourceMappingURL=index.spec.js.map