import { signedRequest } from './client.js';

/**
 * Normalize device from Tuya API to internal Device model.
 */
function normalizeDevice(raw) {
  return {
    id: raw.id,
    name: raw.name || raw.id,
    functions: raw.functions ?? [],
    status: raw.status ?? [],
    online: raw.online ?? false,
  };
}

/**
 * GET /v1.0/iot-03/devices/{device_id}
 */
export async function getDevice(api, deviceId) {
  const path = `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}`;
  const data = await signedRequest({
    ...api,
    method: 'GET',
    path,
  });
  const raw = data?.result;
  if (!raw) throw new Error('Device not found');
  const device = normalizeDevice(raw);
  // Device basic info often has empty functions/status; fetch from dedicated endpoint
  try {
    const spec = await getDeviceFunctions(api, deviceId);
    if (spec.functions?.length) device.functions = spec.functions;
    if (spec.category) device.category = spec.category;
  } catch (_) {
    // ignore if functions endpoint fails (e.g. not supported)
  }
  return device;
}

/**
 * GET /v1.0/iot-03/devices/{device_id}/functions — instruction set (DP codes)
 */
export async function getDeviceFunctions(api, deviceId) {
  const path = `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/functions`;
  const data = await signedRequest({
    ...api,
    method: 'GET',
    path,
  });
  const result = data?.result ?? {};
  return {
    category: result.category,
    functions: Array.isArray(result.functions) ? result.functions : [],
  };
}

/**
 * GET /v1.0/iot-03/devices/{device_id}/status
 */
export async function getDeviceStatus(api, deviceId) {
  const path = `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/status`;
  const data = await signedRequest({
    ...api,
    method: 'GET',
    path,
  });
  const list = data?.result ?? [];
  return Array.isArray(list) ? list : [list];
}
