'use client';

import { useState } from 'react';

function getStatusValue(status, code, altCode) {
  const item = status.find((s) => s.code === code || s.code === altCode);
  return item?.value;
}

function hsvToHex(h, s, v) {
  let r, g, b;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
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

export function DeviceCard({ device, status, onCommand, onRefresh }) {
  const [brightness, setBrightness] = useState(() => {
    const v = getStatusValue(status, 'bright_value_v2', 'bright_value');
    return v != null ? Math.round((Number(v) / 1000) * 100) : 50;
  });
  const [temp, setTemp] = useState(() => {
    const v = getStatusValue(status, 'temp_value_v2', 'temp_value');
    return v != null ? Number(v) : 500;
  });
  const [color, setColor] = useState(() => {
    const v = getStatusValue(status, 'colour_data_v2', 'colour_data');
    if (v && typeof v === 'object' && 'h' in v && 's' in v && 'v' in v) {
      return hsvToHex(v.h, v.s / 1000, v.v / 1000);
    }
    if (typeof v === 'string' && v.length >= 6) return '#' + v.slice(0, 6);
    return '#ffffff';
  });

  const on = getStatusValue(status, 'switch_led');
  const isOn = on === true || on === 'true';

  const handleSwitch = () => onCommand({ switch_led: !isOn });
  const handleColor = (e) => {
    const hex = e.target.value;
    setColor(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    onCommand({ colour_data: { r, g, b } });
  };

  return (
    <div className="max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-zinc-100">{device.name || device.id}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {device.online ? (
              <span className="text-emerald-500">Online</span>
            ) : (
              <span className="text-zinc-500">Offline</span>
            )}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        >
          Refresh
        </button>
      </div>

      <div className="mt-8 space-y-6">
        {/* On/Off */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Power</span>
          <button
            onClick={handleSwitch}
            className={`relative h-12 w-24 rounded-full transition-colors ${
              isOn ? 'bg-amber-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-1 h-10 w-10 rounded-full bg-white shadow transition-all ${
                isOn ? 'left-[52px]' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Brightness */}
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Brightness</span>
            <span className="text-zinc-500">{brightness}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            onMouseUp={(e) => onCommand({ bright_value: Number(e.target.value) })}
            onTouchEnd={(e) => onCommand({ bright_value: Number(e.target.value) })}
            className="mt-2 w-full"
            disabled={!isOn}
          />
        </div>

        {/* Color temperature */}
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Color temperature</span>
            <span className="text-zinc-500">{temp}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            onMouseUp={(e) => onCommand({ temp_value: Number(e.target.value) })}
            onTouchEnd={(e) => onCommand({ temp_value: Number(e.target.value) })}
            className="mt-2 w-full"
            disabled={!isOn}
          />
        </div>

        {/* RGB color */}
        <div>
          <span className="text-sm text-zinc-400">Color</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={handleColor}
              className="h-12 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              disabled={!isOn}
            />
            <span className="text-sm text-zinc-500">{color}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
