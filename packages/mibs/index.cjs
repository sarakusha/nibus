Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let fs = require("fs");
fs = __toESM(fs);
let path = require("path");
path = __toESM(path);
let io_ts = require("io-ts");
io_ts = __toESM(io_ts);
let fp_ts_lib_Either_js = require("fp-ts/lib/Either.js");
let io_ts_lib_PathReporter_js = require("io-ts/lib/PathReporter.js");
let debug = require("debug");
debug = __toESM(debug);

//#region json/index.js
var require_json = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = __dirname;
}));

//#endregion
//#region index.ts
/*
* @license
* Copyright (c) 2022. Nata-Info
* @author Andrei Sarakeev <avs@nata-info.ru>
*
* This file is part of the "@nibus" project.
* For the full copyright and license information, please view
* the EULA file that was distributed with this source code.
*/
var import_json = /* @__PURE__ */ __toESM(require_json());
(0, debug.default)("nibus:mibs")(`root: ${import_json.default}`);
const MibPropertyAppInfoV = io_ts.intersection([io_ts.type({
	nms_id: io_ts.union([io_ts.string, io_ts.Int]),
	access: io_ts.string
}), io_ts.partial({
	category: io_ts.string,
	rank: io_ts.string,
	zero: io_ts.string,
	units: io_ts.string,
	precision: io_ts.string,
	representation: io_ts.string,
	get: io_ts.string,
	set: io_ts.string
})]);
const MibPropertyV = io_ts.type({
	type: io_ts.string,
	annotation: io_ts.string,
	appinfo: MibPropertyAppInfoV
});
const MibDeviceAppInfoV = io_ts.intersection([io_ts.type({ mib_version: io_ts.string }), io_ts.partial({
	device_type: io_ts.string,
	loader_type: io_ts.string,
	firmware: io_ts.string,
	min_version: io_ts.string,
	disable_batch_reading: io_ts.string
})]);
const MibDeviceTypeV = io_ts.type({
	annotation: io_ts.string,
	appinfo: MibDeviceAppInfoV,
	properties: io_ts.record(io_ts.string, MibPropertyV)
});
const MibTypeV = io_ts.intersection([io_ts.type({ base: io_ts.string }), io_ts.partial({
	appinfo: io_ts.partial({
		zero: io_ts.string,
		units: io_ts.string,
		precision: io_ts.string,
		representation: io_ts.string,
		get: io_ts.string,
		set: io_ts.string
	}),
	minInclusive: io_ts.string,
	maxInclusive: io_ts.string,
	enumeration: io_ts.record(io_ts.string, io_ts.type({ annotation: io_ts.string }))
})]);
const MibSubroutineV = io_ts.intersection([io_ts.type({
	annotation: io_ts.string,
	appinfo: io_ts.intersection([io_ts.type({ nms_id: io_ts.union([io_ts.string, io_ts.Int]) }), io_ts.partial({ response: io_ts.string })])
}), io_ts.partial({ properties: io_ts.record(io_ts.string, io_ts.type({
	type: io_ts.string,
	annotation: io_ts.string
})) })]);
const SubroutineTypeV = io_ts.type({
	annotation: io_ts.string,
	properties: io_ts.type({ id: io_ts.type({
		type: io_ts.literal("xs:unsignedShort"),
		annotation: io_ts.string
	}) })
});
const MibDeviceV = io_ts.intersection([io_ts.type({
	device: io_ts.string,
	types: io_ts.record(io_ts.string, io_ts.union([
		MibDeviceTypeV,
		MibTypeV,
		SubroutineTypeV
	]))
}), io_ts.partial({ subroutines: io_ts.record(io_ts.string, MibSubroutineV) })]);
const decodeMib = (name) => {
	const mibPath = `${import_json.default}/${name}.mib.json`;
	const mibValidation = MibDeviceV.decode(JSON.parse(fs.readFileSync(mibPath).toString()));
	if ((0, fp_ts_lib_Either_js.isLeft)(mibValidation)) throw new Error(`Invalid mib file ${name} ${io_ts_lib_PathReporter_js.PathReporter.report(mibValidation).join("\n")}`);
	return mibValidation.right;
};
function notEmpty(value) {
	return value !== null && value !== void 0;
}
const mibs = Object.fromEntries(fs.readdirSync(import_json.default).filter((file) => file.endsWith(".mib.json")).map((file) => path.basename(file, ".mib.json")).map((mibname) => {
	try {
		return [mibname, decodeMib(mibname)];
	} catch (err) {
		console.error(`Invalid mib ${mibname}: ${err.message}`);
		return;
	}
}).filter(notEmpty));
const getMibNames = () => Object.keys(mibs);
const getMib = (name) => mibs[name];

//#endregion
exports.MibDeviceV = MibDeviceV;
exports.getMib = getMib;
exports.getMibNames = getMibNames;