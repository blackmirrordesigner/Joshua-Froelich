/**
 * Cyrus Reigns Records - Website Server
 * Serves static files and handles contact form via Telegram Bot API.
 * Bot token and chat IDs are server-side only - never exposed to the client.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = process.env.TELEGRAM_CHAT_IDS
  ? process.env.TELEGRAM_CHAT_IDS.split(',').map((id) => id.trim()).filter(Boolean)
  : [];

// Rate limit: 5 requests per 10 minutes per IP
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

function escapeMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

async function sendTelegramMessage(data) {
  const text = [
    '📩 *New Website Inquiry - cyrusreigns.com*',
    '',
    '👤 *Name:* ' + escapeMarkdown(data.name),
    '🏢 *Company:* ' + (data.company ? escapeMarkdown(data.company) : '-'),
    '📞 *Phone:* ' + (data.phone ? escapeMarkdown(data.phone) : '-'),
    '📧 *Email:* ' + escapeMarkdown(data.email),
    '💬 *Message:*',
    data.message ? escapeMarkdown(data.message) : '-'
  ].join('\n');

  const requests = CHAT_IDS.map((chatId) =>
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    }).then((r) => r.json())
  );

  const results = await Promise.all(requests);
  return results.every((r) => r.ok === true);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS for same-origin (optional; form posts from same origin)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'POST' && pathname === '/api/contact') {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      sendJson(res, 429, { ok: false });
      return;
    }

    let data;
    try {
      data = await parseBody(req);
    } catch {
      sendJson(res, 400, { ok: false });
      return;
    }

    // Honeypot: "website" must be empty
    if (data.website && String(data.website).trim() !== '') {
      sendJson(res, 200, { ok: true });
      return;
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim() : '';
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    const company = typeof data.company === 'string' ? data.company.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';

    if (!name || !email || !message) {
      sendJson(res, 400, { ok: false });
      return;
    }

    if (!BOT_TOKEN || CHAT_IDS.length === 0) {
      sendJson(res, 500, { ok: false });
      return;
    }

    try {
      const success = await sendTelegramMessage({
        name,
        email,
        message,
        company: company || undefined,
        phone: phone || undefined
      });
      sendJson(res, 200, { ok: success });
    } catch {
      sendJson(res, 500, { ok: false });
    }
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!pathname.includes('.')) {
    const withHtml = path.join(filePath, 'index.html');
    if (fs.existsSync(withHtml)) {
      filePath = withHtml;
    } else if (!pathname.endsWith('/')) {
      filePath = filePath + '.html';
    }
  }

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end();
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
