import { signedRequest } from './client.js';

/**
 * Send commands to device.
 * POST /v1.0/iot-03/devices/{device_id}/commands
 * Body: { commands: [ { code: string, value: any } ] }
 */
export async function sendCommands(api, deviceId, commands) {
  const path = `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/commands`;
  const body = {
    commands: Array.isArray(commands) ? commands : [commands],
  };
  await signedRequest({
    ...api,
    method: 'POST',
    path,
    body,
  });
  return { ok: true };
}

/**
 * E27 RGBW DP codes. This device uses _v2 variants (bright_value_v2, etc.).
 * work_mode: "white" = brightness + temp, "colour" = RGB.
 */
export const DP = {
  SWITCH_LED: 'switch_led',
  WORK_MODE: 'work_mode',
  BRIGHT_VALUE: 'bright_value_v2',
  TEMP_VALUE: 'temp_value_v2',
  COLOUR_DATA: 'colour_data_v2',
};

/**
 * Helpers for common commands. Value shapes follow Tuya standard instruction set.
 */

export function cmdSwitch(on) {
  return { code: DP.SWITCH_LED, value: !!on };
}

export function cmdBrightness(percent) {
  const value = Math.min(1000, Math.max(10, Math.round((percent / 100) * 1000)));
  return { code: DP.BRIGHT_VALUE, value };
}

export function cmdTemp(value) {
  // temp_value typically 0–1000 (cold to warm)
  return { code: DP.TEMP_VALUE, value: Math.min(1000, Math.max(0, Math.round(value))) };
}

/**
 * colour_data_v2: value is Json { h, s, v } (h 0-360, s 0-1000, v 0-1000).
 */
export function cmdColourHSV(h, s, v) {
  const hVal = Math.min(360, Math.max(0, Math.round(h)));
  const sVal = Math.min(1000, Math.max(0, Math.round(s)));
  const vVal = Math.min(1000, Math.max(0, Math.round(v)));
  return { code: DP.COLOUR_DATA, value: { h: hVal, s: sVal, v: vVal } };
}

/**
 * RGB 0-255 to colour_data_v2. Converts to HSV then { h, s, v }.
 * Optional brightnessPercent (0-100) overrides the HSV value so the slider
 * controls intensity independently of the chosen colour's intrinsic brightness.
 */
export function cmdColourRGB(r, g, b, brightnessPercent) {
  const [h, s, v] = rgbToHsv(r, g, b);
  const value = typeof brightnessPercent === 'number' ? brightnessPercent * 10 : v * 10;
  return cmdColourHSV(h, s * 10, Math.round(value)); // s,v 0-100 -> 0-1000
}

export function cmdWorkMode(mode) {
  return { code: DP.WORK_MODE, value: mode };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, v * 100];
}
