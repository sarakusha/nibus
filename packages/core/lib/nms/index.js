"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const nbconst_1 = require("../nbconst");
const config_1 = __importDefault(require("../nibus/config"));
const nms_1 = require("./nms");
exports.getNmsType = nms_1.getNmsType;
const NmsDatagram_1 = __importDefault(require("./NmsDatagram"));
exports.NmsDatagram = NmsDatagram_1.default;
const NmsServiceType_1 = __importDefault(require("./NmsServiceType"));
exports.NmsServiceType = NmsServiceType_1.default;
const NmsValueType_1 = __importDefault(require("./NmsValueType"));
exports.NmsValueType = NmsValueType_1.default;
function createNmsRead(destination, ...ids) {
    if (ids.length > 21) {
        throw new Error('To many properties (21)');
    }
    const [id, ...rest] = ids;
    const nms = lodash_1.default.flatten(rest.map(next => [
        (NmsServiceType_1.default.Read << 3) | (next >> 8),
        next & 0xff,
        0,
    ]));
    return new NmsDatagram_1.default({
        destination,
        id,
        notReply: false,
        nms: Buffer.from(nms),
        service: NmsServiceType_1.default.Read,
    });
}
exports.createNmsRead = createNmsRead;
function createNmsWrite(destination, id, type, value, notReply = false) {
    const nms = nms_1.encodeValue(type, value);
    return new NmsDatagram_1.default({
        destination,
        id,
        notReply,
        nms,
        service: NmsServiceType_1.default.Write,
    });
}
exports.createNmsWrite = createNmsWrite;
function createNmsInitiateUploadSequence(destination, id) {
    return new NmsDatagram_1.default({
        destination,
        id,
        service: NmsServiceType_1.default.InitiateUploadSequence,
    });
}
exports.createNmsInitiateUploadSequence = createNmsInitiateUploadSequence;
function createNmsRequestDomainUpload(destination, domain) {
    if (domain.length !== 8) {
        throw new Error('domain must be string of 8 characters');
    }
    return new NmsDatagram_1.default({
        destination,
        id: 0,
        nms: Buffer.from(domain, 'ascii'),
        service: NmsServiceType_1.default.RequestDomainUpload,
    });
}
exports.createNmsRequestDomainUpload = createNmsRequestDomainUpload;
function createNmsUploadSegment(destination, id, offset, length) {
    if (offset < 0) {
        throw new Error('Invalid offset');
    }
    if (length < 0 || length > 255) {
        throw new Error('Invalid length');
    }
    const nms = Buffer.alloc(5);
    nms.writeUInt32LE(offset, 0);
    nms.writeUInt8(length, 4);
    return new NmsDatagram_1.default({
        destination,
        id,
        nms,
        service: NmsServiceType_1.default.UploadSegment,
    });
}
exports.createNmsUploadSegment = createNmsUploadSegment;
function createNmsRequestDomainDownload(destination, domain) {
    if (domain.length !== 8) {
        throw new Error('domain must be string of 8 characters');
    }
    return new NmsDatagram_1.default({
        destination,
        id: 0,
        nms: Buffer.from(domain, 'ascii'),
        service: NmsServiceType_1.default.RequestDomainDownload,
    });
}
exports.createNmsRequestDomainDownload = createNmsRequestDomainDownload;
function createNmsInitiateDownloadSequence(destination, id) {
    return new NmsDatagram_1.default({
        destination,
        id,
        service: NmsServiceType_1.default.InitiateDownloadSequence,
        timeout: 5 * config_1.default.timeout,
    });
}
exports.createNmsInitiateDownloadSequence = createNmsInitiateDownloadSequence;
function createNmsDownloadSegment(destination, id, offset, data, notReply = false) {
    if (offset < 0) {
        throw new Error('Invalid offset');
    }
    const max = nbconst_1.NMS_MAX_DATA_LENGTH - 4;
    if (data.length > max) {
        throw new Error(`Too big data. No more than ${max} bytes at a time`);
    }
    const ofs = Buffer.alloc(4, 0, 'binary');
    ofs.writeUInt32LE(offset, 0);
    return new NmsDatagram_1.default({
        destination,
        id,
        notReply,
        nms: Buffer.concat([ofs, data]),
        service: NmsServiceType_1.default.DownloadSegment,
    });
}
exports.createNmsDownloadSegment = createNmsDownloadSegment;
function createNmsTerminateDownloadSequence(destination, id) {
    return new NmsDatagram_1.default({
        destination,
        id,
        service: NmsServiceType_1.default.TerminateDownloadSequence,
        timeout: config_1.default.timeout * 10,
    });
}
exports.createNmsTerminateDownloadSequence = createNmsTerminateDownloadSequence;
function createNmsVerifyDomainChecksum(destination, id, offset, size, crc) {
    if (offset < 0) {
        throw new Error('Invalid offset');
    }
    if (size < 0) {
        throw new Error('Invalid size');
    }
    const nms = Buffer.alloc(10, 0, 'binary');
    nms.writeUInt32LE(offset, 0);
    nms.writeUInt32LE(size, 4);
    nms.writeUInt16LE(crc, 8);
    return new NmsDatagram_1.default({
        destination,
        id,
        nms,
        service: NmsServiceType_1.default.VerifyDomainChecksum,
        timeout: config_1.default.timeout * 10,
    });
}
exports.createNmsVerifyDomainChecksum = createNmsVerifyDomainChecksum;
function createExecuteProgramInvocation(destination, id, notReply = false, ...args) {
    let nms = Buffer.alloc(0);
    if (args.length > 0) {
        const size = args.reduce((len, [type, value]) => len + nms_1.getSizeOf(type, value), 1);
        nms = Buffer.alloc(size);
        let pos = nms.writeUInt8(args.length, 0);
        args.forEach(([type, value]) => {
            pos = nms_1.writeValue(type, value, nms, pos);
        });
    }
    return new NmsDatagram_1.default({
        destination,
        id,
        nms,
        notReply,
        service: NmsServiceType_1.default.ExecuteProgramInvocation,
        timeout: config_1.default.timeout * 3,
    });
}
exports.createExecuteProgramInvocation = createExecuteProgramInvocation;
//# sourceMappingURL=index.js.map