export function createAiConfigActions({
  state,
  storage = globalThis.localStorage,
  configKey,
  schedulePush = () => {},
  migrateLegacy = () => {},
  onMissingKey = () => {},
}) {
  function load() {
    const stored = storage.getItem(configKey);
    if (stored) {
      try {
        const config = JSON.parse(stored);
        state.apiKey = config.apiKey || '';
        state.apiKeyValid = config.apiKeyValid || false;
        state.lastValidated = config.lastValidated || null;
        state.showSettings = config.showSettings || false;
        state.saved = !!state.apiKey;
        return;
      } catch (error) {
        console.error('AI 配置加载失败，使用迁移逻辑:', error);
      }
    }
    migrateLegacy();
  }

  function save() {
    state.apiKey = state.apiKey.trim();
    state.saved = true;
    storage.setItem(configKey, JSON.stringify({
      apiKey: state.apiKey,
      apiKeyValid: state.apiKeyValid,
      lastValidated: state.lastValidated,
      showSettings: state.showSettings,
    }));
    schedulePush();
    if (state.apiKey) state.showSettings = false;
  }

  function requireKey() {
    load();
    const key = state.apiKey.trim();
    if (!key || !key.startsWith('sk-')) {
      state.showSettings = true;
      onMissingKey();
      throw new Error('请先配置 DeepSeek API Key');
    }
    return key;
  }

  return { load, save, requireKey };
}

if (typeof window !== 'undefined') window.WorkBuddyAiConfigActions = { createAiConfigActions };
