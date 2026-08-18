export function createTodoActions({
  todoForm,
  todoDetail,
  todoListView,
  dashboardTodos = { value: [] },
  privateTodos,
  todoLinkOptions = { value: [] },
  workbenchV2,
  createTodo,
  getPrivateTodoClient,
  showToast = () => {},
  openCandidateDetail = () => {},
  openPositionDetail = () => {},
  openCompanyDetail = () => {},
}) {
  function resetTodoForm() {
    Object.assign(todoForm, {
      open: false,
      mode: 'create',
      error: '',
      editingId: '',
      saving: false,
      form: { title: '', subtitle: '', type: 'custom', date: '', linkType: 'none', linkId: '', linkLabel: '' },
    });
  }

  function openTodoForm(todo) {
    if (todo && todo.source === 'manual') {
      const raw = todo._raw || privateTodos.find(item => item.id === todo.id);
      if (!raw) return;
      todoForm.mode = 'edit';
      todoForm.editingId = raw.id;
      todoForm.form = {
        title: raw.title || '', subtitle: raw.subtitle || '', type: raw.type || 'custom',
        date: (raw.date || '').slice(0, 10), linkType: raw.linkType || 'none',
        linkId: raw.linkId || '', linkLabel: raw.linkLabel || '',
      };
    } else {
      todoForm.mode = 'create';
      todoForm.editingId = '';
      todoForm.form = {
        title: '', subtitle: '', type: 'custom', date: new Date().toISOString().slice(0, 10),
        linkType: 'none', linkId: '', linkLabel: '',
      };
      if (todo && todo.source === 'auto') {
        if (todo.linkType && todo.linkId) {
          todoForm.form.linkType = todo.linkType;
          todoForm.form.linkId = todo.linkId;
          todoForm.form.linkLabel = todo.linkLabel || '';
        }
        todoForm.form.title = todo.title || '';
        todoForm.form.subtitle = todo.subtitle || '';
        todoForm.form.type = todo.type || 'custom';
      }
    }
    todoForm.error = '';
    todoForm.open = true;
    todoDetail.open = false;
  }

  function onTodoLinkTypeChange() {
    todoForm.form.linkId = '';
    todoForm.form.linkLabel = '';
  }

  function onTodoLinkTargetChange() {
    const target = todoLinkOptions.value.find(item => item.id === todoForm.form.linkId);
    todoForm.form.linkLabel = target ? target.label : '';
  }

  async function saveTodo() {
    const form = todoForm.form;
    if (!form.title.trim()) { todoForm.error = '请填写待办标题'; return; }
    if (todoForm.saving) return;
    todoForm.saving = true;
    const editing = todoForm.mode === 'edit' && todoForm.editingId;
    const payload = {
      title: form.title.trim(), subtitle: form.subtitle.trim(), type: form.type, date: form.date,
      linkType: form.linkType, linkId: form.linkId, linkLabel: form.linkLabel,
    };
    try {
      const existing = editing ? privateTodos.find(item => item.id === todoForm.editingId) : null;
      const todo = existing
        ? { ...existing, ...payload, updatedAt: new Date().toISOString() }
        : (typeof createTodo === 'function' ? createTodo(payload) : workbenchV2.createTodo(payload));
      const saved = await getPrivateTodoClient().save(todo);
      const index = privateTodos.findIndex(item => item.id === saved.id);
      if (index >= 0) privateTodos.splice(index, 1, saved);
      else privateTodos.unshift(saved);
      resetTodoForm();
      showToast(editing ? '待办已更新' : '待办已新增');
    } catch (error) {
      todoForm.error = '待办保存失败，请重试';
      todoForm.saving = false;
    }
  }

  function openTodoListView() {
    todoListView.open = true;
    todoListView.filter = 'all';
  }

  function openTodoDetail(todo) {
    if (!todo) return;
    todoDetail.todo = todo;
    todoDetail.open = true;
  }

  async function toggleTodoDone(todo) {
    if (!todo || todo.source !== 'manual') return;
    const raw = todo._raw || privateTodos.find(item => item.id === todo.id);
    if (!raw) return;
    try {
      const saved = await getPrivateTodoClient().save({ ...raw, done: !raw.done, updatedAt: new Date().toISOString() });
      const index = privateTodos.findIndex(item => item.id === saved.id);
      if (index >= 0) privateTodos.splice(index, 1, saved);
      todoDetail.todo = dashboardTodos.value.find(item => item.id === saved.id) || null;
      showToast(saved.done ? '已标记完成' : '已恢复待办');
    } catch (error) {
      showToast('待办更新失败，请重试', 'error');
    }
  }

  async function deleteTodo(todo) {
    if (!todo || todo.source !== 'manual') return;
    const index = privateTodos.findIndex(item => item.id === todo.id);
    if (index < 0) return;
    try {
      await getPrivateTodoClient().remove(todo.id);
      privateTodos.splice(index, 1);
      todoDetail.open = false;
      showToast('待办已删除');
    } catch (error) {
      showToast('待办删除失败，请重试', 'error');
    }
  }

  function jumpToTodoLink(todo) {
    if (!todo || todo.linkType === 'none' || !todo.linkId) {
      showToast('该待办未关联跳转节点', 'error');
      return;
    }
    todoDetail.open = false;
    todoListView.open = false;
    if (todo.linkType === 'candidate') return openCandidateDetail(todo.linkId);
    if (todo.linkType === 'position') return openPositionDetail(todo.linkId);
    if (todo.linkType === 'company') return openCompanyDetail(todo.linkId);
    if (todo.linkType === 'application') {
      const application = workbenchV2.applications.find(item => item.id === todo.linkId);
      if (application?.candidateId) return openCandidateDetail(application.candidateId);
      showToast('关联推进记录已不存在', 'error');
    }
  }

  return {
    resetTodoForm, openTodoForm, onTodoLinkTypeChange, onTodoLinkTargetChange, saveTodo,
    openTodoListView, openTodoDetail, toggleTodoDone, deleteTodo, jumpToTodoLink,
  };
}

if (typeof window !== 'undefined') window.WorkBuddyTodoActions = { createTodoActions };
