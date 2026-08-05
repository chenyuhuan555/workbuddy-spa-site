(function () {
  var authRoot = document.getElementById('wb-auth');
  var loginShell = document.getElementById('wb-login-shell');
  var passwordShell = document.getElementById('wb-password-shell');
  var configShell = document.getElementById('wb-config-shell');
  var appRoot = document.getElementById('app');
  var accountBar = document.getElementById('wb-account-bar');
  var loginCancel = document.getElementById('wb-login-cancel');
  var booted = false;
  var LOGOUT_INTENT_KEY = 'workbuddy.logout_intent.v1';
  var LOGIN_HANDOFF_KEY = 'workbuddy.login_handoff.v1';
  var config = window.WorkBuddySupabaseConfig;
  if (!config || !config.url || !config.publishableKey || !window.supabase || !window.WorkBuddyAuth) {
    loginShell.style.display = 'none';
    configShell.style.display = 'block';
    return;
  }

  var client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  window.WorkBuddySupabase = client;

  function clearBusinessState() {
    appRoot.style.display = 'none';
    accountBar.style.display = 'none';
    window.WorkBuddyAccess = null;
  }

  function openLogin() {
    authRoot.style.display = 'flex';
    loginShell.style.display = 'block';
    passwordShell.style.display = 'none';
    configShell.style.display = 'none';
    if (loginCancel) loginCancel.style.display = 'block';
  }

  function closeLogin() {
    if (window.WorkBuddyRuntimeMode !== 'guest') return;
    authRoot.style.display = 'none';
    loginShell.style.display = 'none';
  }

  window.WorkBuddyAuthUi = Object.freeze({ openLogin: openLogin, closeLogin: closeLogin });

  async function enterGuestMode() {
    window.WorkBuddyRuntimeMode = 'guest';
    window.WorkBuddyGuestDemoAi.install(window);
    window.WorkBuddyAccess = Object.freeze({
      profile: { display_name: '游客', username: 'guest', role: 'guest' },
      isGuest: true,
      canWrite: true,
      canAccessCloud: false,
      canConfigureAi: true,
      canManageMembers: false
    });
    authRoot.style.display = 'none';
    loginShell.style.display = 'none';
    passwordShell.style.display = 'none';
    accountBar.style.display = 'none';
    appRoot.style.display = 'block';
    if (!booted) {
      booted = true;
      await window.WorkBuddyBootApp();
    }
  }

  function dockAccountBar() {
    var sidebar = document.querySelector('.wb-v2-sidebar');
    if (!sidebar) return;
    sidebar.appendChild(accountBar);
    accountBar.style.position = 'static';
    accountBar.style.right = 'auto';
    accountBar.style.top = 'auto';
    accountBar.style.margin = '0 12px 12px';
    accountBar.style.boxShadow = 'none';
    accountBar.style.display = 'flex';
    accountBar.style.alignItems = 'center';
    accountBar.style.justifyContent = 'space-between';
  }

  async function onStateChange(state) {
    if (state.status === 'anonymous') {
      if (window.sessionStorage.getItem(LOGOUT_INTENT_KEY) === '1') {
        window.WorkBuddyRuntimeMode = 'logged-out';
        clearBusinessState();
        openLogin();
        return;
      }
      if (window.sessionStorage.getItem(LOGIN_HANDOFF_KEY) === '1') {
        window.WorkBuddyRuntimeMode = 'login-pending';
        clearBusinessState();
        openLogin();
        return;
      }
      await enterGuestMode();
      return;
    }
    loginShell.style.display = state.status === 'authenticating' ? 'block' : 'none';
    passwordShell.style.display = state.status === 'must-change-password' ? 'block' : 'none';
    if (state.status === 'authenticating' || state.status === 'must-change-password') {
      authRoot.style.display = 'flex';
    }
    if (state.status !== 'authenticated') return;
    window.sessionStorage.removeItem(LOGOUT_INTENT_KEY);
    if (booted && window.WorkBuddyRuntimeMode === 'guest') {
      window.sessionStorage.setItem(LOGIN_HANDOFF_KEY, '1');
      window.location.reload();
      return;
    }
    window.sessionStorage.removeItem(LOGIN_HANDOFF_KEY);
    window.WorkBuddyRuntimeMode = 'live';
    window.WorkBuddyAccess = Object.freeze({
      profile: state.profile,
      isGuest: false,
      canWrite: state.profile.role === 'admin' || state.profile.role === 'editor',
      canAccessCloud: true,
      canConfigureAi: state.profile.role === 'admin' || state.profile.role === 'editor',
      canManageMembers: state.profile.role === 'admin'
    });
    document.getElementById('wb-account-name').textContent = state.profile.display_name || state.profile.username;
    document.getElementById('wb-account-role').textContent = state.profile.role === 'admin'
      ? '管理员'
      : state.profile.role === 'editor' ? '高级成员' : '普通成员 · 只读';
    authRoot.style.display = 'none';
    appRoot.style.display = 'block';
    if (!booted) {
      booted = true;
      await window.WorkBuddyBootApp();
    }
    dockAccountBar();
  }

  var controller = window.WorkBuddyAuth.createAuthController({
    supabase: client,
    sessionStorage: window.sessionStorage,
    clearBusinessState: clearBusinessState,
    onStateChange: function (state) { onStateChange(state).catch(showAuthFailure); }
  });
  window.WorkBuddyAuthController = controller;

  function showAuthFailure() {
    if (window.WorkBuddyRuntimeMode !== 'guest') clearBusinessState();
    openLogin();
    document.getElementById('wb-login-error').textContent = '用户名或密码错误';
    document.getElementById('wb-login-error').style.display = 'block';
  }

  document.getElementById('wb-login-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var error = document.getElementById('wb-login-error');
    error.style.display = 'none';
    try {
      await controller.login(document.getElementById('wb-login-username').value, document.getElementById('wb-login-password').value);
      document.getElementById('wb-login-password').value = '';
    } catch (_) { showAuthFailure(); }
  });

  if (loginCancel) loginCancel.addEventListener('click', function () {
    enterGuestMode().catch(showAuthFailure);
  });

  document.getElementById('wb-password-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var password = document.getElementById('wb-new-password').value;
    var confirm = document.getElementById('wb-confirm-password').value;
    var error = document.getElementById('wb-password-error');
    if (password.length < 8 || password !== confirm) {
      error.textContent = password.length < 8 ? '新密码至少需要 8 位' : '两次输入的密码不一致';
      error.style.display = 'block';
      return;
    }
    var update = await client.auth.updateUser({ password: password });
    if (update.error) { error.textContent = '密码修改失败，请重试'; error.style.display = 'block'; return; }
    var completed = await client.rpc('complete_password_change');
    if (completed.error) { error.textContent = '账号状态更新失败，请联系管理员'; error.style.display = 'block'; return; }
    await controller.refreshProfile();
  });

  document.getElementById('wb-logout').addEventListener('click', async function () {
    window.sessionStorage.setItem(LOGOUT_INTENT_KEY, '1');
    await controller.logout();
    window.location.reload();
  });

  controller.restore().catch(function () {
    if (window.sessionStorage.getItem(LOGIN_HANDOFF_KEY) === '1' || window.sessionStorage.getItem(LOGOUT_INTENT_KEY) === '1') {
      window.WorkBuddyRuntimeMode = 'login-pending';
      clearBusinessState();
      openLogin();
      return;
    }
    enterGuestMode().catch(showAuthFailure);
  });
})();
