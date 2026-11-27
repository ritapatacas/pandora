/**
 * Minimal Home Assistant REST client.
 * Auth: long-lived access token as Bearer.
 */
export async function haRequest({ baseUrl, token }, method, path, body) {
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error(`Home Assistant unreachable: ${e.message}`);
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Home Assistant ${res.status}: ${text || res.statusText}`);
    err.status = res.status === 401 ? 401 : 502;
    err.code = res.status;
    throw err;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
