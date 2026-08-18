/**
 * 自动待办对账器（Todo Reconciler）
 *
 * 职责：比较 deriveSystemTodos() 输出的"理论 Todo"与现有 System Todo，
 * 执行创建 / 更新 / 取消 / 完成 的对账，保证：
 * - 刷新、重复计算、重复保存、重新登录都不会生成重复 Todo（dedupeKey 幂等）；
 * - 业务规则条件消失后旧 Todo 自动 cancelled（不物理删除）；
 * - 已完成的 System Todo 不会被规则重新拉起。
 *
 * 本文件是纯函数模块：输入 todos + derived，输出新的 todos 数组与变更统计，
 * 不直接读写存储。
 */

const SOURCE_SYSTEM = 'system';
const SOURCE_MANUAL = 'manual';
const STATUS_PENDING = 'pending';
const STATUS_DONE = 'done';
const STATUS_CANCELLED = 'cancelled';

function nowIso(reference) {
  return new Date(reference || Date.now()).toISOString();
}

function makeId(prefix) {
  const stamp = typeof Date.now === 'function' ? Date.now().toString(36) : Math.random().toString(36).slice(2);
  return `${prefix || 'todo'}_${stamp}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 兼容旧数据：无 source → manual；无 status → 由 done 推导 */
export function normalizeTodo(todo) {
  const source = String(todo.source || '').trim() || SOURCE_MANUAL;
  const status = String(todo.status || '').trim() || (todo.done ? STATUS_DONE : STATUS_PENDING);
  return { ...todo, source, status };
}

export function isSystemTodo(todo) {
  return normalizeTodo(todo).source === SOURCE_SYSTEM;
}

/** 可更新的展示字段（不覆盖 ruleKey / entityId / dedupeKey 等规则身份字段） */
function updatableFields(todo) {
  return {
    title: String(todo.title || ''),
    subtitle: String(todo.subtitle || ''),
    type: String(todo.type || 'custom'),
    dueAt: String(todo.dueAt || ''),
    owner: String(todo.owner || ''),
    linkType: String(todo.linkType || 'none'),
    linkId: String(todo.linkId || ''),
    linkLabel: String(todo.linkLabel || ''),
    entityType: String(todo.entityType || ''),
    entityId: String(todo.entityId || ''),
    candidateId: String(todo.candidateId || ''),
    companyId: String(todo.companyId || ''),
    positionId: String(todo.positionId || ''),
    applicationId: String(todo.applicationId || ''),
  };
}

function hasChanges(existing, expected) {
  const current = updatableFields(existing);
  const target = updatableFields(expected);
  return Object.keys(target).some(key => String(current[key] || '') !== String(target[key] || ''));
}

/**
 * 对账 System Todo。
 *
 * @param {Object} input
 * @param {Array}  input.todos    当前全部 Todo（Manual + System）
 * @param {Array}  input.derived  规则引擎输出的理论 System Todo
 * @param {string|number} input.now
 * @param {Function} input.makeId 可选 id 生成器（前缀）
 * @returns {{ todos: Array, changes: {created:number, updated:number, cancelled:number, kept:number} }}
 */
export function reconcileSystemTodos(input = {}) {
  const todos = Array.isArray(input.todos) ? input.todos : [];
  const derived = Array.isArray(input.derived) ? input.derived : [];
  const reference = input.now || Date.now();
  const make = typeof input.makeId === 'function' ? input.makeId : makeId;

  const normalized = todos.map(normalizeTodo);
  const systemByDedupe = new Map();
  normalized.forEach(todo => {
    if (todo.source === SOURCE_SYSTEM && todo.dedupeKey) {
      if (!systemByDedupe.has(todo.dedupeKey)) systemByDedupe.set(todo.dedupeKey, todo);
    }
  });

  const expectedKeys = new Set();
  const changes = { created: 0, updated: 0, cancelled: 0, kept: 0 };
  const output = [];

  // 1) 对每个理论 Todo 执行 创建 / 更新 / 保持
  derived.forEach(expected => {
    if (!expected || !expected.dedupeKey) return;
    expectedKeys.add(expected.dedupeKey);
    const existing = systemByDedupe.get(expected.dedupeKey);
    if (!existing) {
      const createdAt = nowIso(reference);
      output.push({
        ...expected,
        id: make('todo'),
        source: SOURCE_SYSTEM,
        status: STATUS_PENDING,
        done: false,
        date: expected.dueAt || '',
        linkLabel: expected.linkLabel || '',
        createdAt,
        updatedAt: createdAt,
        completedAt: null,
      });
      changes.created += 1;
      return;
    }
    if (existing.status === STATUS_PENDING) {
      if (hasChanges(existing, expected)) {
        output.push({
          ...existing,
          ...expected,
          source: SOURCE_SYSTEM,
          status: STATUS_PENDING,
          done: false,
          date: expected.dueAt || '',
          updatedAt: nowIso(reference),
        });
        changes.updated += 1;
      } else {
        output.push(existing);
        changes.kept += 1;
      }
    } else {
      // 已 done / cancelled：保持用户决定，不重新拉起、不覆盖字段
      output.push(existing);
      changes.kept += 1;
    }
  });

  // 2) 对现有 System Todo：规则条件已消失 → cancelled（保留历史，不物理删除）
  normalized.forEach(todo => {
    if (todo.source !== SOURCE_SYSTEM) {
      output.push(todo);
      return;
    }
    if (!todo.dedupeKey || expectedKeys.has(todo.dedupeKey)) return; // 已在步骤 1 处理
    if (todo.status === STATUS_PENDING) {
      output.push({
        ...todo,
        status: STATUS_CANCELLED,
        done: false,
        updatedAt: nowIso(reference),
      });
      changes.cancelled += 1;
    } else {
      output.push(todo);
      changes.kept += 1;
    }
  });

  return { todos: output, changes };
}

if (typeof window !== 'undefined') {
  window.WorkBuddyTodoReconciler = {
    normalizeTodo,
    isSystemTodo,
    reconcileSystemTodos,
  };
}
