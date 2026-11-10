import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createClient } from '@sanity/client';
import { validatePreviewUrl } from '@sanity/preview-url-secret';

const {
  SANITY_PROJECT_ID = 'mdug7yhz',
  SANITY_DATASET = 'production',
  SANITY_API_VERSION = '2024-01-01',
  SANITY_API_TOKEN,
  PREVIEW_COOKIE_SECRET,
  SITE_ORIGIN = 'https://bsd.international',
  PREVIEW_STUDIO_URL = 'https://bsdinternational-cms.sanity.studio',
  PORT = 4000,
} = process.env;

if (!SANITY_API_TOKEN) {
  console.error('Missing SANITY_API_TOKEN env var. See .env.example.');
  process.exit(1);
}
if (!PREVIEW_COOKIE_SECRET) {
  console.error('Missing PREVIEW_COOKIE_SECRET env var. See .env.example.');
  process.exit(1);
}

const client = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: SANITY_API_TOKEN,
  useCdn: false,
});

// Separate client for draft queries: stega-encodes string fields so
// @sanity/visual-editing can map rendered text back to the source field
// and power the click-to-edit overlay.
const stegaClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: SANITY_API_TOKEN,
  useCdn: false,
  stega: {
    enabled: true,
    studioUrl: PREVIEW_STUDIO_URL,
  },
});

const COOKIE_NAME = 'bsd_preview';
const MARKER_COOKIE_NAME = 'bsd_preview_active';
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

function signSession() {
  const expires = Date.now() + MAX_AGE_MS;
  const payload = `${expires}`;
  const signature = crypto.createHmac('sha256', PREVIEW_COOKIE_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = crypto.createHmac('sha256', PREVIEW_COOKIE_SECRET).update(payload).digest('hex');
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && Date.now() < expires;
}

const app = express();
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json());

app.get('/api/preview/enable', async (req, res) => {
  try {
    const { isValid, redirectTo = '/' } = await validatePreviewUrl(client, req.originalUrl);

    if (!isValid) {
      res.status(401).send('Invalid preview secret.');
      return;
    }

    const session = signSession();
    const cookieOpts = {
      httpOnly: true,
      secure: true,
      // The preview iframe is cross-site relative to Studio's own origin
      // (sanity.io / *.sanity.studio / localhost:3333), so the cookie must
      // be SameSite=None to be stored and sent at all in that context.
      sameSite: 'none',
      // Chrome silently drops SameSite=None cookies set from a third-party
      // (cross-site iframe) context unless they opt into partitioned
      // storage (CHIPS). Without this, the cookie appears in the Set-Cookie
      // response header but is never actually persisted.
      partitioned: true,
      path: '/',
      maxAge: MAX_AGE_MS,
    };

    res.cookie(COOKIE_NAME, session, cookieOpts);
    res.cookie(MARKER_COOKIE_NAME, '1', { ...cookieOpts, httpOnly: false });

    const target = redirectTo.startsWith('http') ? redirectTo : `${SITE_ORIGIN}${redirectTo}`;
    res.redirect(target);
  } catch (err) {
    console.error('Error enabling preview:', err);
    res.status(500).send('Could not enable preview.');
  }
});

app.get('/api/preview/disable', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.clearCookie(MARKER_COOKIE_NAME, { path: '/' });
  const target = typeof req.query.redirect === 'string' ? req.query.redirect : SITE_ORIGIN;
  res.redirect(target);
});

app.post('/api/preview/query', async (req, res) => {
  if (!verifySession(req.cookies[COOKIE_NAME])) {
    res.status(401).json({ message: 'Preview session invalid or expired.' });
    return;
  }

  const { query, params } = req.body || {};
  if (typeof query !== 'string') {
    res.status(400).json({ message: 'Missing query.' });
    return;
  }

  try {
    const result = await stegaClient.fetch(query, params || {}, { perspective: 'previewDrafts' });
    res.json({ result });
  } catch (err) {
    console.error('Preview query failed:', err);
    res.status(500).json({ message: 'Query failed.' });
  }
});

// Server-Sent Events relay of Sanity's Live Content API, so the browser
// can learn a draft changed and re-fetch, without ever holding the
// Sanity API token itself. Sends a bare "change" signal only — the
// client re-runs its own preview query on receipt.
app.get('/api/preview/live', (req, res) => {
  if (!verifySession(req.cookies[COOKIE_NAME])) {
    res.status(401).end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.write('\n');

  const subscription = client.live.events({ includeDrafts: true }).subscribe({
    next(event) {
      if (event.type === 'message' || event.type === 'restart' || event.type === 'reconnect') {
        res.write('data: change\n\n');
      }
    },
    error(err) {
      console.error('Live events error:', err);
      res.end();
    },
  });

  req.on('close', () => {
    subscription.unsubscribe();
  });
});

app.get('/api/preview/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`BSD preview server listening on port ${PORT}`);
});
