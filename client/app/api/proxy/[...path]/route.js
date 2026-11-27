import { NextResponse } from 'next/server';

/**
 * Server-side proxy to the Pandora backend.
 * The browser calls /api/proxy/*, this handler forwards to BACKEND_URL and adds
 * the API key from PANDORA_API_KEY. The key never reaches the browser.
 */
export const dynamic = 'force-dynamic';

async function forward(req, { params }) {
  const backend = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
  const { search } = new URL(req.url);
  const target = `${backend}/api/${params.path.join('/')}${search}`;

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.PANDORA_API_KEY) headers['X-API-Key'] = process.env.PANDORA_API_KEY;

  const init = { method: req.method, headers, cache: 'no-store' };
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await req.text();

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    return NextResponse.json({ error: `Backend unreachable: ${e.message}` }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
