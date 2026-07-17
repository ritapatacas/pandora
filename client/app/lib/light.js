/**
 * Map device + status from API to Light shape (Pandora UI).
 * Light: { id, name, room, isOn, brightness 0-100, colorTemp 0-100, color hex }
 */
function getStatusValue(status, code, altCode) {
  const item = (status || []).find((s) => s.code === code || s.code === altCode);
  return item?.value;
}

export function hsvToHex(h, s, v) {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + 6) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s * 100, v * 100];
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
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, v * 100];
}

export function deviceToLight(device, status) {
  const on = getStatusValue(status, 'switch_led');
  const isOn = on === true || on === 'true';
  const brightRaw = getStatusValue(status, 'bright_value_v2', 'bright_value');
  const tempRaw = getStatusValue(status, 'temp_value_v2', 'temp_value');
  const tempDevice = tempRaw != null ? Number(tempRaw) : 500;
  const colorTemp = Math.round(100 - (tempDevice / 1000) * 100);

  let color = '#ffffff';
  let colourData = getStatusValue(status, 'colour_data_v2', 'colour_data');
  let hasColourObject = false;
  if (typeof colourData === 'string') {
    try {
      colourData = JSON.parse(colourData);
    } catch {
      // not JSON — leave as string, handled below as raw hex
    }
  }
  if (colourData && typeof colourData === 'object' && 'h' in colourData && 's' in colourData && 'v' in colourData) {
    color = hsvToHex(colourData.h, colourData.s / 1000, colourData.v / 1000);
    hasColourObject = true;
  } else if (typeof colourData === 'string' && colourData.length >= 6) {
    color = '#' + colourData.slice(0, 6);
  }

  // Infer work mode from returned data when the device omits work_mode.
  let workMode = getStatusValue(status, 'work_mode');
  if (!workMode) {
    if (hasColourObject) workMode = 'colour';
    else if (brightRaw != null || tempRaw != null) workMode = 'white';
  }

  // In colour mode the real intensity lives in colour_data_v2.v, because
  // bright_value_v2 is only updated in white mode.
  let brightness = 0;
  if (isOn) {
    if (workMode === 'colour' && hasColourObject && typeof colourData.v === 'number') {
      brightness = Math.round((colourData.v / 1000) * 100);
    } else if (brightRaw != null) {
      brightness = Math.round((Number(brightRaw) / 1000) * 100);
    }
  }

  return {
    id: device?.id ?? '',
    name: device?.name || device?.id || 'Light',
    room: device?.name || '',
    isOn,
    brightness,
    colorTemp,
    color,
    workMode,
  };
}

/**
 * Merge sent command into status for optimistic UI (slider matches what we sent).
 */
export function mergeStatusWithSent(status, body) {
  const list = Array.isArray(status) ? [...status] : [];
  const set = (code, value) => {
    const i = list.findIndex((s) => s.code === code);
    if (i >= 0) list[i] = { ...list[i], value };
    else list.push({ code, value });
  };
  if (typeof body.bright_value === 'number')
    set('bright_value_v2', Math.round((body.bright_value / 100) * 1000));
  if (typeof body.temp_value === 'number') set('temp_value_v2', body.temp_value);
  if (typeof body.switch_led === 'boolean') set('switch_led', body.switch_led);

  // Reflect mode/colour changes immediately so the UI doesn't wait for the next poll.
  if (body.colour_data) {
    set('work_mode', 'colour');
    if (typeof body.colour_data === 'object' && 'r' in body.colour_data) {
      const [h, s, v] = rgbToHsv(body.colour_data.r, body.colour_data.g, body.colour_data.b);
      const brightness = typeof body.bright_value === 'number' ? body.bright_value : Math.round(v);
      set('colour_data_v2', {
        h: Math.round(h),
        s: Math.round(s * 10),
        v: Math.round(brightness * 10),
      });
    } else if (typeof body.colour_data === 'object' && 'h' in body.colour_data) {
      const value = typeof body.bright_value === 'number' ? body.bright_value * 10 : body.colour_data.v;
      set('colour_data_v2', {
        h: body.colour_data.h,
        s: body.colour_data.s,
        v: Math.round(value),
      });
    } else {
      set('colour_data_v2', body.colour_data);
    }
  }
  if (typeof body.bright_value === 'number' && !body.colour_data) {
    set('work_mode', 'white');
  }
  if (typeof body.temp_value === 'number') {
    set('work_mode', 'white');
  }
  return list;
}

/**
 * Convert Light UI updates to API command body.
 */
export function lightUpdatesToCommand(updates) {
  const body = {};
  if (typeof updates.isOn !== 'undefined') body.switch_led = updates.isOn;
  if (typeof updates.brightness === 'number') {
    const brightness = Math.max(0, Math.min(100, Math.round(updates.brightness)));
    body.bright_value = brightness; // backend expects 0–100 and converts to 10–1000
    body.switch_led = brightness > 0; // ligar quando brightness > 0, desligar quando 0
  }
  if (typeof updates.colorTemp === 'number') body.temp_value = Math.round((100 - updates.colorTemp) / 100 * 1000);
  if (typeof updates.color === 'string' && updates.color.startsWith('#')) {
    const r = parseInt(updates.color.slice(1, 3), 16);
    const g = parseInt(updates.color.slice(3, 5), 16);
    const b = parseInt(updates.color.slice(5, 7), 16);
    body.colour_data = { r, g, b };
  }
  return body;
}
