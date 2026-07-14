(function (global) {
  'use strict';

  const SESSION_KEY = 'workbuddy.authenticated';
  const INTERNAL_DOMAIN = 'accounts.workbuddy.invalid';

  function normalizeUsername(value) {
    const username = String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
    if (!username) throw new Error('用户名不能为空');
    if ([...username].length > 64) throw new Error('用户名不能超过 64 个字符');
    return username;
  }

  async function authEmailForUsername(value) {
    const normalized = normalizeUsername(value);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return `u_${hex}@${INTERNAL_DOMAIN}`;
  }

  function authError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function createAuthController({ supabase, sessionStorage, onStateChange, clearBusinessState }) {
    let state = Object.freeze({ status: 'anonymous', profile: null, user: null });

    function publish(status, profile = null, user = null) {
      state = Object.freeze({ status, profile, user });
      onStateChange(state);
      return state;
    }

    async function readProfile(user) {
      const { data, error } = await supabase.from('profiles')
        .select('id, username, display_name, role, status, must_change_password')
        .eq('id', user.id)
        .single();
      if (error || !data) throw authError('PROFILE_UNAVAILABLE');
      if (data.status !== 'active') throw authError('ACCOUNT_DISABLED');
      return data;
    }

    async function acceptSession(user) {
      try {
        const profile = await readProfile(user);
        sessionStorage.setItem(SESSION_KEY, '1');
        return publish(profile.must_change_password ? 'must-change-password' : 'authenticated', profile, user);
      } catch (error) {
        await supabase.auth.signOut();
        sessionStorage.removeItem(SESSION_KEY);
        clearBusinessState();
        publish('anonymous');
        throw error;
      }
    }

    async function login(username, password) {
      publish('authenticating');
      const email = await authEmailForUsername(username);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.user) {
        sessionStorage.removeItem(SESSION_KEY);
        publish('anonymous');
        throw authError('INVALID_CREDENTIALS');
      }
      return acceptSession(data.user);
    }

    async function restore() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.user) return publish('anonymous');
      return acceptSession(data.session.user);
    }

    async function refreshProfile() {
      if (!state.user) throw authError('AUTH_REQUIRED');
      return acceptSession(state.user);
    }

    async function logout() {
      await supabase.auth.signOut();
      sessionStorage.removeItem(SESSION_KEY);
      clearBusinessState();
      return publish('anonymous');
    }

    return Object.freeze({ login, restore, refreshProfile, logout, getState: () => state });
  }

  global.WorkBuddyAuth = Object.freeze({
    SESSION_KEY,
    normalizeUsername,
    authEmailForUsername,
    createAuthController
  });
})(window);
