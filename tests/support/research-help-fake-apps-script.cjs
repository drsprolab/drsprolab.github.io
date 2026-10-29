'use strict';
// Research help 백엔드(Code.gs)를 Node에서 실행하기 위한 가짜 Apps Script 환경. 테스트 데이터 전용.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const CODE = fs.readFileSync(path.join(__dirname, '../../research-help-backend/Code.gs'), 'utf8');

function fakeSheet(name) {
  const data = [];
  const sheet = {
    name, data,
    getDataRange: () => ({ getDisplayValues: () => data.map(r => r.map(v => (typeof v === 'string' && v[0] === "'") ? v.slice(1) : String(v))) }),
    getRange: (row, col, nr, nc) => {
      const range = {
        setNumberFormat: () => range,
        setValues: vals => { vals.forEach((r, i) => { data[row - 1 + i] = r.slice(); }); return range; }
      };
      return range;
    },
    getLastRow: () => data.length,
    setFrozenRows: () => {}
  };
  return sheet;
}

function setup(opts) {
  opts = opts || {};
  const props = Object.assign({ GEMINI_API_KEY: 'test-gemini-key', ADMIN_PASSWORD: 'test-admin-pass' }, opts.props);
  const cache = new Map();
  const sheets = {};
  const calls = { ai: [], fetchAll: [] };
  const drive = { folder: null, files: {}, n: 0 };
  let clock = Date.parse('2026-10-29T03:00:00Z');
  const ai = opts.ai || {};
  const ctx = {
    console: { log() {}, error() {} },
    Utilities: {
      sleep: () => {},
      formatDate: (d, z, f) => f === 'yyMMdd' ? '261029' : f === 'yyyy-MM-dd' ? '2026-10-29' : new Date(clock).toISOString(),
      getUuid: () => crypto.randomUUID(),
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(String(s), 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      base64Decode: t => Array.from(Buffer.from(String(t), 'base64')),
      base64Encode: b => Buffer.from(b.map ? b.map(x => x & 255) : b).toString('base64'),
      newBlob: (bytes, type, name) => ({ bytes, type, name })
    },
    // 연구 모형 그림 저장용 가짜 드라이브
    DriveApp: {
      getFoldersByName: () => { const f = drive.folder; return { hasNext: () => !!f, next: () => f }; },
      createFolder: name => (drive.folder = { name, createFile: blob => {
        const id = 'file' + String(++drive.n).padStart(8, '0');
        const file = { id, blob, getId: () => id, getName: () => blob.name,
          getBlob: () => ({ getContentType: () => blob.type, getBytes: () => blob.bytes }) };
        drive.files[id] = file; return file;
      } }),
      getFileById: id => { if (!drive.files[id]) throw new Error('no file'); return drive.files[id]; }
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null),
      setProperty: (k, v) => { props[k] = String(v); },
      setProperties: o => Object.assign(props, o),
      deleteProperty: k => { delete props[k]; }
    }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k) || null, put: (k, v) => cache.set(k, v) }) },
    SpreadsheetApp: {
      create: () => fakeBook(), openById: () => fakeBook()
    },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } },
    UrlFetchApp: {
      // Gemini·OpenAI 호출을 흉내 낸다. 응답 스키마 모양으로 어떤 요청인지 구분한다.
      fetch: (url, o) => {
        const body = JSON.parse(o.payload);
        const provider = url.startsWith('https://generativelanguage.googleapis.com/') ? 'gemini' : url.startsWith('https://api.openai.com/') ? 'openai' : null;
        if (!provider) throw new Error('unexpected fetch ' + url);
        const gem = provider === 'gemini';
        const schema = gem ? body.response_format.schema : body.response_format.json_schema.schema;
        const system = gem ? body.system_instruction : body.messages[0].content;
        const raw = gem ? body.input : body.messages[1].content;
        const user = Array.isArray(raw) ? raw.find(p => p.type === 'text').text : raw;
        const name = schema.properties.queries ? 'search_plan' : schema.properties.title.properties.questions ? 'socratic_feedback' : 'literature_feedback';
        calls.ai.push({ provider, url, headers: o.headers, name, system, user, body });
        const handler = ai[name];
        if (!handler) throw new Error('unexpected AI call ' + name);
        const out = handler(body, provider);
        if (out && out.httpError) return res(out.httpError, '{"error":"x"}');
        const text = JSON.stringify(out);
        return res(200, JSON.stringify(gem
          ? { status: 'completed', steps: [{ type: 'thought', signature: 'x' }, { type: 'model_output', content: [{ type: 'text', text }] }] }
          : { choices: [{ finish_reason: 'stop', message: { content: text } }] }));
      },
      fetchAll: reqs => { calls.fetchAll.push(reqs.map(r => r.url)); return reqs.map(r => (opts.web || (() => res(404, '{}')))(r.url)); }
    }
  };
  function fakeBook() {
    return {
      getId: () => 'sheet-id', getUrl: () => 'https://docs.google.com/spreadsheets/d/sheet-id',
      getSheetByName: n => sheets[n] || null,
      insertSheet: n => (sheets[n] = fakeSheet(n))
    };
  }
  ctx.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } static now() { return clock; } };
  vm.createContext(ctx);
  vm.runInContext(CODE + '\n;this.__api = { handle_, sheet_ };', ctx);
  return {
    props, sheets, calls, drive, api: ctx.__api,
    call: body => JSON.parse(JSON.stringify(ctx.__api.handle_(body))),
    advance: ms => { clock += ms; },
    rows: n => (sheets[n] ? sheets[n].data.slice(1) : [])
  };
}

function res(code, text) { return { getResponseCode: () => code, getContentText: () => text }; }

module.exports = { setup, res };
