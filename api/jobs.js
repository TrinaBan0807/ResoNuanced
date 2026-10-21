// ResoNuanced Phase 1: authenticated asynchronous job submission.
// Requires SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!url || !anon || !service) return res.status(503).json({ error: 'Job service not configured' });
  const bearer = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!bearer) return res.status(401).json({ error: 'Sign in or start an anonymous session first' });
  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${bearer[1]}` }
    });
    if (!userResponse.ok) return res.status(401).json({ error: 'Invalid or expired session' });
    const user = await userResponse.json();
    if (!user.id) return res.status(401).json({ error: 'Invalid user' });
    const input = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (input.length < 3 || input.length > 5000) {
      return res.status(400).json({ error: 'Enter 3–5000 characters' });
    }
    const headers = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };
    const count = await fetch(`${url}/rest/v1/analysis_jobs?user_id=eq.${encodeURIComponent(user.id)}&status=in.(queued,processing)&select=id&limit=5`, { headers });
    if (!count.ok) throw new Error('Unable to check existing jobs');
    if ((await count.json()).length >= 5) return res.status(429).json({ error: 'Too many active jobs' });
    const created = await fetch(`${url}/rest/v1/analysis_jobs`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: user.id, input_text: input })
    });
    if (!created.ok) throw new Error(`Insert failed: ${created.status}`);
    const [job] = await created.json();
    return res.status(202).json({ id: job.id, status: job.status });
  } catch (error) {
    console.error('Job submission error', error);
    return res.status(500).json({ error: 'Unable to queue analysis' });
  }
}
