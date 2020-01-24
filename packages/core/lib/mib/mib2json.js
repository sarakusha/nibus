"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const iconv_lite_1 = require("iconv-lite");
const path = __importStar(require("path"));
const sax_1 = __importDefault(require("sax"));
const stream_1 = require("stream");
class Utf8Converter extends stream_1.Transform {
    constructor(encoding) {
        super();
        this.encoding = encoding;
        if (!iconv_lite_1.encodingExists(encoding)) {
            throw new Error(`encoding ${encoding} is not supported`);
        }
    }
    _transform(chunk, _encoding, callback) {
        callback(undefined, iconv_lite_1.decode(chunk, this.encoding));
    }
}
function getEncoding(mibpath) {
    return new Promise((resolve, reject) => {
        let encoding;
        const saxStream = sax_1.default.createStream(true, {});
        saxStream.on('error', err => reject(err));
        saxStream.on('processinginstruction', pi => {
            if (!pi.body) {
                return;
            }
            const match = /encoding="(.*)"/g.exec(pi.body);
            if (match) {
                [, encoding] = match;
            }
        });
        saxStream.on('end', () => resolve(encoding));
        fs_1.default.createReadStream(mibpath).pipe(saxStream);
    });
}
function mib2json(mibpath) {
    return new Promise((resolve, reject) => {
        const saxStream = sax_1.default.createStream(true, {
            xmlns: true,
            trim: true,
            normalize: true,
        });
        saxStream.on('error', err => reject(err));
        const root = {};
        let level = 0;
        let current;
        const types = {};
        let subroutines;
        const trail = [];
        let state;
        saxStream.on('opentag', tag => {
            if (level < 5 || subroutines) {
                switch (tag.local) {
                    case 'element':
                        if (level === 1) {
                            root[tag.attributes.name.value] = tag.attributes.type.value;
                        }
                        else if (subroutines) {
                            current = subroutines[tag.attributes.name.value] = {};
                        }
                        break;
                    case 'simpleType':
                    case 'complexType':
                        if (level === 1) {
                            current = types[tag.attributes.name.value] = {};
                            trail.length = 0;
                        }
                        break;
                    case 'sequence':
                        if (level === 2) {
                            trail.push(current);
                            current = false;
                            root.subroutines = subroutines = {};
                        }
                        break;
                    case 'annotation':
                        state = 'annotation';
                        break;
                    case 'appinfo':
                        current.appinfo = {};
                        state = 'appinfo';
                        break;
                    case 'restriction':
                        current.base = tag.attributes.base.value;
                        break;
                    case 'minInclusive':
                    case 'maxInclusive':
                    case 'minExclusive':
                    case 'maxExclusive':
                        current[tag.local] = tag.attributes.value.value;
                        break;
                    case 'enumeration':
                        current.enumeration = current.enumeration || {};
                        trail.push(current);
                        current = current.enumeration[tag.attributes.value.value] = {};
                        break;
                    case 'attribute':
                        current.properties = current.properties || {};
                        trail.push(current);
                        current = current.properties[tag.attributes.name.value] = {
                            type: tag.attributes.type.value,
                        };
                        break;
                    default:
                        console.warn('Unknown tag', tag.local);
                        break;
                }
            }
            level += 1;
        });
        saxStream.on('closetag', tagName => {
            level -= 1;
            if (tagName === 'xs:sequence') {
                subroutines = false;
                current = trail.pop();
            }
            else if (current) {
                if (tagName === 'xs:attribute' || tagName === 'xs:enumeration') {
                    current = trail.pop();
                }
            }
        });
        const textHandler = function textHandler(text) {
            if (current) {
                if (state === 'appinfo') {
                    const { local } = this._parser.tag;
                    const { appinfo } = current;
                    if (appinfo[local]) {
                        appinfo[local] += `
${text}`;
                    }
                    else {
                        appinfo[local] = text;
                    }
                }
                state === 'annotation' && (current.annotation = text);
            }
        };
        saxStream.on('text', textHandler);
        saxStream.on('end', () => {
            root.types = types;
            resolve(root);
        });
        getEncoding(mibpath)
            .then(encoding => {
            let input = fs_1.default.createReadStream(mibpath);
            if (encoding && iconv_lite_1.encodingExists(encoding)) {
                input = input.pipe(new Utf8Converter(encoding));
            }
            input.pipe(saxStream);
        })
            .catch(reject);
    });
}
exports.mib2json = mib2json;
async function convert(mibpath, dir) {
    const json = await mib2json(mibpath);
    let jsonpath = `${mibpath.replace(/\.[^/.]+$/, '')}.json`;
    if (dir) {
        jsonpath = path.resolve(dir, path.basename(jsonpath));
    }
    const data = JSON.stringify(json, null, 2);
    return new Promise((resolve, reject) => {
        fs_1.default.writeFile(jsonpath, data, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve(jsonpath);
            }
        });
    });
}
exports.convert = convert;
const xsdMibRe = /^\S+\.mib\.xsd$/i;
const jsonMibRe = /^(\S+)\.mib\.json$/i;
exports.convertDir = (dir) => new Promise((resolve, reject) => {
    fs_1.default.readdir(dir, (err, files) => {
        if (err) {
            return reject(err);
        }
        const promises = files
            .filter(file => xsdMibRe.test(file))
            .map(file => convert(path.join(dir, file))
            .then(() => console.info(`${file}: success`))
            .catch(error => console.error(`${file}: ${error.message}`)));
        return resolve(Promise.all(promises).then(() => { }));
    });
});
let mibs = [];
const mibsDir = path.resolve(__dirname, '../../mibs');
function filesToMibs(files) {
    return files
        .map(file => jsonMibRe.exec(file))
        .filter(matches => matches != null)
        .map(matches => matches[1]);
}
function getMibs() {
    return new Promise((resolve, reject) => {
        fs_1.default.readdir(mibsDir, (err, files) => {
            if (err) {
                mibs = [];
                return reject(err);
            }
            mibs = filesToMibs(files);
            return resolve(mibs);
        });
    });
}
exports.getMibs = getMibs;
function getMibsSync() {
    if (!mibs || mibs.length === 0) {
        mibs = filesToMibs(fs_1.default.readdirSync(mibsDir));
    }
    return mibs;
}
exports.getMibsSync = getMibsSync;
//# sourceMappingURL=mib2json.js.map