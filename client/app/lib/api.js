const getBase = () =>
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    : '';

/** Fetch all devices (with status). Returns array of { ...device, status }. */
export async function fetchDevices() {
  const base = getBase();
  const res = await fetch(`${base}/api/proxy/devices`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

export async function fetchDevice(deviceId) {
  const base = getBase();
  const path = deviceId ? `/api/proxy/devices/${deviceId}` : '/api/proxy/devices';
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDeviceStatus(deviceId) {
  const base = getBase();
  const res = await fetch(`${base}/api/proxy/devices/${deviceId}/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.status ?? [];
}

export async function sendCommand(deviceId, body) {
  const base = getBase();
  const path = deviceId ? `/api/proxy/commands/${deviceId}` : '/api/proxy/commands';
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
