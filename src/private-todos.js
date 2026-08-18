(function (root) {
  'use strict';

  function appError(code, cause) {
    const error = new Error(code);
    error.code = code;
    error.cause = cause;
    return error;
  }

  function requireProfile(getProfile) {
    const profile = getProfile();
    if (!profile?.id) throw appError('AUTH_REQUIRED');
    return profile;
  }

  function fromRow(row = {}) {
    const data = row.data && typeof row.data === 'object' ? row.data : {};
    return {
      id: String(row.id || ''),
      title: String(data.title || ''),
      subtitle: String(data.subtitle || ''),
      type: String(data.type || 'custom'),
      date: String(data.date || ''),
      done: Boolean(data.done),
      linkType: String(data.linkType || 'none'),
      linkId: String(data.linkId || ''),
      linkLabel: String(data.linkLabel || ''),
      // 自动待办扩展字段：缺失时按旧数据兼容（source=manual / status=done 推导）
      source: String(data.source || 'manual'),
      status: String(data.status || (data.done ? 'done' : 'pending')),
      ruleKey: String(data.ruleKey || ''),
      entityType: String(data.entityType || ''),
      entityId: String(data.entityId || ''),
      candidateId: String(data.candidateId || ''),
      companyId: String(data.companyId || ''),
      positionId: String(data.positionId || ''),
      applicationId: String(data.applicationId || ''),
      owner: String(data.owner || ''),
      dueAt: String(data.dueAt || ''),
      dedupeKey: String(data.dedupeKey || ''),
      completedAt: String(data.completedAt || ''),
      createdAt: String(row.created_at || ''),
      updatedAt: String(row.updated_at || ''),
    };
  }

  function todoData(todo = {}) {
    return {
      title: String(todo.title || ''),
      subtitle: String(todo.subtitle || ''),
      type: String(todo.type || 'custom'),
      date: String(todo.date || ''),
      done: Boolean(todo.done),
      linkType: String(todo.linkType || 'none'),
      linkId: String(todo.linkId || ''),
      linkLabel: String(todo.linkLabel || ''),
      source: String(todo.source || 'manual'),
      status: String(todo.status || (todo.done ? 'done' : 'pending')),
      ruleKey: String(todo.ruleKey || ''),
      entityType: String(todo.entityType || ''),
      entityId: String(todo.entityId || ''),
      candidateId: String(todo.candidateId || ''),
      companyId: String(todo.companyId || ''),
      positionId: String(todo.positionId || ''),
      applicationId: String(todo.applicationId || ''),
      owner: String(todo.owner || ''),
      dueAt: String(todo.dueAt || ''),
      dedupeKey: String(todo.dedupeKey || ''),
      completedAt: String(todo.completedAt || ''),
    };
  }

  function todoRow(todo, profile) {
    const id = String(todo?.id || '');
    if (!id) throw appError('PRIVATE_TODO_INVALID');
    return {
      id,
      user_id: profile.id,
      workspace_id: 'main',
      data: todoData(todo),
    };
  }

  function createClient({ supabase, getProfile }) {
    async function load() {
      const profile = requireProfile(getProfile);
      const { data, error } = await supabase.from('user_todos')
        .select('id, data, created_at, updated_at')
        .eq('workspace_id', 'main')
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false });
      if (error) throw appError('PRIVATE_TODOS_REQUEST_FAILED', error);
      return (Array.isArray(data) ? data : []).map(fromRow);
    }

    async function save(todo) {
      const profile = requireProfile(getProfile);
      const { data, error } = await supabase.from('user_todos')
        .upsert(todoRow(todo, profile), { onConflict: 'id' })
        .select('id, data, created_at, updated_at')
        .single();
      if (error) throw appError('PRIVATE_TODOS_REQUEST_FAILED', error);
      return fromRow(data);
    }

    async function saveMany(todos) {
      const profile = requireProfile(getProfile);
      const rows = (Array.isArray(todos) ? todos : []).map(todo => todoRow(todo, profile));
      if (!rows.length) return [];
      const { data, error } = await supabase.from('user_todos')
        .upsert(rows, { onConflict: 'id' })
        .select('id, data, created_at, updated_at');
      if (error) throw appError('PRIVATE_TODOS_REQUEST_FAILED', error);
      return (Array.isArray(data) ? data : []).map(fromRow);
    }

    async function remove(id) {
      const profile = requireProfile(getProfile);
      const todoId = String(id || '');
      if (!todoId) throw appError('PRIVATE_TODO_INVALID');
      const { error } = await supabase.from('user_todos').delete()
        .eq('id', todoId)
        .eq('user_id', profile.id);
      if (error) throw appError('PRIVATE_TODOS_REQUEST_FAILED', error);
    }

    return Object.freeze({ load, save, saveMany, remove });
  }

  async function migrateLegacyTodos({ todos, profile, client, removeLegacy }) {
    const legacyTodos = Array.isArray(todos) ? todos.filter(todo => todo?.id) : [];
    if (profile?.role !== 'admin' || !legacyTodos.length) {
      return { todos: await client.load(), migrated: 0 };
    }

    await client.saveMany(legacyTodos);
    const privateTodos = await client.load();
    const privateIds = new Set(privateTodos.map(todo => todo.id));
    if (!legacyTodos.every(todo => privateIds.has(String(todo.id)))) {
      throw appError('LEGACY_TODO_MIGRATION_INCOMPLETE');
    }
    await removeLegacy();
    return { todos: privateTodos, migrated: legacyTodos.length };
  }

  root.WorkBuddyPrivateTodos = Object.freeze({ createClient, migrateLegacyTodos });
})(window);
