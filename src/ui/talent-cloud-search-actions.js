export function createTalentCloudSearchActions({
  state,
  isReady = () => true,
  search,
  errorMessage = error => error?.message || '搜索失败',
}) {
  async function loadPage(page = 1) {
    const query = String(state.query || '').trim();
    const requestId = state.requestId + 1;
    state.requestId = requestId;
    state.error = '';
    state.fallback = false;
    state.page = Math.max(1, Number(page) || 1);
    if (!query) {
      state.items = [];
      state.total = 0;
      state.hasMore = false;
      state.running = false;
      return;
    }
    state.running = true;
    try {
      if (!isReady()) {
        const error = new Error('AUTH_REQUIRED');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }
      const offset = (state.page - 1) * state.pageSize;
      const result = await search({ query, limit: state.pageSize, offset });
      if (requestId !== state.requestId) return;
      state.items = result.rows || [];
      state.total = Number.isFinite(Number(result.total)) ? Number(result.total) : offset + state.items.length;
      state.hasMore = state.items.length === state.pageSize;
    } catch (error) {
      if (requestId !== state.requestId) return;
      state.error = errorMessage(error);
      state.fallback = true;
      state.hasMore = false;
    } finally {
      if (requestId === state.requestId) state.running = false;
    }
  }

  return {
    loadPage,
    run: () => loadPage(1),
    changePage: page => loadPage(page),
  };
}

if (typeof window !== 'undefined') window.WorkBuddyTalentCloudSearchActions = { createTalentCloudSearchActions };
