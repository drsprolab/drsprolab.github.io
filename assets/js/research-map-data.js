// The build and the browser share one versioned research-map snapshot.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResearchMapData = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function hydrate(snapshot, expectedVersion) {
    if (expectedVersion && snapshot.version !== expectedVersion) throw new Error('Research Map version mismatch');
    var fields = snapshot.fields.map(function (f) { return Object.assign({}, f); });
    var papers = snapshot.papers.map(function (p) { return Object.assign({}, p); });
    var keywords = snapshot.keywords.map(function (kw) { return Object.assign({}, kw); });
    var links = snapshot.links.map(function (l) { return Object.assign({}, l); });
    var byId = Object.create(null);
    keywords.concat(papers).forEach(function (n) { byId[n.id] = n; });
    papers.forEach(function (p) {
      p.kws = p.kws.map(function (id) { return byId[id]; });
      p.fis = new Set(p.kws.map(function (kw) { return kw.fi; }));
    });
    keywords.forEach(function (kw) {
      kw.papers = kw.papers.map(function (id) { return byId[id]; });
      kw.fis = new Set([kw.fi]);
    });
    return { fields: fields, papers: papers, keywords: keywords, links: links };
  }
  return { hydrate: hydrate };
});
