export function createColumnActions({
  columns,
  newColName,
  showToast = () => {},
  confirmAction = () => true,
}) {
  function addColumn() {
    const name = newColName.value.trim();
    if (!name) { showToast('请输入承接方名称', 'error'); return; }
    if (columns.some(column => column.name === name)) {
      showToast('该名称已存在', 'error'); return;
    }
    const publicIndex = columns.findIndex(column => column.name === '公共');
    const insertIndex = publicIndex >= 0 ? publicIndex : columns.length;
    columns.splice(insertIndex, 0, { name, jobs: [], editing: false, tempName: '' });
    newColName.value = '';
    showToast(`已添加承接方「${name}」`);
  }

  function deleteColumn(index) {
    if (columns.length <= 1) { showToast('至少保留一个承接方', 'error'); return; }
    const column = columns[index];
    if (!column) return;
    if (column.name === '公共') { showToast('公共承接方不能删除', 'error'); return; }
    if (column.jobs.length > 0 && !confirmAction(`「${column.name}」下有 ${column.jobs.length} 个公司组，确定删除？`)) return;
    columns.splice(index, 1);
    showToast(`已移除「${column.name}」`);
  }

  return { addColumn, deleteColumn };
}

if (typeof window !== 'undefined') window.WorkBuddyColumnActions = { createColumnActions };
