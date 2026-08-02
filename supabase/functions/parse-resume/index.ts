import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'auth_required' }, 401);
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) return json({ error: 'ai_not_configured' }, 503);
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== 'object' || !Array.isArray(input.messages) || input.messages.length === 0) {
    return json({ error: 'invalid_payload' }, 400);
  }
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: input.model || 'deepseek-chat',
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      response_format: input.response_format,
    }),
  });
  const data = await response.json().catch(() => ({ error: 'invalid_provider_response' }));
  return json(data, response.status);
});
