(function () {
  const DEFAULT_TIMEOUT = 20000;
  const DEFAULT_RETRIES = 2;
  const DEFAULT_RETRY_BASE_DELAY = 500;
  const API_URL = 'https://api.deepseek.com/chat/completions';

  function parseDeepSeekJson(content) {
    const text = String(content || '').trim();
    const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
    const raw = fenced ? fenced[1].trim() : text;
    try { return JSON.parse(raw); } catch {}
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    throw new Error('DeepSeek 返回格式异常，请重试');
  }

  async function callDeepSeek({
    task = 'default',
    apiKey = '',
    getApiKey = null,
    messages = [],
    model = 'deepseek-chat',
    temperature = 0.2,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryBaseDelay = DEFAULT_RETRY_BASE_DELAY,
    schema = 'text',
    responseFormat = null,
    extraBody = {},
    stream = false,
    onProgress = null,
  } = {}) {
    const keyToUse = String(apiKey || (typeof getApiKey === 'function' ? getApiKey() : '')).trim();
    if (!keyToUse) throw new Error('DeepSeek API Key 未配置');
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error(`DeepSeek 调用缺少 messages：${task}`);
    }

    const maxAttempts = Math.max(1, Number(retries) + 1 || 1);
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const body = {
          model,
          messages,
          temperature,
          ...extraBody,
        };
        if (responseFormat) body.response_format = responseFormat;
        if (stream) body.stream = true;

        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToUse}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!resp.ok) {
          if (resp.status === 401) {
            throw new Error('API Key 无效或已过期，请在知识库设置中更新 DeepSeek API Key');
          }
          const transient = resp.status === 408 || resp.status === 429 || resp.status >= 500;
          const err = new Error(`DeepSeek API 错误: ${resp.status}`);
          err.transient = transient;
          err.status = resp.status;
          throw err;
        }
        if (stream) {
          const content = await readDeepSeekStream(resp, onProgress);
          if (schema === 'json' || schema === 'array') return parseDeepSeekJson(content);
          return content;
        }
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message || 'DeepSeek API 错误');
        const content = json.choices?.[0]?.message?.content || '';
        if (schema === 'raw') return json;
        if (schema === 'json' || schema === 'array') return parseDeepSeekJson(content);
        return content;
      } catch (e) {
        if (e.name === 'AbortError') {
          lastError = new Error(`DeepSeek API 请求超时（${Math.round(timeout / 1000)}秒），请检查网络后重试`);
          lastError.transient = true;
        } else {
          lastError = e;
        }
        const retryable = lastError.transient || e.name === 'TypeError';
        if (!retryable || attempt >= maxAttempts) throw lastError;
        const delay = Math.max(0, Number(retryBaseDelay) || 0) * Math.pow(2, attempt - 1);
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError || new Error('DeepSeek API 调用失败');
  }

  async function readDeepSeekStream(resp, onProgress) {
    if (!resp.body || typeof resp.body.getReader !== 'function') {
      throw new Error('当前浏览器不支持 DeepSeek 流式响应');
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return content;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (!delta) continue;
          content += delta;
          if (typeof onProgress === 'function') onProgress(delta, content);
        } catch {
          // Ignore keepalive or partial server-sent event lines.
        }
      }
    }
    return content;
  }

  window.WorkBuddyAI = { callDeepSeek, parseDeepSeekJson };
  window.callDeepSeek = callDeepSeek;
})();
