import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapRoleToLevel, isAdminProfile, canWriteProfile, buildMemberNameMap,
  resolveOwnerUserId, effectiveOwnerUserId, effectiveOwnerName, createPermissionContext,
} from './workbench-permissions.js';

const ADMIN = { id: 'u-admin', display_name: '管理员甲', username: 'admin', role: 'admin' };
const CONSULTANT_A = { id: 'u-a', display_name: '陈雨欢', username: 'chenyuhuan', role: 'editor' };
const CONSULTANT_B = { id: 'u-b', display_name: '张嘉一', username: 'zhangjiayi', role: 'member' };
const MEMBERS = [ADMIN, CONSULTANT_A, CONSULTANT_B];

function ctxFor(profile) {
  return createPermissionContext({ profile, members: MEMBERS });
}

function candidate(owner, ownerUserId = '') {
  return { id: 'c1', name: '张三', owner: owner || '', ownerUserId: ownerUserId || '' };
}
function application(owner, ownerUserId = '', candidateObj) {
  return { id: 'app1', candidateId: candidateObj ? candidateObj.id : 'c1', owner: owner || '', ownerUserId: ownerUserId || '' };
}

test('角色映射：admin→admin；editor/member→consultant', () => {
  assert.equal(mapRoleToLevel(ADMIN), 'admin');
  assert.equal(mapRoleToLevel(CONSULTANT_A), 'consultant');
  assert.equal(mapRoleToLevel(CONSULTANT_B), 'consultant');
  assert.equal(mapRoleToLevel({ role: 'owner' }), 'consultant');
  assert.equal(isAdminProfile(ADMIN), true);
  assert.equal(isAdminProfile(CONSULTANT_A), false);
});

test('写权限保持现状：admin/editor 可写，member 只读', () => {
  assert.equal(canWriteProfile(ADMIN), true);
  assert.equal(canWriteProfile(CONSULTANT_A), true);
  assert.equal(canWriteProfile(CONSULTANT_B), false);
});

test('1+3：管理员能看到所有 Candidate，且能打开任意 Candidate Detail', () => {
  const adminCtx = ctxFor(ADMIN);
  assert.equal(adminCtx.canViewCandidate(candidate('陈雨欢')), true);
  assert.equal(adminCtx.canViewCandidate(candidate('张嘉一')), true);
  assert.equal(adminCtx.canViewCandidate(candidate('')), true);
  assert.equal(adminCtx.canViewCandidate(candidate('', 'u-x')), true);
});

test('2+4：顾问只能看到自己的 Candidate；管理员能打开别人的', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  assert.equal(aCtx.canViewCandidate(candidate('陈雨欢')), true);
  assert.equal(aCtx.canViewCandidate(candidate('张嘉一')), false);
  assert.equal(aCtx.canViewCandidate(candidate('', 'u-a')), true);
  assert.equal(aCtx.canViewCandidate(candidate('', 'u-b')), false);
  assert.equal(aCtx.canViewCandidate(candidate('')), false, '无 owner 的孤儿数据顾问不可见');
  const adminCtx = ctxFor(ADMIN);
  assert.equal(adminCtx.canViewCandidate(candidate('张嘉一')), true);
  assert.equal(adminCtx.canViewCandidate(candidate('')), true);
});

test('5：顾问只能看到自己的 Application', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const candA = candidate('陈雨欢');
  assert.equal(aCtx.canViewApplication(application('陈雨欢', '', candA), candA), true);
  assert.equal(aCtx.canViewApplication(application('张嘉一', '', candA), candA), false);
});

test('6：Application.owner 为空时 fallback candidate.owner', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const candA = candidate('陈雨欢');
  const appEmpty = application('', '', candA);
  assert.equal(effectiveOwnerName(appEmpty, candA), '陈雨欢');
  assert.equal(aCtx.canViewApplication(appEmpty, candA), true, 'application 无 owner 时按 candidate.owner 判定');
  const candB = candidate('张嘉一');
  assert.equal(aCtx.canViewApplication(application('', '', candB), candB), false);
});

test('7+8：顾问不能推进别人 Application；管理员能推进任意', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const candB = candidate('张嘉一');
  const appB = application('张嘉一', '', candB);
  assert.equal(aCtx.canEditApplication(appB, candB), false);
  assert.equal(aCtx.canViewApplication(appB, candB), false);
  const adminCtx = ctxFor(ADMIN);
  assert.equal(adminCtx.canEditApplication(appB, candB), true);
  assert.equal(adminCtx.canEditApplication(application('', '', candB), candB), true);
});

test('9+10：只有管理员能修改 owner', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const adminCtx = ctxFor(ADMIN);
  assert.equal(aCtx.canManageOwners, false);
  assert.equal(adminCtx.canManageOwners, true);
});

test('13+14：顾问只能看到自己的 Todo；管理员可读团队 Todo', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const adminCtx = ctxFor(ADMIN);
  assert.equal(aCtx.canViewTodo({ owner: '陈雨欢', ownerUserId: 'u-a' }), true);
  assert.equal(aCtx.canViewTodo({ owner: '张嘉一', ownerUserId: 'u-b' }), false);
  assert.equal(adminCtx.canViewTodo({ owner: '张嘉一', ownerUserId: 'u-b' }), true, '管理员可读全部 Todo');
});

test('15：顾问不能更新别人 Todo；管理员默认只读他人 Todo', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const adminCtx = ctxFor(ADMIN);
  assert.equal(aCtx.canEditTodo({ owner: '张嘉一', ownerUserId: 'u-b' }), false);
  assert.equal(aCtx.canEditTodo({ owner: '陈雨欢', ownerUserId: 'u-a' }), true);
  assert.equal(adminCtx.canEditTodo({ owner: '张嘉一', ownerUserId: 'u-b' }), false, '管理员不替他人完成任务');
  assert.equal(adminCtx.canEditTodo({ owner: '管理员甲', ownerUserId: 'u-admin' }), true);
});

test('16+17：Company / Position 全员可见', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  assert.equal(aCtx.canViewCompany(), true);
  assert.equal(aCtx.canViewPosition(), true);
  assert.equal(ctxFor(CONSULTANT_B).canViewPosition(), true);
});

test('18：顾问不能编辑别人负责的 Position；管理员可以', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const adminCtx = ctxFor(ADMIN);
  assert.equal(aCtx.canEditPosition({ owner: '张嘉一', ownerUserId: 'u-b' }), false);
  assert.equal(aCtx.canEditPosition({ owner: '陈雨欢', ownerUserId: 'u-a' }), true);
  assert.equal(adminCtx.canEditPosition({ owner: '张嘉一', ownerUserId: 'u-b' }), true);
});

test('18b：无 owner 岗位顾问只读，管理员可编辑（安全收口）', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const adminCtx = ctxFor(ADMIN);
  assert.equal(aCtx.canEditPosition({ owner: '', ownerUserId: '' }), false, '无 owner 岗位顾问只读');
  assert.equal(aCtx.canEditPosition({}), false);
  assert.equal(adminCtx.canEditPosition({ owner: '', ownerUserId: '' }), true, '管理员可编辑无 owner 岗位');
});

test('19：简历权限跟随 Candidate（通过 Candidate 判定派生）', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const candB = candidate('张嘉一');
  assert.equal(aCtx.canViewCandidate(candB), false, '看不到候选人即看不到其简历');
  const candA = candidate('陈雨欢');
  assert.equal(aCtx.canViewCandidate(candA), true);
});

test('20：旧数据只有 owner name → 兼容不白屏，且能正确判定', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  // 旧数据无 ownerUserId，owner 是姓名
  const candA = { id: 'c9', name: '李四', owner: '陈雨欢' };
  assert.equal(aCtx.canViewCandidate(candA), true, '姓名能映射到当前用户');
  const candB = { id: 'c8', name: '王五', owner: '张嘉一' };
  assert.equal(aCtx.canViewCandidate(candB), false);
  assert.equal(resolveOwnerUserId(candB, MEMBERS), 'u-b');
  assert.equal(resolveOwnerUserId(candA, MEMBERS), 'u-a');
  assert.equal(resolveOwnerUserId({ owner: '不存在的人' }, MEMBERS), '', '无匹配返回空');
});

test('21：ownerUserId 有值时优先按稳定 id 判断（不依赖姓名）', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  // 姓名不同但 ownerUserId 匹配 → 可见
  assert.equal(aCtx.canViewCandidate({ owner: '旧名字', ownerUserId: 'u-a' }), true);
  // 姓名相同但 ownerUserId 不匹配 → 不可见（重名场景按 id 判）
  assert.equal(aCtx.canViewCandidate({ owner: '陈雨欢', ownerUserId: 'u-b' }), false);
  assert.equal(effectiveOwnerUserId({ owner: '', ownerUserId: '' }, { owner: '陈雨欢', ownerUserId: 'u-a' }), 'u-a');
});

test('22：游客模式（guest 角色）不受影响，可查看演示数据', () => {
  const guestCtx = createPermissionContext({
    profile: { id: '', display_name: '游客', username: 'guest', role: 'guest' },
    members: [],
  });
  assert.equal(guestCtx.isAdmin, false);
  assert.equal(guestCtx.canViewCompany(), true);
  assert.equal(guestCtx.canViewPosition(), true);
  assert.equal(guestCtx.canViewCandidate({ owner: '演示顾问' }), false, '游客无成员映射，按严格规则不可见他人数据');
  assert.equal(guestCtx.canWrite, false);
});

test('顾问可见负责人列表：管理员全部、顾问固定自己', () => {
  const adminCtx = ctxFor(ADMIN);
  assert.deepEqual(adminCtx.visibleOwnerNames(), ['管理员甲', '陈雨欢', '张嘉一']);
  const aCtx = ctxFor(CONSULTANT_A);
  assert.deepEqual(aCtx.visibleOwnerNames(), ['陈雨欢']);
});

test('顾问导入 Candidate：owner 默认自己（辅助函数层面）', () => {
  const aCtx = ctxFor(CONSULTANT_A);
  const defaultOwner = {
    owner: aCtx.currentUserName,
    ownerUserId: aCtx.currentUserId,
  };
  assert.equal(defaultOwner.owner, '陈雨欢');
  assert.equal(defaultOwner.ownerUserId, 'u-a');
  const adminCtx = ctxFor(ADMIN);
  assert.equal(adminCtx.currentUserName, '管理员甲');
});
