import { createTokenManager } from './token.js';
import { getDevice, getDeviceStatus } from './devices.js';
import { sendCommands } from './commands.js';

/**
 * Tuya service: token + signed API.
 * Device IDs: TUYA_DEVICE_IDS (comma-separated) or single TUYA_DEVICE_ID.
 */
export function createTuyaService(env) {
  const baseUrl = (env.TUYA_BASE_URL || 'https://openapi.tuyaeu.com').trim();
  const clientId = (env.TUYA_ACCESS_ID || '').trim();
  const secret = (env.TUYA_ACCESS_SECRET || '').trim();
  const deviceIdsFromEnv = env.TUYA_DEVICE_IDS
    ? env.TUYA_DEVICE_IDS.split(',').map((s) => s.trim()).filter(Boolean)
    : (env.TUYA_DEVICE_ID ? [env.TUYA_DEVICE_ID.trim()] : []);
  const defaultDeviceId = deviceIdsFromEnv[0] || null;

  if (!clientId || !secret) {
    throw new Error('TUYA_ACCESS_ID and TUYA_ACCESS_SECRET are required');
  }

  const tokenManager = createTokenManager({ baseUrl, clientId, secret });

  async function api(deviceId) {
    const accessToken = await tokenManager.ensureToken();
    return {
      baseUrl,
      clientId,
      secret,
      accessToken,
      deviceId: deviceId || defaultDeviceId,
    };
  }

  return {
    getDeviceIds() {
      return [...deviceIdsFromEnv];
    },

    async getDevices() {
      const ids = this.getDeviceIds();
      if (ids.length === 0) return [];
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const device = await this.getDevice(id);
            const status = await this.getDeviceStatus(id);
            return { ...device, status: Array.isArray(status) ? status : [status] };
          } catch (e) {
            console.error(`[tuya] failed to fetch device ${id}:`, e.message, e.code ? `(code ${e.code})` : '');
            return { id, name: id, online: false, status: [], error: e.message, code: e.code, debug: e.debug };
          }
        })
      );
      return results;
    },

    async getDevice(deviceId) {
      const id = deviceId || defaultDeviceId;
      if (!id) throw new Error('Device ID required (TUYA_DEVICE_IDS / TUYA_DEVICE_ID or parameter)');
      const a = await api(id);
      return getDevice(a, id);
    },

    async getDeviceStatus(deviceId) {
      const id = deviceId || defaultDeviceId;
      if (!id) throw new Error('Device ID required');
      const a = await api(id);
      return getDeviceStatus(a, id);
    },

    async sendCommands(deviceId, commands) {
      const id = deviceId || defaultDeviceId;
      if (!id) throw new Error('Device ID required');
      const a = await api(id);
      return sendCommands(a, id, commands);
    },
  };
}
