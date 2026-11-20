import webpush from 'web-push';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Sadece POST desteklenir.' });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return res.status(500).json({
      ok: false,
      error: 'VAPID anahtarları eksik! Vercel Environment Variables kısmına VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY ekleyin.'
    });
  }

  webpush.setVapidDetails('mailto:beratsahinonline@gmail.com', publicKey, privateKey);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const subscriptions = Array.isArray(body.subscriptions) ? body.subscriptions : [];
    const title = String(body.title || 'Havva & Berat').slice(0, 100);
    const message = String(body.body || 'Yeni bir bildirim var!').slice(0, 240);
    const icon = typeof body.icon === 'string' && body.icon.startsWith('/') ? body.icon : '/icon.png';
    const url = typeof body.url === 'string' && body.url.startsWith('/') ? body.url : '/';

    if (!subscriptions.length) {
      return res.status(200).json({ ok: true, sent: 0, expiredEndpoints: [] });
    }

    const payload = JSON.stringify({ title, body: message, icon, url });
    const expiredEndpoints = [];
    let sent = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return;
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            payload
          );
          sent++;
        } catch (err) {
          if (err && (err.statusCode === 404 || err.statusCode === 410)) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    return res.status(200).json({ ok: true, sent, expiredEndpoints });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Bildirim gönderilemedi.' });
  }
}
