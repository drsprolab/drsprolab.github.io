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
  const props = Object.assign({ OPENAI_API_KEY: 'sk-test', ADMIN_PASSWORD: 'test-admin-pass' }, opts.props);
  const cache = new Map();
  const sheets = {};
  const calls = { openai: [], fetchAll: [] };
  let clock = Date.parse('2026-10-29T03:00:00Z');
  const ai = opts.ai || {};
  const ctx = {
    console: { log() {}, error() {} },
    Utilities: {
      formatDate: (d, z, f) => f === 'yyMMdd' ? '261029' : f === 'yyyy-MM-dd' ? '2026-10-29' : new Date(clock).toISOString(),
      getUuid: () => crypto.randomUUID(),
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(String(s), 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
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
      fetch: (url, o) => {
        const body = JSON.parse(o.payload);
        calls.openai.push(body);
        const name = body.response_format.json_schema.name;
        const handler = ai[name];
        if (!handler) throw new Error('unexpected AI call ' + name);
        const out = handler(body);
        if (out && out.httpError) return res(out.httpError, '{"error":"x"}');
        return res(200, JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(out) } }] }));
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
    props, sheets, calls, api: ctx.__api,
    call: body => JSON.parse(JSON.stringify(ctx.__api.handle_(body))),
    advance: ms => { clock += ms; },
    rows: n => (sheets[n] ? sheets[n].data.slice(1) : [])
  };
}

function res(code, text) { return { getResponseCode: () => code, getContentText: () => text }; }

module.exports = { setup, res };
