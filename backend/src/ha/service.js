import { haRequest } from './client.js';
import {
  brightnessToHa,
  brightnessFromHa,
  tempToKelvin,
  kelvinToTemp,
  hsvToRgb,
  rgbToColourData,
  DEFAULT_MIN_KELVIN,
  DEFAULT_MAX_KELVIN,
} from './convert.js';

/**
 * Home Assistant light service.
 * Exposes the same interface as tuya/service.js so the routes and UI do not change.
 *
 * Env:
 *   HA_URL          e.g. http://192.168.1.10:8123
 *   HA_TOKEN        long-lived access token
 *   HA_ENTITY_IDS   comma-separated light entity ids, e.g. light.sala,light.quarto
 */
export function createHaService(env) {
  const baseUrl = (env.HA_URL || '').trim().replace(/\/$/, '');
  const token = (env.HA_TOKEN || '').trim();
  const entityIds = (env.HA_ENTITY_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!baseUrl || !token) throw new Error('HA_URL and HA_TOKEN are required');
  if (entityIds.length === 0) throw new Error('HA_ENTITY_IDS is required');

  const call = (method, path, body) => haRequest({ baseUrl, token }, method, path, body);

  /** HA state → Tuya-style status array the UI already understands. */
  function stateToStatus(state) {
    const attrs = state.attributes || {};
    const isOn = state.state === 'on';
    const status = [{ code: 'switch_led', value: isOn }];

    const brightness = typeof attrs.brightness === 'number' ? attrs.brightness : null;
    if (brightness !== null) {
      status.push({ code: 'bright_value_v2', value: brightnessFromHa(brightness) });
    }

    const minK = attrs.min_color_temp_kelvin ?? DEFAULT_MIN_KELVIN;
    const maxK = attrs.max_color_temp_kelvin ?? DEFAULT_MAX_KELVIN;
    if (typeof attrs.color_temp_kelvin === 'number') {
      status.push({
        code: 'temp_value_v2',
        value: kelvinToTemp(attrs.color_temp_kelvin, minK, maxK),
      });
    }

    const colourMode = ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(attrs.color_mode);
    if (colourMode && Array.isArray(attrs.rgb_color)) {
      const colour = rgbToColourData(attrs.rgb_color);
      status.push({
        code: 'colour_data_v2',
        value: { ...colour, v: brightness !== null ? brightnessFromHa(brightness) : colour.v },
      });
    }

    status.push({
      code: 'work_mode',
      value: colourMode ? 'colour' : 'white',
    });

    return status;
  }

  async function fetchState(entityId) {
    return call('GET', `/api/states/${encodeURIComponent(entityId)}`);
  }

  function toDevice(entityId, state) {
    const attrs = state?.attributes || {};
    const unavailable = !state || state.state === 'unavailable' || state.state === 'unknown';
    return {
      id: entityId,
      name: attrs.friendly_name || entityId,
      category: 'dj',
      functions: [],
      online: !unavailable,
      status: unavailable ? [] : stateToStatus(state),
    };
  }

  /**
   * Turn the Tuya-style command list from routes/commands.js into one HA service call.
   */
  function buildServiceCall(entityId, commands) {
    const last = (code) => commands.filter((c) => c.code === code).pop()?.value;

    const switchValue = last('switch_led');
    if (switchValue === false) {
      return { service: 'turn_off', data: { entity_id: entityId } };
    }

    const data = { entity_id: entityId };
    const workMode = last('work_mode');
    const brightness = last('bright_value_v2');
    const temp = last('temp_value_v2');
    const colour = last('colour_data_v2');

    const useColour = colour && typeof colour === 'object' && (workMode ? workMode === 'colour' : true);
    if (useColour) {
      const { h, s, v } = colour;
      // Colour is set at full value; intensity goes through brightness.
      data.rgb_color = hsvToRgb(h, s / 1000, 1);
      data.brightness = brightnessToHa(v);
    } else if (temp !== undefined) {
      data.color_temp_kelvin = tempToKelvin(temp, DEFAULT_MIN_KELVIN, DEFAULT_MAX_KELVIN);
    }

    if (brightness !== undefined && !useColour) {
      data.brightness = brightnessToHa(brightness);
    }

    if (Object.keys(data).length === 1 && switchValue === undefined) {
      return null;
    }
    return { service: 'turn_on', data };
  }

  return {
    getDeviceIds() {
      return [...entityIds];
    },

    async getDevices() {
      return Promise.all(
        entityIds.map(async (id) => {
          try {
            const state = await fetchState(id);
            return toDevice(id, state);
          } catch (e) {
            console.error(`[ha] failed to fetch ${id}:`, e.message);
            return { id, name: id, online: false, status: [], error: e.message, code: e.code };
          }
        })
      );
    },

    async getDevice(deviceId) {
      const id = deviceId || entityIds[0];
      if (!id) throw new Error('Entity ID required (HA_ENTITY_IDS or parameter)');
      return toDevice(id, await fetchState(id));
    },

    async getDeviceStatus(deviceId) {
      const id = deviceId || entityIds[0];
      if (!id) throw new Error('Entity ID required');
      return stateToStatus(await fetchState(id));
    },

    async sendCommands(deviceId, commands) {
      const id = deviceId || entityIds[0];
      if (!id) throw new Error('Entity ID required');
      const list = Array.isArray(commands) ? commands : [commands];

      const serviceCall = buildServiceCall(id, list);
      if (!serviceCall) {
        const err = new Error('No command supported by the Home Assistant provider');
        err.status = 400;
        throw err;
      }
      await call('POST', `/api/services/light/${serviceCall.service}`, serviceCall.data);
      return { ok: true };
    },
  };
}
