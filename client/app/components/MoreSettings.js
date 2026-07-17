'use client';

import { hsvToHex, hexToHsv } from '../lib/light';
import BrutalistSlider from './BrutalistSlider';

const WARM_HUE = 30;
const COOL_HUE = 210;

function tempToColor(colorTemp) {
  const t = Math.max(0, Math.min(100, colorTemp)) / 100;
  const hue = WARM_HUE + (COOL_HUE - WARM_HUE) * t;
  const sat = 100 + (60 - 100) * t;
  const light = 60 + (70 - 60) * t;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

const SWATCHES = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#FF3B30' },
  { name: 'Orange', hex: '#FF9500' },
  { name: 'Yellow', hex: '#FFCC00' },
  { name: 'Green', hex: '#34C759' },
  { name: 'Blue', hex: '#007AFF' },
  { name: 'Purple', hex: '#AF52DE' },
];

export default function MoreSettings({
  open,
  onToggleOpen,
  lights,
  selectedIds,
  onSelectedIdsChange,
  hue,
  saturation,
  value,
  temperature,
  onHueChange,
  onSaturationChange,
  onValueChange,
  onTemperatureChange,
  onApply,
  className = '',
}) {
  const mode = saturation === 0 ? 'white' : 'colour';
  const colorHex = hsvToHex(hue, saturation / 100, value / 100);

  const toggleId = (id) => {
    if (id === 'all') {
      onSelectedIdsChange(['all']);
      return;
    }
    let next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id && x !== 'all')
      : [...selectedIds.filter((x) => x !== 'all'), id];
    if (next.length === lights.length) next = ['all'];
    if (next.length === 0) next = ['all'];
    onSelectedIdsChange(next);
  };

  const selectSwatch = (hex) => {
    if (hex === '#FFFFFF') {
      onSaturationChange(0);
      onApply({ brightness: value, colorTemp: temperature });
      return;
    }
    const [h, s, v] = hexToHsv(hex);
    onHueChange(h);
    onSaturationChange(100);
    onValueChange(Math.max(1, Math.round(v * 100)));
    onApply({ color: hsvToHex(h, 1, value / 100), brightness: value });
  };

  const handleBrightnessChange = (v) => {
    onValueChange(v);
    if (mode === 'white') {
      onApply({ brightness: v, colorTemp: temperature });
    } else {
      onApply({ color: hsvToHex(hue, saturation / 100, v / 100), brightness: v });
    }
  };

  const handleTemperatureChange = (t) => {
    onTemperatureChange(t);
    onApply({ brightness: value, colorTemp: t });
  };

  const handleContrastChange = (c) => {
    onSaturationChange(c);
    onApply({ color: hsvToHex(hue, c / 100, value / 100), brightness: value });
  };

  return (
    <section className={`space-y-4 ${className}`}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center gap-2 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{open ? '−' : '+'}</span>
        <span>More settings</span>
      </button>

      {open && (
        <div className="space-y-6 p-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-mono uppercase cursor-pointer">
              <input
                type="checkbox"
                className="accent-foreground"
                checked={selectedIds.includes('all')}
                onChange={() => toggleId('all')}
              />
              All
            </label>
            {lights.map((light) => (
              <label key={light.id} className="flex items-center gap-2 text-xs font-mono uppercase cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-foreground"
                  checked={selectedIds.includes('all') || selectedIds.includes(light.id)}
                  onChange={() => toggleId(light.id)}
                />
                {light.name}
              </label>
            ))}
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Color</p>
            <div className="flex flex-wrap gap-3">
              {SWATCHES.map((swatch) => {
                const isActive =
                  swatch.hex === '#FFFFFF'
                    ? mode === 'white'
                    : mode === 'colour' && Math.round(hue) === Math.round(hexToHsv(swatch.hex)[0]);
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={swatch.name}
                    onClick={() => selectSwatch(swatch.hex)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      isActive ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                  />
                );
              })}
            </div>
          </div>

          <BrutalistSlider
            label="Brightness"
            value={value}
            onChange={handleBrightnessChange}
            trackColor={mode === 'white' ? tempToColor(temperature) : colorHex}
          />

          {mode === 'white' ? (
            <BrutalistSlider
              label="Temperature"
              value={temperature}
              onChange={handleTemperatureChange}
              trackColor={tempToColor(temperature)}
            />
          ) : (
            <BrutalistSlider
              label="Contrast"
              value={saturation}
              onChange={handleContrastChange}
              trackColor={colorHex}
            />
          )}
        </div>
      )}
    </section>
  );
}
