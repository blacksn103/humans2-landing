// Vercel Serverless Function — receives lead-magnet form submissions.
// Routes:
//   1) If RESEND_API_KEY is set, send a nicely formatted email to LEAD_TO (fallback hello@humans2.ai).
//   2) Otherwise, just log + accept (so the form still works end-to-end during setup).
//
// Env (set in Vercel → Settings → Environment Variables):
//   RESEND_API_KEY  — API key from resend.com (free tier is fine)
//   LEAD_TO         — destination inbox (default: hello@humans2.ai)
//   LEAD_FROM       — verified sender (default: "humans² <lead@humans2.ai>")
//
// No npm deps required — uses global fetch (Node 18+ on Vercel).

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const email = String(body.email || '').trim().slice(0, 320);
  const question = String(body.question || '').trim().slice(0, 4000);
  const source = String(body.source || 'lead-magnet').slice(0, 64);
  const ts = String(body.ts || new Date().toISOString()).slice(0, 64);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  // question is optional (Viktor teardown lead-magnet captures email only)

  const to   = process.env.LEAD_TO   || 'hello@humans2.ai';
  const from = process.env.LEAD_FROM || 'humans² <lead@humans2.ai>';
  const key  = process.env.RESEND_API_KEY;

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress || '';
  const ua = (req.headers['user-agent'] || '').toString().slice(0, 300);

  const hasQuestion = question && question.length >= 2;
  const subject = hasQuestion
    ? `[humans²] New lead-magnet question from ${email}`
    : `[humans²] New lead from ${source} — ${email}`;

  const divider = '----------------------------------------';
  const text =
`New lead from the humans2.ai lead-magnet page.

From:     ${email}
Source:   ${source}
Received: ${ts}
IP:       ${ip}
UA:       ${ua}
${hasQuestion ? `
${divider}
${question}
${divider}
` : ''}`;

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:620px;margin:0 auto;color:#111;line-height:1.55">
  <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-weight:400">New humans² lead ${hasQuestion ? '— with question' : ''}</h2>
  <p style="margin:0 0 18px;color:#555">${escapeHtml(source)} · ${escapeHtml(ts)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#777;width:90px">From</td>
        <td style="padding:6px 0"><a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:6px 0;color:#777">IP</td><td style="padding:6px 0">${escapeHtml(ip)}</td></tr>
    <tr><td style="padding:6px 0;color:#777;vertical-align:top">UA</td>
        <td style="padding:6px 0;color:#555">${escapeHtml(ua)}</td></tr>
  </table>
  ${hasQuestion ? `<div style="margin-top:22px;padding:18px 20px;background:#f6f6f6;border-radius:10px;white-space:pre-wrap;font-size:15px">
${escapeHtml(question)}
  </div>` : ''}
  <p style="margin-top:24px;color:#999;font-size:12px">Sent from humans2.ai · /lead-magnet</p>
</div>`;

  if (!key) {
    // Soft-success mode — still accept so RESEND_API_KEY can be wired later without breaking UX.
    console.log('[lead] (no RESEND_API_KEY) accepted lead:', { email, source, ts, hasQuestion });
    return res.status(200).json({ ok: true, delivered: false, note: 'logged_only' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        text,
        html,
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('[lead] resend failed', r.status, errText);
      return res.status(502).json({ error: 'email_send_failed', status: r.status });
    }
    const data = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: true, delivered: true, id: data.id || null });
  } catch (err) {
    console.error('[lead] fetch error', err);
    return res.status(500).json({ error: 'internal' });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
