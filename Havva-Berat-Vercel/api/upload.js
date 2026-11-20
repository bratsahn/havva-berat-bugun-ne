import { put, del } from '@vercel/blob';

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req, maxBytes = 4.4 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error('Fotoğraf boyutu çok büyük (maks 4 MB).');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: 'Vercel Blob bağlı değil! Vercel Panel → Storage → Blob oluşturup projeye bağlayın.'
    });
  }

  const action = req.query?.action || 'upload';

  // Fotoğraf silme (Vercel Blob)
  if (action === 'delete') {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return res.status(405).json({ ok: false, error: 'Sadece POST/DELETE desteklenir.' });
    }
    try {
      const raw = await readRawBody(req, 512 * 1024);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const urls = Array.isArray(body.urls)
        ? body.urls.filter(u => typeof u === 'string' && u.includes('blob.vercel-storage.com'))
        : [];
      if (urls.length > 0) {
        await del(urls);
      }
      return res.status(200).json({ ok: true, deleted: urls.length });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || 'Silme hatası.' });
    }
  }

  // Fotoğraf yükleme (Vercel Blob)
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Sadece POST desteklenir.' });
  }

  try {
    const contentType = String(req.headers['content-type'] || 'image/jpeg').split(';')[0].trim().toLowerCase();
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      return res.status(415).json({ ok: false, error: 'Sadece JPG, PNG, WebP veya GIF yüklenebilir.' });
    }

    const buffer = await readRawBody(req);
    if (!buffer.length) {
      return res.status(400).json({ ok: false, error: 'Boş dosya.' });
    }

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 10);
    const pathname = `memories/${ym}/hb_${Date.now()}_${rand}.${ext}`;

    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType
    });

    return res.status(200).json({
      ok: true,
      url: blob.url
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Vercel Blob yükleme hatası.'
    });
  }
}
