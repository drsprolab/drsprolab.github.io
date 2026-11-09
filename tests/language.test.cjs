const { test } = require('node:test');
const assert = require('node:assert/strict');
const { preferred, mount } = require('../assets/js/language.js');

function environment({ path = '/', query = '', hash = '', lang = 'ko', saved, country = 'US', failure = false, blockedStorage = false, languages = ['en-US'], zone = 'America/New_York', agent = 'Browser', fetcher } = {}) {
  const listeners = {}, calls = [], requests = [], values = new Map(saved ? [['proax-language-v1', saved]] : []);
  const session = new Map();
  const storage = map => ({ getItem(k) { if (blockedStorage) throw Error('blocked'); return map.get(k); }, setItem(k,v) { if (blockedStorage) throw Error('blocked'); map.set(k,v); } });
  const routes = { '/': '/en/', '/members/': '/en/members/' };
  const win = {
    document: { documentElement: { lang }, getElementById: () => ({ textContent: JSON.stringify(routes) }), addEventListener(type, fn) { (listeners[type] ||= []).push(fn); } },
    navigator: { languages, userAgent: agent },
    location: { pathname: path, search: query, hash, replace(v) { calls.push(v); } },
    localStorage: storage(values), sessionStorage: storage(session),
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: zone }) }) },
    AbortController,
    setTimeout: () => 1, clearTimeout() {},
    fetch(url, options) { requests.push({ url, options }); return fetcher ? fetcher() : failure ? Promise.reject(Error('unavailable')) : Promise.resolve({ ok: true, json: async () => ({ country }) }); }
  };
  return { win, listeners, calls, requests, values };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('country takes priority; browser language and time zone are fallbacks', () => {
  assert.equal(preferred('KR', ['en-US'], 'America/New_York'), 'ko');
  assert.equal(preferred('US', ['ko-KR'], 'Asia/Seoul'), 'en');
  assert.equal(preferred('', ['ko-KR'], 'Europe/London'), 'ko');
  assert.equal(preferred('', ['en-GB'], 'Asia/Seoul'), 'en');
  assert.equal(preferred('', ['ja-JP'], 'Asia/Seoul'), 'ko');
});
test('first visit uses country and preserves query and anchor', async () => {
  const e = environment({path:'/members/',query:'?from=profile',hash:'#professor'});
  mount(e.win); await settle();
  assert.deepEqual(e.calls, ['/en/members/?from=profile#professor']);
  assert.equal(e.requests[0].options.referrerPolicy, 'no-referrer');
  assert.equal(e.requests[0].options.credentials, 'omit');
});
test('manual preference wins and avoids another country request', () => {
  const e = environment({ saved: 'ko', country: 'US' }); mount(e.win);
  assert.equal(e.requests.length, 0); assert.deepEqual(e.calls, []);
  const f = environment({ saved:'en' }); mount(f.win);
  assert.deepEqual(f.calls, ['/en/']);
});
test('direct English links and crawlers keep their requested page', () => {
  for (const opts of [{ path:'/en/', lang:'en' }, { agent:'Googlebot' }]) {
    const e = environment(opts); mount(e.win); assert.equal(e.requests.length,0); assert.deepEqual(e.calls,[]);
  }
});
test('excluded assessments and Research Help do not redirect', () => {
  for (const path of ['/blog/', '/in-progress/', '/research-help/basics/']) {
    const e = environment({ path, saved:'en' }); mount(e.win); assert.deepEqual(e.calls,[]); assert.equal(e.requests.length,0);
  }
});
test('lookup failure and blocked storage do not prevent a usable page', async () => {
  const e = environment({ failure:true, blockedStorage:true, languages:['ko-KR'] });
  mount(e.win); await settle(); assert.deepEqual(e.calls,[]);
});
test('a slow country response cannot override a manual choice', async () => {
  let resolve;
  const e=environment({fetcher:()=>new Promise(r=>{resolve=r;})}); mount(e.win);
  const link={dataset:{languageChoice:'ko'},getAttribute:()=>'/'};
  e.listeners.click[0]({target:{closest:()=>link}});
  resolve({ok:true,json:async()=>({country:'US'})}); await settle();
  assert.equal(e.values.get('proax-language-v1'),'ko'); assert.deepEqual(e.calls,[]);
});
test('a late response cannot move someone who has started interacting', async () => {
  let resolve;
  const e=environment({fetcher:()=>new Promise(r=>{resolve=r;})}); mount(e.win);
  e.listeners.wheel[0](); resolve({ok:true,json:async()=>({country:'US'})}); await settle();
  assert.deepEqual(e.calls,[]);
});
test('manual counterpart links retain section and filters but remove a language override', () => {
  const e=environment({path:'/members/',query:'?lang=ko&filter=phd',hash:'#lab-members',saved:'ko'}); mount(e.win);
  const link={dataset:{languageChoice:'en'},getAttribute:()=>'/en/members/'};
  e.listeners.click[0]({target:{closest:()=>link}});
  assert.equal(link.href,'/en/members/?filter=phd#lab-members');
});
