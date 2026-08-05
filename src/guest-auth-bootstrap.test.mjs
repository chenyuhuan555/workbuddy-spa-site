import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./auth-bootstrap.js', import.meta.url), 'utf8');

function nextTurn() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createElement(id) {
  const listeners = {};
  return {
    id,
    style: {},
    textContent: '',
    value: '',
    listeners,
    addEventListener(type, listener) { listeners[type] = listener; },
    appendChild() {},
  };
}

function createHarness(restoreState) {
  const ids = [
    'wb-auth', 'wb-login-shell', 'wb-password-shell', 'wb-config-shell', 'app',
    'wb-account-bar', 'wb-account-name', 'wb-account-role', 'wb-login-error',
    'wb-login-form', 'wb-login-username', 'wb-login-password', 'wb-password-form',
    'wb-new-password', 'wb-confirm-password', 'wb-password-error', 'wb-logout',
  ];
  const elements = Object.fromEntries(ids.map(id => [id, createElement(id)]));
  let authCallbacks;
  let bootCount = 0;
  let reloadCount = 0;
  let guestAiInstallCount = 0;
  const sessionValues = new Map();

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    document: {
      getElementById: id => elements[id],
      querySelector: () => null,
    },
    location: { reload: () => { reloadCount += 1; } },
    sessionStorage: { getItem: key => sessionValues.get(key) || null, setItem: (key, value) => sessionValues.set(key, String(value)), removeItem: key => sessionValues.delete(key) },
    WorkBuddySupabaseConfig: { url: 'https://example.supabase.co', publishableKey: 'public-key' },
    supabase: { createClient: () => ({ auth: { updateUser: async () => ({}) }, rpc: async () => ({}) }) },
    WorkBuddyGuestDemo: { createGuestDemo: () => ({}) },
    WorkBuddyGuestDemoAi: { install: () => { guestAiInstallCount += 1; } },
    WorkBuddyBootApp: async () => { bootCount += 1; },
    WorkBuddyAuth: {
      createAuthController(callbacks) {
        authCallbacks = callbacks;
        return {
          restore: async () => callbacks.onStateChange(restoreState),
          login: async () => callbacks.onStateChange({
            status: 'authenticated',
            profile: { username: 'member', display_name: '正式成员', role: 'editor' },
            user: { id: 'user-1' },
          }),
          refreshProfile: async () => {},
          logout: async () => callbacks.onStateChange({ status: 'anonymous', profile: null, user: null }),
        };
      },
    },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'auth-bootstrap.js' });

  return {
    sandbox,
    elements,
    get bootCount() { return bootCount; },
    get reloadCount() { return reloadCount; },
    get guestAiInstallCount() { return guestAiInstallCount; },
    sessionValues,
    publish: state => authCallbacks.onStateChange(state),
  };
}

test('anonymous restore boots an editable guest runtime without cloud access', async () => {
  const harness = createHarness({ status: 'anonymous', profile: null, user: null });
  await nextTurn();

  assert.equal(harness.sandbox.WorkBuddyRuntimeMode, 'guest');
  assert.equal(harness.sandbox.WorkBuddyAccess.isGuest, true);
  assert.equal(harness.sandbox.WorkBuddyAccess.canWrite, true);
  assert.equal(harness.sandbox.WorkBuddyAccess.canAccessCloud, false);
  assert.equal(harness.elements['wb-auth'].style.display, 'none');
  assert.equal(harness.elements.app.style.display, 'block');
  assert.equal(harness.guestAiInstallCount, 1);
  assert.equal(harness.bootCount, 1);
});

test('guest UI can open the existing login overlay on demand', async () => {
  const harness = createHarness({ status: 'anonymous', profile: null, user: null });
  await nextTurn();

  harness.sandbox.WorkBuddyAuthUi.openLogin();
  assert.equal(harness.elements['wb-auth'].style.display, 'flex');
  assert.equal(harness.elements['wb-login-shell'].style.display, 'block');
  assert.equal(harness.elements.app.style.display, 'block');
});

test('authenticated restore boots the unchanged live runtime', async () => {
  const harness = createHarness({
    status: 'authenticated',
    profile: { username: 'member', display_name: '正式成员', role: 'editor' },
    user: { id: 'user-1' },
  });
  await nextTurn();

  assert.equal(harness.sandbox.WorkBuddyRuntimeMode, 'live');
  assert.equal(harness.sandbox.WorkBuddyAccess.isGuest, false);
  assert.equal(harness.sandbox.WorkBuddyAccess.canAccessCloud, true);
  assert.equal(harness.bootCount, 1);
  assert.equal(harness.guestAiInstallCount, 0);
  assert.equal(harness.reloadCount, 0);
});

test('successful login from a mounted guest reloads before live data can boot', async () => {
  const harness = createHarness({ status: 'anonymous', profile: null, user: null });
  await nextTurn();
  harness.sandbox.WorkBuddyAuthUi.openLogin();
  harness.elements['wb-login-username'].value = 'member';
  harness.elements['wb-login-password'].value = 'password';

  await harness.elements['wb-login-form'].listeners.submit({ preventDefault() {} });
  await nextTurn();

  assert.equal(harness.reloadCount, 1);
  assert.equal(harness.bootCount, 1, 'live app must not mount over the existing guest app');
});

test('guest-to-live login handoff never falls back to the guest screen during reload', async () => {
  const harness = createHarness({ status: 'anonymous', profile: null, user: null });
  await nextTurn();

  harness.publish({
    status: 'authenticated',
    profile: { username: 'admin', display_name: '管理员', role: 'admin' },
    user: { id: 'admin-1' },
  });
  await nextTurn();
  assert.equal(harness.sessionValues.get('workbuddy.login_handoff.v1'), '1');

  harness.publish({ status: 'anonymous', profile: null, user: null });
  await nextTurn();
  assert.equal(harness.sandbox.WorkBuddyRuntimeMode, 'login-pending');
  assert.equal(harness.elements['wb-auth'].style.display, 'flex');
  assert.equal(harness.elements.app.style.display, 'none');
  assert.equal(harness.guestAiInstallCount, 1, 'must not install guest mode a second time');
});

test('explicit logout opens the login screen instead of re-entering guest mode', async () => {
  const harness = createHarness({
    status: 'authenticated',
    profile: { username: 'member', display_name: '正式成员', role: 'editor' },
    user: { id: 'user-1' },
  });
  await nextTurn();

  await harness.elements['wb-logout'].listeners.click();
  await nextTurn();

  assert.equal(harness.sandbox.WorkBuddyRuntimeMode, 'logged-out');
  assert.equal(harness.elements['wb-auth'].style.display, 'flex');
  assert.equal(harness.elements['wb-login-shell'].style.display, 'block');
  assert.equal(harness.elements.app.style.display, 'none');
  assert.equal(harness.reloadCount, 1);
  assert.equal(harness.guestAiInstallCount, 0);
});
