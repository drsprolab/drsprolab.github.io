// Prefer a conference in progress, then the next one, using Korea's calendar date.
(function () {
  function chooseConference(events, today) {
    var dated = events.filter(function (event) {
      return event.url && /^\d{4}-\d{2}-\d{2}$/.test(event.starts_on || '') && /^\d{4}-\d{2}-\d{2}$/.test(event.ends_on || '') && event.ends_on >= event.starts_on;
    });
    var upcoming = dated.filter(function (event) { return event.ends_on >= today; });
    upcoming.sort(function (a, b) { return a.starts_on.localeCompare(b.starts_on) || a.ends_on.localeCompare(b.ends_on); });
    if (upcoming.length) return upcoming[0];
    dated.sort(function (a, b) { return b.ends_on.localeCompare(a.ends_on) || b.starts_on.localeCompare(a.starts_on); });
    return dated[0] || events[0] || null;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = chooseConference; return; }
  var schedule = document.getElementById('conference-schedule');
  if (!schedule) return;
  var events;
  try { events = JSON.parse(schedule.textContent); } catch (error) { return; }
  if (!Array.isArray(events)) return;
  var parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  function part(type) { return parts.find(function (p) { return p.type === type; }).value; }
  var selected = chooseConference(events, part('year') + '-' + part('month') + '-' + part('day'));
  if (!selected) return;
  document.querySelectorAll('a[data-conference-entry]').forEach(function (link) { link.href = selected.url; });
  if (document.body.hasAttribute('data-conference-redirect')) {
    window.location.replace(selected.url + window.location.search + window.location.hash);
  }
})();
