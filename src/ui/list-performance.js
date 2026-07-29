(function initListPerformance(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyListPerformance = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createListPerformance() {
  const PAGE_SIZE = 50;

  function paginate(source, requestedPage = 1, pageSize = PAGE_SIZE) {
    const items = Array.isArray(source) ? source : [];
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    const page = Math.min(totalPages, Math.max(1, Number.parseInt(requestedPage, 10) || 1));
    const offset = (page - 1) * size;
    const pageItems = items.slice(offset, offset + size);

    return {
      items: pageItems,
      page,
      pageSize: size,
      total: items.length,
      totalPages,
      start: items.length ? offset + 1 : 0,
      end: items.length ? offset + pageItems.length : 0,
    };
  }

  function indexById(source) {
    const index = new Map();
    for (const item of Array.isArray(source) ? source : []) {
      if (item?.id) index.set(item.id, item);
    }
    return index;
  }

  function groupBy(source, keyOf) {
    const groups = new Map();
    for (const item of Array.isArray(source) ? source : []) {
      const key = keyOf(item);
      if (key === undefined || key === null || key === '') continue;
      const group = groups.get(key);
      if (group) group.push(item);
      else groups.set(key, [item]);
    }
    return groups;
  }

  return { PAGE_SIZE, paginate, indexById, groupBy };
});
