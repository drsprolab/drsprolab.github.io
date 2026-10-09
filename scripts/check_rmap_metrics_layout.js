/* Browser regression check: evaluate after page/fonts load at each viewport.
 * Returns evidence; throws if any metrics group wraps, clips, or breaks the page.
 * Horizontal scrolling inside the metrics strip is allowed on narrow screens.
 */
(() => {
  const strip = document.querySelector('.rmap-metrics');
  const groups = [...document.querySelectorAll('.rmap-metrics-group')];
  if (!strip || groups.length !== 4) throw new Error('Expected all four metric groups');
  const bounds = groups.map(group => group.getBoundingClientRect());
  if (bounds.some(rect => Math.abs(rect.top - bounds[0].top) > 1)) {
    throw new Error('Metric groups wrap onto multiple rows');
  }
  const cards = groups.map(group => group.querySelector('.rmap-stats, .rmap-orcid'));
  const cardBounds = cards.map(card => card.getBoundingClientRect());
  if (cardBounds.some(rect => Math.abs(rect.top - cardBounds[0].top) > 1)) {
    throw new Error('Metric cards are not vertically aligned');
  }
  for (const group of groups) {
    for (const element of group.querySelectorAll('.rmap-metrics-label, dt, dd, .rmap-orcid')) {
      if (element.scrollWidth > element.clientWidth + 1) {
        throw new Error('Clipped metric content: ' + element.textContent.trim());
      }
    }
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) {
    throw new Error('Metrics cause document-level horizontal overflow');
  }
  return {
    viewport: innerWidth,
    groups: bounds.map(rect => ({x: rect.x, y: rect.y, width: rect.width})),
    stripWidth: strip.clientWidth,
    stripScrollWidth: strip.scrollWidth,
    horizontalScroll: strip.scrollWidth > strip.clientWidth + 1,
    values: [...strip.querySelectorAll('dd')].map(element => element.textContent.trim())
  };
})()
