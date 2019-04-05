"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mib2json = mib2json;
exports.convert = convert;
exports.convertDir = convertDir;
exports.getMibs = getMibs;
exports.getMibsSync = getMibsSync;

require("source-map-support/register");

var _fs = _interopRequireDefault(require("fs"));

var _iconvLite = require("iconv-lite");

var path = _interopRequireWildcard(require("path"));

var _sax = _interopRequireDefault(require("sax"));

var _stream = require("stream");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
class Utf8Converter extends _stream.Transform {
  constructor(encoding) {
    super();
    this.encoding = encoding;

    if (!(0, _iconvLite.encodingExists)(encoding)) {
      throw new Error(`encoding ${encoding} is not supported`);
    }
  } // tslint:disable-next-line


  _transform(chunk, encoding, callback) {
    callback(undefined, (0, _iconvLite.decode)(chunk, this.encoding));
  }

}

function getEncoding(mibpath) {
  return new Promise((resolve, reject) => {
    let encoding;

    const saxStream = _sax.default.createStream(true, {});

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

    _fs.default.createReadStream(mibpath).pipe(saxStream);
  });
}

function mib2json(mibpath) {
  return new Promise((resolve, reject) => {
    const saxStream = _sax.default.createStream(true, {
      xmlns: true,
      trim: true,
      normalize: true
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
      //      logger.element(util.inspect(tag, {depth: null}));
      if (level < 5 || subroutines) {
        switch (tag.local) {
          case 'element':
            if (level === 1) {
              root[tag.attributes.name.value] = tag.attributes.type.value;
            } else if (subroutines) {
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
              type: tag.attributes.type.value
            };
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
      } else if (current) {
        if (tagName === 'xs:attribute' || tagName === 'xs:enumeration') {
          current = trail.pop();
        }
      }
    });

    const textHandler = function (text) {
      if (current) {
        if (state === 'appinfo') {
          const local = this._parser.tag.local;
          const appinfo = current.appinfo;

          if (appinfo[local]) {
            appinfo[local] += `
${text}`;
          } else {
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
    getEncoding(mibpath).then(encoding => {
      let input = _fs.default.createReadStream(mibpath);

      if (encoding && (0, _iconvLite.encodingExists)(encoding)) {
        input = input.pipe(new Utf8Converter(encoding));
      }

      input.pipe(saxStream);
    }).catch(reject);
  });
}

async function convert(mibpath, dir) {
  const json = await mib2json(mibpath);
  let jsonpath = `${mibpath.replace(/\.[^/.]+$/, '')}.json`;

  if (dir) {
    jsonpath = path.resolve(dir, path.basename(jsonpath));
  }

  const data = JSON.stringify(json, null, 2);
  return new Promise((resolve, reject) => {
    _fs.default.writeFile(jsonpath, data, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

const xsdMibRe = /^\S+\.mib\.xsd$/i;
const jsonMibRe = /^(\S+)\.mib\.json$/i;

function convertDir(dir) {
  return new Promise((resolve, reject) => {
    _fs.default.readdir(dir, (err, files) => {
      if (err) {
        return reject(err);
      }

      const promises = files.filter(file => xsdMibRe.test(file)).map(file => convert(path.join(dir, file)).then(() => console.info(`${file}: success`)).catch(error => console.error(`${file}: ${error.message}`)));
      resolve(Promise.all(promises).then(() => void 0));
    });
  });
}

let mibs = [];
const mibsDir = path.resolve(__dirname, '../../mibs');

function filesToMibs(files) {
  return files.map(file => jsonMibRe.exec(file)).filter(matches => matches != null).map(matches => matches[1]);
}

function getMibs() {
  return new Promise((resolve, reject) => {
    _fs.default.readdir(mibsDir, (err, files) => {
      if (err) {
        mibs = [];
        return reject(err);
      }

      mibs = filesToMibs(files);
      resolve(mibs);
    });
  });
}

function getMibsSync() {
  if (!mibs || mibs.length === 0) {
    mibs = filesToMibs(_fs.default.readdirSync(mibsDir));
  }

  return mibs;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taWIvbWliMmpzb24udHMiXSwibmFtZXMiOlsiVXRmOENvbnZlcnRlciIsIlRyYW5zZm9ybSIsImNvbnN0cnVjdG9yIiwiZW5jb2RpbmciLCJFcnJvciIsIl90cmFuc2Zvcm0iLCJjaHVuayIsImNhbGxiYWNrIiwidW5kZWZpbmVkIiwiZ2V0RW5jb2RpbmciLCJtaWJwYXRoIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzYXhTdHJlYW0iLCJzYXgiLCJjcmVhdGVTdHJlYW0iLCJvbiIsImVyciIsInBpIiwiYm9keSIsIm1hdGNoIiwiZXhlYyIsImZzIiwiY3JlYXRlUmVhZFN0cmVhbSIsInBpcGUiLCJtaWIyanNvbiIsInhtbG5zIiwidHJpbSIsIm5vcm1hbGl6ZSIsInJvb3QiLCJsZXZlbCIsImN1cnJlbnQiLCJ0eXBlcyIsInN1YnJvdXRpbmVzIiwidHJhaWwiLCJzdGF0ZSIsInRhZyIsImxvY2FsIiwiYXR0cmlidXRlcyIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJsZW5ndGgiLCJwdXNoIiwiYXBwaW5mbyIsImJhc2UiLCJlbnVtZXJhdGlvbiIsInByb3BlcnRpZXMiLCJ0YWdOYW1lIiwicG9wIiwidGV4dEhhbmRsZXIiLCJ0ZXh0IiwiX3BhcnNlciIsImFubm90YXRpb24iLCJ0aGVuIiwiaW5wdXQiLCJjYXRjaCIsImNvbnZlcnQiLCJkaXIiLCJqc29uIiwianNvbnBhdGgiLCJyZXBsYWNlIiwicGF0aCIsImJhc2VuYW1lIiwiZGF0YSIsIkpTT04iLCJzdHJpbmdpZnkiLCJ3cml0ZUZpbGUiLCJ4c2RNaWJSZSIsImpzb25NaWJSZSIsImNvbnZlcnREaXIiLCJyZWFkZGlyIiwiZmlsZXMiLCJwcm9taXNlcyIsImZpbHRlciIsImZpbGUiLCJ0ZXN0IiwibWFwIiwiam9pbiIsImNvbnNvbGUiLCJpbmZvIiwiZXJyb3IiLCJtZXNzYWdlIiwiYWxsIiwibWlicyIsIm1pYnNEaXIiLCJfX2Rpcm5hbWUiLCJmaWxlc1RvTWlicyIs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QUFPLElBQUlBLE9BQU8sSUFBSSxJQUZ6QixFQUdKWCxHQUhJLENBR0FXLE9BQU8sSUFBSUEsT0FBTyxDQUFFLENBQUYsQ0FIbEIsQ0FBUDtBQUlEOztBQUVNLFNBQVNDLE9BQVQsR0FBc0M7QUFDM0MsU0FBTyxJQUFJL0UsT0FBSixDQUFZLENBQUNDLE9BQUQsRUFBVUMsTUFBVixLQUFxQjtBQUN0Q1UsZ0JBQUdpRCxPQUFILENBQVdjLE9BQVgsRUFBb0IsQ0FBQ3BFLEdBQUQsRUFBTXVELEtBQU4sS0FBZ0I7QUFDbEMsVUFBSXZELEdBQUosRUFBUztBQUNQbUUsUUFBQUEsSUFBSSxHQUFHLEVBQVA7QUFDQSxlQUFPeEUsTUFBTSxDQUFDSyxHQUFELENBQWI7QUFDRDs7QUFDRG1FLE1BQUFBLElBQUksR0FBR0csV0FBVyxDQUFDZixLQUFELENBQWxCO0FBQ0E3RCxNQUFBQSxPQUFPLENBQUN5RSxJQUFELENBQVA7QUFDRCxLQVBEO0FBUUQsR0FUTSxDQUFQO0FBVUQ7O0FBRU0sU0FBU00sV0FBVCxHQUFpQztBQUN0QyxNQUFJLENBQUNOLElBQUQsSUFBU0EsSUFBSSxDQUFDMUMsTUFBTCxLQUFnQixDQUE3QixFQUFnQztBQUM5QjBDLElBQUFBLElBQUksR0FBR0csV0FBVyxDQUFDakUsWUFBR3FFLFdBQUgsQ0FBZU4sT0FBZixDQUFELENBQWxCO0FBQ0Q7O0FBQ0QsU0FBT0QsSUFBUDtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE9PTyBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgZGVjb2RlLCBlbmNvZGluZ0V4aXN0cyB9IGZyb20gJ2ljb252LWxpdGUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBzYXgsIHsgU0FYU3RyZWFtIH0gZnJvbSAnc2F4JztcbmltcG9ydCB7IFN0cmVhbSwgVHJhbnNmb3JtLCBUcmFuc2Zvcm1DYWxsYmFjayB9IGZyb20gJ3N0cmVhbSc7XG5cbnR5cGUgVGV4dEhhbmRsZXIgPSAodGhpczogU0FYU3RyZWFtLCB0ZXh0OiBzdHJpbmcpID0+IHZvaWQ7XG5cbmNsYXNzIFV0ZjhDb252ZXJ0ZXIgZXh0ZW5kcyBUcmFuc2Zvcm0ge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgZW5jb2Rpbmc6IHN0cmluZykge1xuICAgIHN1cGVyKCk7XG4gICAgaWYgKCFlbmNvZGluZ0V4aXN0cyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZW5jb2RpbmcgJHtlbmNvZGluZ30gaXMgbm90IHN1cHBvcnRlZGApO1xuICAgIH1cbiAgfVxuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuICBwdWJsaWMgX3RyYW5zZm9ybShjaHVuazogYW55LCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogVHJhbnNmb3JtQ2FsbGJhY2spOiB2b2lkIHtcbiAgICBjYWxsYmFjayh1bmRlZmluZWQsIGRlY29kZShjaHVuaywgdGhpcy5lbmNvZGluZykpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEVuY29kaW5nKG1pYnBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGVuY29kaW5nOiBzdHJpbmc7XG4gICAgY29uc3Qgc2F4U3RyZWFtID0gc2F4LmNyZWF0ZVN0cmVhbSh0cnVlLCB7fSk7XG4gICAgc2F4U3RyZWFtLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSk7XG4gICAgc2F4U3RyZWFtLm9uKCdwcm9jZXNzaW5naW5zdHJ1Y3Rpb24nLCAocGkpID0+IHtcbiAgICAgIGlmICghcGkuYm9keSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBtYXRjaCA9IC9lbmNvZGluZz1cIiguKilcIi9nLmV4ZWMocGkuYm9keSk7XG4gICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgWywgZW5jb2RpbmddID0gbWF0Y2g7XG4gICAgICB9XG4gICAgfSk7XG4gICAgc2F4U3RyZWFtLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKGVuY29kaW5nKSk7XG4gICAgZnMuY3JlYXRlUmVhZFN0cmVhbShtaWJwYXRoKS5waXBlKHNheFN0cmVhbSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWliMmpzb24obWlicGF0aDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHNheFN0cmVhbSA9IHNheC5jcmVhdGVTdHJlYW0oXG4gICAgICB0cnVlLFxuICAgICAge1xuICAgICAgICB4bWxuczogdHJ1ZSxcbiAgICAgICAgdHJpbTogdHJ1ZSxcbiAgICAgICAgbm9ybWFsaXplOiB0cnVlLFxuICAgICAgfSxcbiAgICApO1xuICAgIHNheFN0cmVhbS5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpO1xuICAgIGNvbnN0IHJvb3Q6IGFueSA9IHt9O1xuICAgIGxldCBsZXZlbCA9IDA7XG4gICAgbGV0IGN1cnJlbnQ6IGFueTtcbiAgICBjb25zdCB0eXBlczogYW55ID0ge307XG4gICAgbGV0IHN1YnJvdXRpbmVzOiBhbnk7XG4gICAgY29uc3QgdHJhaWw6IGFueVtdID0gW107XG4gICAgbGV0IHN0YXRlOiBzdHJpbmc7XG4gICAgc2F4U3RyZWFtLm9uKCdvcGVudGFnJywgKHRhZykgPT4ge1xuLy8gICAgICBsb2dnZXIuZWxlbWVudCh1dGlsLmluc3BlY3QodGFnLCB7ZGVwdGg6IG51bGx9KSk7XG4gICAgICBpZiAobGV2ZWwgPCA1IHx8IHN1YnJvdXRpbmVzKSB7XG4gICAgICAgIHN3aXRjaCAodGFnLmxvY2FsKSB7XG4gICAgICAgICAgY2FzZSAnZWxlbWVudCc6XG4gICAgICAgICAgICBpZiAobGV2ZWwgPT09IDEpIHtcbiAgICAgICAgICAgICAgcm9vdFt0YWcuYXR0cmlidXRlcy5uYW1lLnZhbHVlXSA9IHRhZy5hdHRyaWJ1dGVzLnR5cGUudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN1YnJvdXRpbmVzKSB7XG4gICAgICAgICAgICAgIGN1cnJlbnQgPSBzdWJyb3V0aW5lc1t0YWcuYXR0cmlidXRlcy5uYW1lLnZhbHVlXSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnc2ltcGxlVHlwZSc6XG4gICAgICAgICAgY2FzZSAnY29tcGxleFR5cGUnOlxuICAgICAgICAgICAgaWYgKGxldmVsID09PSAxKSB7XG4gICAgICAgICAgICAgIGN1cnJlbnQgPSB0eXBlc1t0YWcuYXR0cmlidXRlcy5uYW1lLnZhbHVlXSA9IHt9O1xuICAgICAgICAgICAgICB0cmFpbC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnc2VxdWVuY2UnOlxuICAgICAgICAgICAgaWYgKGxldmVsID09PSAyKSB7XG4gICAgICAgICAgICAgIHRyYWlsLnB1c2goY3VycmVudCk7XG4gICAgICAgICAgICAgIGN1cnJlbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgcm9vdC5zdWJyb3V0aW5lcyA9IHN1YnJvdXRpbmVzID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdhbm5vdGF0aW9uJzpcbiAgICAgICAgICAgIHN0YXRlID0gJ2Fubm90YXRpb24nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYXBwaW5mbyc6XG4gICAgICAgICAgICBjdXJyZW50LmFwcGluZm8gPSB7fTtcbiAgICAgICAgICAgIHN0YXRlID0gJ2FwcGluZm8nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAncmVzdHJpY3Rpb24nOlxuICAgICAgICAgICAgY3VycmVudC5iYXNlID0gdGFnLmF0dHJpYnV0ZXMuYmFzZS52YWx1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21pbkluY2x1c2l2ZSc6XG4gICAgICAgICAgY2FzZSAnbWF4SW5jbHVzaXZlJzpcbiAgICAgICAgICBjYXNlICdtaW5FeGNsdXNpdmUnOlxuICAgICAgICAgIGNhc2UgJ21heEV4Y2x1c2l2ZSc6XG4gICAgICAgICAgICBjdXJyZW50W3RhZy5sb2NhbF0gPSB0YWcuYXR0cmlidXRlcy52YWx1ZS52YWx1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2VudW1lcmF0aW9uJzpcbiAgICAgICAgICAgIGN1cnJlbnQuZW51bWVyYXRpb24gPSBjdXJyZW50LmVudW1lcmF0aW9uIHx8IHt9O1xuICAgICAgICAgICAgdHJhaWwucHVzaChjdXJyZW50KTtcbiAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50LmVudW1lcmF0aW9uW3RhZy5hdHRyaWJ1dGVzLnZhbHVlLnZhbHVlXSA9IHt9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYXR0cmlidXRlJzpcbiAgICAgICAgICAgIGN1cnJlbnQucHJvcGVydGllcyA9IGN1cnJlbnQucHJvcGVydGllcyB8fCB7fTtcbiAgICAgICAgICAgIHRyYWlsLnB1c2goY3VycmVudCk7XG4gICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wcm9wZXJ0aWVzW3RhZy5hdHRyaWJ1dGVzLm5hbWUudmFsdWVdID1cbiAgICAgICAgICAgICAgeyB0eXBlOiB0YWcuYXR0cmlidXRlcy50eXBlLnZhbHVlIH07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGV2ZWwgKz0gMTtcbiAgICB9KTtcblxuICAgIHNheFN0cmVhbS5vbignY2xvc2V0YWcnLCAodGFnTmFtZSkgPT4ge1xuICAgICAgbGV2ZWwgLT0gMTtcblxuICAgICAgaWYgKHRhZ05hbWUgPT09ICd4czpzZXF1ZW5jZScpIHtcbiAgICAgICAgc3Vicm91dGluZXMgPSBmYWxzZTtcbiAgICAgICAgY3VycmVudCA9IHRyYWlsLnBvcCgpO1xuICAgICAgfSBlbHNlIGlmIChjdXJyZW50KSB7XG4gICAgICAgIGlmICh0YWdOYW1lID09PSAneHM6YXR0cmlidXRlJyB8fCB0YWdOYW1lID09PSAneHM6ZW51bWVyYXRpb24nKSB7XG4gICAgICAgICAgY3VycmVudCA9IHRyYWlsLnBvcCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCB0ZXh0SGFuZGxlcjogVGV4dEhhbmRsZXIgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgaWYgKGN1cnJlbnQpIHtcbiAgICAgICAgaWYgKHN0YXRlID09PSAnYXBwaW5mbycpIHtcbiAgICAgICAgICBjb25zdCBsb2NhbCA9IHRoaXMuX3BhcnNlci50YWcubG9jYWw7XG4gICAgICAgICAgY29uc3QgYXBwaW5mbyA9IGN1cnJlbnQuYXBwaW5mbztcbiAgICAgICAgICBpZiAoYXBwaW5mb1tsb2NhbF0pIHtcbiAgICAgICAgICAgIGFwcGluZm9bbG9jYWxdICs9IGBcbiR7dGV4dH1gO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBpbmZvW2xvY2FsXSA9IHRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlID09PSAnYW5ub3RhdGlvbicgJiYgKGN1cnJlbnQuYW5ub3RhdGlvbiA9IHRleHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBzYXhTdHJlYW0ub24oJ3RleHQnLCB0ZXh0SGFuZGxlcik7XG5cbiAgICBzYXhTdHJlYW0ub24oJ2VuZCcsICgpID0+IHtcbiAgICAgIHJvb3QudHlwZXMgPSB0eXBlcztcbiAgICAgIHJlc29sdmUocm9vdCk7XG4gICAgfSk7XG5cbiAgICBnZXRFbmNvZGluZyhtaWJwYXRoKVxuICAgICAgLnRoZW4oKGVuY29kaW5nKSA9PiB7XG4gICAgICAgIGxldCBpbnB1dDogU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShtaWJwYXRoKTtcbiAgICAgICAgaWYgKGVuY29kaW5nICYmIGVuY29kaW5nRXhpc3RzKGVuY29kaW5nKSkge1xuICAgICAgICAgIGlucHV0ID0gaW5wdXQucGlwZShuZXcgVXRmOENvbnZlcnRlcihlbmNvZGluZykpO1xuICAgICAgICB9XG4gICAgICAgIGlucHV0LnBpcGUoc2F4U3RyZWFtKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2gocmVqZWN0KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb252ZXJ0KG1pYnBhdGg6IHN0cmluZywgZGlyPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGpzb24gPSBhd2FpdCBtaWIyanNvbihtaWJwYXRoKTtcbiAgbGV0IGpzb25wYXRoID0gYCR7bWlicGF0aC5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpfS5qc29uYDtcbiAgaWYgKGRpcikge1xuICAgIGpzb25wYXRoID0gcGF0aC5yZXNvbHZlKGRpciwgcGF0aC5iYXNlbmFtZShqc29ucGF0aCkpO1xuICB9XG4gIGNvbnN0IGRhdGEgPSBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAyKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmcy53cml0ZUZpbGUoanNvbnBhdGgsIGRhdGEsIChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5jb25zdCB4c2RNaWJSZSA9IC9eXFxTK1xcLm1pYlxcLnhzZCQvaTtcbmNvbnN0IGpzb25NaWJSZSA9IC9eKFxcUyspXFwubWliXFwuanNvbiQvaTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnREaXIoZGlyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBmcy5yZWFkZGlyKGRpciwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgfVxuICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IGZpbGVzXG4gICAgICAgIC5maWx0ZXIoZmlsZSA9PiB4c2RNaWJSZS50ZXN0KGZpbGUpKVxuICAgICAgICAubWFwKGZpbGUgPT4gY29udmVydChwYXRoLmpvaW4oZGlyLCBmaWxlKSlcbiAgICAgICAgICAudGhlbigoKSA9PiBjb25zb2xlLmluZm8oYCR7ZmlsZX06IHN1Y2Nlc3NgKSlcbiAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4gY29uc29sZS5lcnJvcihgJHtmaWxlfTogJHtlcnJvci5tZXNzYWdlfWApKSxcbiAgICAgICAgKTtcbiAgICAgIHJlc29sdmUoUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4gdm9pZCAwKSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5sZXQgbWliczogc3RyaW5nW10gPSBbXTtcbmNvbnN0IG1pYnNEaXIgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbWlicycpO1xuXG5mdW5jdGlvbiBmaWxlc1RvTWlicyhmaWxlczogc3RyaW5nW10pIHtcbiAgcmV0dXJuIGZpbGVzXG4gICAgLm1hcChmaWxlID0+IGpzb25NaWJSZS5leGVjKGZpbGUpKVxuICAgIC5maWx0ZXIobWF0Y2hlcyA9PiBtYXRjaGVzICE9IG51bGwpXG4gICAgLm1hcChtYXRjaGVzID0+IG1hdGNoZXMhWzFdKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1pYnMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGZzLnJlYWRkaXIobWlic0RpciwgKGVyciwgZmlsZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgbWlicyA9IFtdO1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgICBtaWJzID0gZmlsZXNUb01pYnMoZmlsZXMpO1xuICAgICAgcmVzb2x2ZShtaWJzKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNaWJzU3luYygpOiBzdHJpbmdbXSB7XG4gIGlmICghbWlicyB8fCBtaWJzLmxlbmd0aCA9PT0gMCkge1xuICAgIG1pYnMgPSBmaWxlc1RvTWlicyhmcy5yZWFkZGlyU3luYyhtaWJzRGlyKSk7XG4gIH1cbiAgcmV0dXJuIG1pYnM7XG59XG4iXX0=