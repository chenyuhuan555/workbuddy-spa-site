function createWorkbenchSearchActions({ state, searchResults, query, applyFilters, resetFilters }) {
  function valueOf(input) { return input && typeof input === 'object' && 'value' in input ? input.value : input; }
  function buildGlobalSearchResults(input) {
    const normalized = String(input || '').trim().toLowerCase();
    if (!normalized) return [];
    const matches = value => String(value || '').toLowerCase().includes(normalized);
    const results = [...(valueOf(searchResults) || [])];
    (state.companies || []).forEach(company => {
      if (!company || ![company.name, company.industry, company.city, company.owner].some(matches)) return;
      results.push({ type: 'company', title: company.name || '未命名公司', subtitle: `${company.industry || '行业待补充'} · ${company.owner || '未分配负责人'}`, snippet: company.city || '', company });
    });
    (state.positions || []).forEach(position => {
      const company = (state.companies || []).find(item => item.id === position.companyId);
      if (!position || ![position.title, position.detail, position.city, position.salary, company?.name].some(matches)) return;
      results.push({ type: 'position-v2', title: position.title || '未命名岗位', subtitle: `${company?.name || '未关联公司'} · ${position.city || '地点待补充'}`, snippet: position.detail || '', position, company });
    });
    (state.candidates || []).forEach(candidate => {
      if (!candidate || ![candidate.name, candidate.currentCompany, candidate.currentTitle, candidate.profileText, ...(candidate.directions || []), ...(candidate.skills || [])].some(matches)) return;
      results.push({ type: 'candidate', title: candidate.name || '未命名人才', subtitle: `${candidate.currentCompany || '公司待补充'} · ${candidate.currentTitle || '职位待补充'}`, snippet: candidate.profileText || '', candidate });
    });
    return results.slice(0, 80);
  }
  async function runGlobalSearch({ nextTick = fn => fn(), showToast }) {
    const text = String(valueOf(query) || '').trim();
    if (typeof applyFilters === 'function') applyFilters();
    await nextTick(() => showToast(text ? `搜索完成，共 ${buildGlobalSearchResults(text).length} 条结果` : '请输入搜索内容', text ? 'success' : 'error'));
  }
  function resetGlobalSearch() {
    if (query && typeof query === 'object' && 'value' in query) query.value = '';
    if (typeof resetFilters === 'function') resetFilters();
  }
  return { buildGlobalSearchResults, runGlobalSearch, resetGlobalSearch };
}

if (typeof window !== 'undefined') window.WorkBuddySearchActions = { createWorkbenchSearchActions };

export { createWorkbenchSearchActions };
