/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-multi-assign,@typescript-eslint/no-explicit-any,no-underscore-dangle */
import fs from 'fs';
import { decode, encodingExists } from 'iconv-lite';
import * as path from 'path';
import sax, { SAXStream } from 'sax';
import { Stream, Transform, TransformCallback } from 'stream';

type TextHandler = (this: SAXStream, text: string) => void;

class Utf8Converter extends Transform {
  constructor(public encoding: string) {
    super();
    if (!encodingExists(encoding)) {
      throw new Error(`encoding ${encoding} is not supported`);
    }
  }

  // eslint-disable-next-line no-underscore-dangle
  public _transform(chunk: any, _encoding: string, callback: TransformCallback): void {
    callback(undefined, decode(chunk, this.encoding));
  }
}

function getEncoding(mibpath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let encoding: string;
    const saxStream = sax.createStream(true, {});
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
    fs.createReadStream(mibpath).pipe(saxStream);
  });
}

export function mib2json(mibpath: string): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const saxStream = sax.createStream(true, {
      xmlns: true,
      trim: true,
      normalize: true,
    });
    saxStream.on('error', err => reject(err));
    const root: any = {};
    let level = 0;
    let current: any;
    const types: any = {};
    let subroutines: any;
    const trail: any[] = [];
    let state: string;
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
      } else if (current) {
        if (tagName === 'xs:attribute' || tagName === 'xs:enumeration') {
          current = trail.pop();
        }
      }
    });

    const textHandler: TextHandler = function textHandler(text) {
      if (current) {
        if (state === 'appinfo') {
          const { local } = this._parser.tag;
          const { appinfo } = current;
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

    getEncoding(mibpath)
      .then(encoding => {
        let input: Stream = fs.createReadStream(mibpath);
        if (encoding && encodingExists(encoding)) {
          input = input.pipe(new Utf8Converter(encoding));
        }
        input.pipe(saxStream);
      })
      .catch(reject);
  });
}

export async function convert(mibpath: string, dir?: string): Promise<string> {
  const json = await mib2json(mibpath);
  let jsonpath = `${mibpath.replace(/\.[^/.]+$/, '')}.json`;
  if (dir) {
    jsonpath = path.resolve(dir, path.basename(jsonpath));
  }
  const data = JSON.stringify(json, null, 2);
  return new Promise<string>((resolve, reject) => {
    fs.writeFile(jsonpath, data, err => {
      if (err) {
        reject(err);
      } else {
        resolve(jsonpath);
      }
    });
  });
}

const xsdMibRe = /^\S+\.mib\.xsd$/i;
const jsonMibRe = /^(\S+)\.mib\.json$/i;

export const convertDir = (dir: string): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        return reject(err);
      }
      const promises: Promise<void>[] = files
        .filter(file => xsdMibRe.test(file))
        .map(file =>
          convert(path.join(dir, file))
            .then(() => console.info(`${file}: success`))
            .catch(error => console.error(`${file}: ${error.message}`)),
        );
      return resolve(Promise.all(promises).then(() => {}));
    });
  });
