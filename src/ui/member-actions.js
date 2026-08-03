export function createMemberActions({
  state,
  canManageMembers = false,
  invoke = async () => ({}),
  showToast = () => {},
  confirmAction = () => true,
  promptAction = () => null,
}) {
  async function invokeMemberAction(body) {
    if (!canManageMembers) throw new Error('仅管理员可管理成员');
    return invoke(body);
  }

  async function loadMembers() {
    if (!canManageMembers) return;
    state.loading = true;
    state.error = '';
    try {
      const data = await invokeMemberAction({ action: 'list' });
      state.members = Array.isArray(data.members) ? data.members : [];
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
    }
  }

  async function createMember() {
    state.loading = true;
    state.error = '';
    try {
      await invokeMemberAction({ action: 'create', ...state.form });
      state.form = { username: '', displayName: '', role: 'member', password: '' };
      await loadMembers();
      showToast('普通成员创建成功', 'success');
    } catch (error) {
      state.error = error.message;
      state.loading = false;
    }
  }

  async function setMemberStatus(member, enabled) {
    if (!confirmAction(`确认${enabled ? '启用' : '停用'}成员“${member.display_name}”？`)) return;
    state.loading = true;
    state.error = '';
    try {
      await invokeMemberAction({ action: enabled ? 'enable' : 'disable', userId: member.id });
      await loadMembers();
      showToast(enabled ? '成员已启用' : '成员已停用', 'success');
    } catch (error) {
      state.error = error.message;
      state.loading = false;
    }
  }

  async function deleteMember(member) {
    if (!confirmAction(`确认永久删除已停用成员“${member.display_name}”？该账号将无法恢复。`)) return;
    state.loading = true;
    state.error = '';
    try {
      await invokeMemberAction({ action: 'delete', userId: member.id });
      await loadMembers();
      showToast('成员账号已删除', 'success');
    } catch (error) {
      state.error = error.message;
      state.loading = false;
    }
  }

  async function resetMemberPassword(member) {
    const password = promptAction(`为“${member.display_name}”设置至少 8 位临时密码：`);
    if (password === null) return;
    if (password.length < 8) { state.error = '临时密码至少需要 8 位'; return; }
    state.loading = true;
    state.error = '';
    try {
      await invokeMemberAction({ action: 'reset-password', userId: member.id, password });
      await loadMembers();
      showToast('临时密码已重置', 'success');
    } catch (error) {
      state.error = error.message;
      state.loading = false;
    }
  }

  return { invokeMemberAction, loadMembers, createMember, setMemberStatus, deleteMember, resetMemberPassword };
}

if (typeof window !== 'undefined') window.WorkBuddyMemberActions = { createMemberActions };
