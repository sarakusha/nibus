"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Either_1 = require("fp-ts/lib/Either");
const events_1 = require("./events");
const portsEvent = {
    event: 'ports',
    args: [[
            {
                portInfo: {
                    path: 'com1',
                    productId: 1,
                    vendorId: 2,
                },
                description: { mib: 'test' },
            },
            {
                portInfo: {
                    path: 'com2',
                    productId: 1,
                    vendorId: 2,
                },
                description: { mib: 'test' },
            },
        ]],
};
const addEvent = {
    event: 'add',
    args: [{
            portInfo: {
                path: 'com3',
                productId: 1,
                vendorId: 2,
            },
            description: { mib: 'test' },
        }],
};
const removeEvent = {
    event: 'remove',
    args: [{
            portInfo: {
                path: 'com3',
                productId: 1,
                vendorId: 2,
            },
            description: { mib: 'test' },
        }],
};
const testEvent = {
    event: 'test',
    args: [{
            a: 1,
            b: 2,
        }],
};
const events = [
    portsEvent,
    addEvent,
    removeEvent,
];
describe('event tests', () => {
    test('PortsEvent', () => {
        expect(events_1.PortsEventV.is(portsEvent)).toBeTruthy();
        expect(events_1.PortAddedEventV.is(portsEvent)).toBeFalsy();
        expect(events_1.PortRemovedEventV.is(portsEvent)).toBeFalsy();
    });
    test('PortAddedEvent', () => {
        expect(events_1.PortsEventV.is(addEvent)).toBeFalsy();
        expect(events_1.PortAddedEventV.is(addEvent)).toBeTruthy();
        expect(events_1.PortRemovedEventV.is(addEvent)).toBeFalsy();
    });
    test('PortRemovedEvent', () => {
        expect(events_1.PortsEventV.is(removeEvent)).toBeFalsy();
        expect(events_1.PortAddedEventV.is(removeEvent)).toBeFalsy();
        expect(events_1.PortRemovedEventV.is(removeEvent)).toBeTruthy();
    });
    test('Event', () => {
        expect(events_1.EventV.is(portsEvent)).toBeTruthy();
        expect(events_1.EventV.is(addEvent)).toBeTruthy();
        expect(events_1.EventV.is(removeEvent)).toBeTruthy();
    });
    test('invalid event', () => {
        expect(events_1.PortsEventV.is(testEvent)).toBeFalsy();
        expect(events_1.PortAddedEventV.is(testEvent)).toBeFalsy();
        expect(events_1.PortRemovedEventV.is(testEvent)).toBeFalsy();
        expect(events_1.EventV.is(testEvent)).toBeFalsy();
    });
    test('stringify', () => {
        events.forEach(event => {
            expect(events_1.EventFromString.encode(event)).toBe(JSON.stringify(event));
        });
    });
    test('parse', () => {
        events.forEach(event => {
            const validate = events_1.EventFromString.decode(JSON.stringify(event));
            expect(Either_1.isRight(validate));
            expect(Either_1.isRight(validate) && validate.right).toEqual(event);
        });
    });
});
//# sourceMappingURL=events.spec.js.map