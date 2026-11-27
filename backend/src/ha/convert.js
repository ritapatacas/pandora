/**
 * Conversions between the Tuya-style DP values the UI already speaks
 * and Home Assistant light attributes.
 *
 * Tuya scales used by the app:
 *   bright_value_v2 : 10–1000
 *   temp_value_v2   : 0–1000 (0 = warm, 1000 = cold — Tuya standard, to verify on device)
 *   colour_data_v2  : { h: 0–360, s: 0–1000, v: 0–1000 }
 *
 * Home Assistant light attributes:
 *   brightness      : 0–255
 *   color_temp_kelvin : between min_color_temp_kelvin and max_color_temp_kelvin
 *   rgb_color       : [r, g, b] 0–255
 */

export const DEFAULT_MIN_KELVIN = 2700;
export const DEFAULT_MAX_KELVIN = 6500;

export function brightnessToHa(value) {
  return Math.round((Math.min(1000, Math.max(0, value)) / 1000) * 255);
}

export function brightnessFromHa(brightness) {
  return Math.round((brightness / 255) * 1000);
}

export function tempToKelvin(value, minK = DEFAULT_MIN_KELVIN, maxK = DEFAULT_MAX_KELVIN) {
  const t = Math.min(1000, Math.max(0, value)) / 1000;
  return Math.round(minK + t * (maxK - minK));
}

export function kelvinToTemp(kelvin, minK = DEFAULT_MIN_KELVIN, maxK = DEFAULT_MAX_KELVIN) {
  const range = maxK - minK || 1;
  const t = (Math.min(maxK, Math.max(minK, kelvin)) - minK) / range;
  return Math.round(t * 1000);
}

/** h 0–360, s 0–1, v 0–1  →  [r, g, b] 0–255 */
export function hsvToRgb(h, s, v) {
  const c = v * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [r, g, b].map((n) => Math.round((n + m) * 255));
}

/** [r, g, b] 0–255  →  { h: 0–360, s: 0–1000, v: 0–1000 } */
export function rgbToColourData([r, g, b]) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return {
    h: Math.round(h),
    s: Math.round(s * 1000),
    v: Math.round(max * 1000),
  };
}
