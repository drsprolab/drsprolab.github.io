var HIT_PREFIX = 'rmap_hits_';
var HOUR_MS = 60 * 60 * 1000;
var DAY_MS = 24 * HOUR_MS;

function doGet(e) {
  var parameters = (e && e.parameter) || {};
  var callback = String(parameters.callback || '');
  if (!/^[$A-Z_a-z][$\w]*$/.test(callback)) {
    return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
  }

  var action = String(parameters.action || 'stats') === 'hit' ? 'hit' : 'stats';
  var lock = LockService.getScriptLock();
  var result;

  try {
    lock.waitLock(10000);
    result = updateCounts_(action === 'hit');
  } catch (err) {
    result = { error: true };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function updateCounts_(addHit) {
  var props = PropertiesService.getScriptProperties();
  var now = Date.now();
  var cutoff = now - DAY_MS;
  var all = props.getProperties();
  var todayCount = 0;
  var hourKey = HIT_PREFIX + Math.floor(now / HOUR_MS);
  var currentHour = [];

  Object.keys(all).forEach(function (key) {
    if (!/^rmap_hits_\d+$/.test(key)) return;
    var values;
    try { values = JSON.parse(all[key]); } catch (_) { values = []; }
    if (!Array.isArray(values)) values = [];
    var kept = values.filter(function (timestamp) { return Number(timestamp) > cutoff; });
    if (kept.length) {
      props.setProperty(key, JSON.stringify(kept));
      todayCount += kept.length;
      if (key === hourKey) currentHour = kept;
    } else {
      props.deleteProperty(key);
    }
  });

  var total = Number(all[HIT_PREFIX + 'total'] || 0);
  if (addHit) {
    currentHour.push(now);
    props.setProperty(hourKey, JSON.stringify(currentHour));
    total += 1;
    props.setProperty(HIT_PREFIX + 'total', String(total));
    todayCount += 1;
  }

  return { today: todayCount, total: total };
}
