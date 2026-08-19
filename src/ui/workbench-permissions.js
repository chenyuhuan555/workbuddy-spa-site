/**
 * 管理员 / 顾问权限模块（纯函数，可单测）
 *
 * 职责：把 profile + members 组装成权限上下文，提供 Candidate / Application /
 * Position / Company / Todo 的查看与编辑判定，以及 owner / ownerUserId 解析。
 *
 * 设计约定：
 * - 角色映射复用现有真实 role：admin → 管理员；editor / member → 顾问
 *   （editor 保留既有可写能力，member 保留只读，不因本轮降级）；
 * - owner 是展示用姓名（中文文本），ownerUserId 是稳定账号 id（auth uid）。
 *   权限判定优先 ownerUserId，缺失时按 members 的 name↔id 映射 best-effort 兼容旧数据；
 * - 公司 / 岗位为团队共享可见；候选人 / 推进 / 待办按属主私有。
 */

const ROLE_ADMIN = 'admin';
const ROLE_EDITOR = 'editor';

function text(value) {
  return String(value ?? '').trim();
}

/** 角色映射：admin → admin；editor / member → consultant；其他视为 consultant */
export function mapRoleToLevel(profile = {}) {
  return text(profile.role) === ROLE_ADMIN ? 'admin' : 'consultant';
}

export function isAdminProfile(profile = {}) {
  return mapRoleToLevel(profile) === 'admin';
}

/** 是否具备写权限（保持现有语义：admin / editor 可写，member 只读） */
export function canWriteProfile(profile = {}) {
  const role = text(profile.role);
  return role === ROLE_ADMIN || role === ROLE_EDITOR;
}

/** 构建 name ↔ id 映射（旧数据 owner 为姓名时用） */
export function buildMemberNameMap(members = []) {
  const map = new Map();
  (Array.isArray(members) ? members : []).forEach(member => {
    const name = text(member.display_name || member.username);
    const id = text(member.id);
    if (name && id && !map.has(name)) map.set(name, id);
  });
  return map;
}

/**
 * 解析实体的稳定账号 id：
 * 优先 entity.ownerUserId（或 owner_id）；缺失时用 entity.owner（姓名）在 members 中映射。
 */
export function resolveOwnerUserId(entity, members = []) {
  if (!entity) return '';
  const direct = text(entity.ownerUserId || entity.owner_id);
  if (direct) return direct;
  const name = text(entity.owner);
  if (!name) return '';
  return buildMemberNameMap(members).get(name) || '';
}

/**
 * Application 有效属主 id：application.ownerUserId → application.owner 映射
 * → candidate.ownerUserId → candidate.owner 映射 → ''
 */
export function effectiveOwnerUserId(application, candidate, members = []) {
  const appUid = resolveOwnerUserId(application, members);
  if (appUid) return appUid;
  return resolveOwnerUserId(candidate, members);
}

export function effectiveOwnerName(application, candidate) {
  return text((application && application.owner) || (candidate && candidate.owner));
}

/**
 * 组装权限上下文。
 * @param {Object} input
 * @param {Object} input.profile   当前登录 profile（id / display_name / username / role）
 * @param {Array}  input.members   团队成员列表（id / display_name / username / role）
 */
export function createPermissionContext(input = {}) {
  const profile = input.profile || {};
  const members = Array.isArray(input.members) ? input.members : [];
  const role = text(profile.role);
  const level = mapRoleToLevel(profile);
  const isAdmin = level === 'admin';
  const canWrite = canWriteProfile(profile);
  const currentUserId = text(profile.id);
  const currentUserName = text(profile.display_name || profile.username);
  const memberNameMap = buildMemberNameMap(members);

  const isCurrentOwner = entity => {
    const uid = resolveOwnerUserId(entity, members);
    if (uid) return uid === currentUserId;
    const name = text(entity && entity.owner);
    return Boolean(name) && (name === currentUserName || memberNameMap.get(name) === currentUserId);
  };
  const canViewApplication = (application, candidate) => {
    if (isAdmin) return true;
    const uid = effectiveOwnerUserId(application, candidate, members);
    if (uid) return uid === currentUserId;
    const name = effectiveOwnerName(application, candidate);
    return Boolean(name) && (name === currentUserName || memberNameMap.get(name) === currentUserId);
  };

  return Object.freeze({
    profile,
    role,
    level,
    isAdmin,
    isConsultant: !isAdmin,
    canWrite,
    currentUserId,
    currentUserName,
    members,
    memberNameMap,
    resolveOwnerUserId: entity => resolveOwnerUserId(entity, members),
    effectiveOwnerUserId: (application, candidate) => effectiveOwnerUserId(application, candidate, members),
    effectiveOwnerName,

    /* ── Candidate：管理员全部；顾问仅自己的 ── */
    canViewCandidate(candidate) {
      return isAdmin || isCurrentOwner(candidate);
    },
    canEditCandidate(candidate) {
      return isAdmin || (canWrite && isCurrentOwner(candidate));
    },

    /* ── Application：管理员全部；顾问按 effectiveOwner（application.owner 优先，fallback candidate.owner）── */
    canViewApplication,
    canEditApplication(application, candidate) {
      return isAdmin || (canWrite && canViewApplication(application, candidate));
    },

    /* ── Position / Company：团队共享可见；修改按属主 / 管理员 ── */
    canViewPosition() {
      return true;
    },
    canEditPosition(position) {
      return isAdmin || (canWrite && isCurrentOwner(position));
    },
    canViewCompany() {
      return true;
    },
    canEditCompany() {
      return isAdmin;
    },

    /* ── Todo：管理员可读全部（只读他人）；顾问仅自己的 ── */
    canViewTodo(todo) {
      if (isAdmin) return true;
      return isCurrentOwner(todo);
    },
    canEditTodo(todo) {
      // 管理员默认只读他人 Todo，不替他人完成任务
      return isCurrentOwner(todo) && canWrite;
    },

    /* ── 负责人管理：仅管理员可改 owner ── */
    canManageOwners: isAdmin,

    /* ── 顾问可见负责人列表：管理员全部；顾问固定自己 ── */
    visibleOwnerNames() {
      if (isAdmin) return members.map(member => text(member.display_name || member.username)).filter(Boolean);
      return currentUserName ? [currentUserName] : [];
    },
  });
}

if (typeof window !== 'undefined') {
  window.WorkBuddyPermissions = {
    mapRoleToLevel,
    isAdminProfile,
    canWriteProfile,
    buildMemberNameMap,
    resolveOwnerUserId,
    effectiveOwnerUserId,
    effectiveOwnerName,
    createPermissionContext,
  };
}
